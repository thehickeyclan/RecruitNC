/**
 * One commitment run: read Flo's lists, compare, apply what the key allows, hold the rest.
 *
 * The whole job lives here rather than in the cron route so it can be run dry from a script and
 * on a schedule from Vercel with the same code. A dry run reads everything, works out every
 * change and every match, and writes nothing.
 *
 * Order matters. The snapshot is written last, after the changes have been applied, so a run
 * that dies halfway does not record that it has already seen rows it never acted on - the next
 * run would read those as no change and the commitment would be lost rather than retried.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { discoverFloCommitmentLists, isLiveCommitmentClass, type FloListSource } from "@/lib/college-commitments/flo-lists"
import { fetchFloArticleHtml, FloSourceUnavailable } from "@/lib/college-commitments/flo-fetch"
import { parseFloCommitmentList, type FloCommitmentList, type FloCommitmentRow } from "@/lib/college-commitments/flo-parse"
import { countChanges, diffCommitments, toSnapshotRow, wrestlerKey, type CommitmentChange, type SnapshotRow } from "@/lib/college-commitments/diff"
import { matchCommitmentRow, type MatchableAthlete } from "@/lib/college-commitments/match"
import { isWrestlingCommitment, resolveCommitmentCollege } from "@/lib/college-commitments/college"

export type CommitmentRunResult = {
  dryRun: boolean
  startedAt: string
  finishedAt: string
  lists: Array<{ articleId: string; title: string; sourceUrl: string; classYear: number; gender: string; rows: number; retrievedAt: string; error?: string }>
  rowsRead: number
  /** Rows whose college column says something that is not a wrestling commitment. */
  notCommitments: number
  counts: { added: number; flipped: number; removed: number; corrected: number }
  applied: Array<{ athleteId: string; athleteName: string; college: string; change: string; previousCollege?: string }>
  held: Array<{ wrestlerName: string; college: string; reason: string; detail: string; classYear: number; state: string | null }>
  /** True when nothing was saved before: every row reads as new, which is a baseline, not news. */
  baseline: boolean
  unresolvedColleges: string[]
  recentCommitNotes: string[]
  errors: string[]
}

async function page<T>(run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await run(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

/** Read every list we can, and say which ones failed rather than pretending the run was whole. */
async function readLists(sources: FloListSource[], now: Date, fetchImpl: typeof fetch) {
  const lists: FloCommitmentList[] = []
  const failures: Array<{ articleId: string; sourceUrl: string; error: string }> = []
  for (const source of sources) {
    try {
      const html = await fetchFloArticleHtml(source.articleId, fetchImpl)
      const parsed = parseFloCommitmentList(html, { articleId: source.articleId, sourceUrl: source.sourceUrl, gender: source.gender, now })
      if (!source.expectTitle.test(parsed.title)) throw new Error(`the article is now titled ${JSON.stringify(parsed.title)}, which is not a commitment list`)
      /* An old class's list is still up and still edited; reading it would re-announce history. */
      if (!isLiveCommitmentClass(parsed.classYear, now)) continue
      lists.push(parsed)
    } catch (cause) {
      failures.push({ articleId: source.articleId, sourceUrl: source.sourceUrl, error: cause instanceof FloSourceUnavailable ? cause.message : String((cause as Error)?.message ?? cause) })
    }
  }
  return { lists, failures }
}

export async function runCommitmentSync(
  sb: SupabaseClient,
  options: { dryRun?: boolean; now?: Date; fetchImpl?: typeof fetch } = {},
): Promise<CommitmentRunResult> {
  const dryRun = options.dryRun ?? false
  const now = options.now ?? new Date()
  const startedAt = new Date().toISOString()
  const errors: string[] = []

  const sources = await discoverFloCommitmentLists(options.fetchImpl ?? fetch)
  const { lists, failures } = await readLists(sources, now, options.fetchImpl ?? fetch)
  for (const f of failures) errors.push(`${f.sourceUrl}: ${f.error}`)
  if (!lists.length) throw new Error(`no Flo commitment list could be read. ${errors.join(" | ")}`)

  /*
   * Flo's women's list answers "what next" in the college column, and one of the answers is "Not
   * Competing" - a row that is a published fact and not a commitment. Another is a college with
   * a sport on it ("Cal Poly - Track & Field"), which is a commitment to somewhere but not to
   * wrestling. Neither belongs on a wrestling profile, and both are dropped before the diff so
   * they never read as a commitment made or taken back.
   */
  const rows = lists.flatMap((l) => l.rows).filter((r) => isWrestlingCommitment(r.college))
  const notCommitments = lists.flatMap((l) => l.rows).length - rows.length
  const liveListIds = new Set(lists.map((l) => l.articleId))

  /*
   * The previous snapshot, restricted to the lists this run actually read. A list that failed to
   * fetch keeps its saved rows and is not diffed, so a Flo outage cannot read as 300 wrestlers
   * de-committing at once.
   */
  let previousAll: Array<Record<string, unknown>> = []
  try {
    previousAll = await page<Record<string, unknown>>((from, to) =>
      sb.from("flo_commitment_rows").select("list_article_id, wrestler_key, wrestler_name, college, division_label, big_board_rank, high_school, state, weight, class_year, gender").order("id").range(from, to),
    )
  } catch (cause) {
    /*
     * The tables are created by hand from scripts/create-flo-commitment-tables.sql. A dry run can
     * still say what it would do without them - that is most of its value before they exist - but
     * a writing run cannot, because an empty snapshot and a missing one look identical and the
     * second would record 600 wrestlers as having just committed.
     */
    const missing = /does not exist/i.test(String((cause as Error)?.message ?? cause))
    if (!missing || !dryRun) throw cause
    errors.push("flo_commitment_rows does not exist yet — run scripts/create-flo-commitment-tables.sql. Treating this as the first run.")
  }
  const previous: SnapshotRow[] = previousAll
    .filter((p) => liveListIds.has(String(p.list_article_id)))
    .map((p) => ({
      listArticleId: String(p.list_article_id),
      wrestlerKey: String(p.wrestler_key),
      wrestlerName: String(p.wrestler_name),
      college: String(p.college),
      divisionLabel: (p.division_label as string) ?? null,
      bigBoardRank: p.big_board_rank == null ? null : Number(p.big_board_rank),
      highSchool: (p.high_school as string) ?? null,
      state: (p.state as string) ?? null,
      weight: (p.weight as string) ?? null,
      classYear: Number(p.class_year),
      gender: p.gender === "Female" ? "Female" : "Male",
    }))

  /*
   * The first run sees every row as new. That is a baseline, not 600 commitments made this
   * morning: the colleges are applied, but `college_set_at` - which means "when we learned" and
   * is what the push alert reads - is left alone, so nobody's phone announces a backlog.
   */
  const baseline = previous.length === 0
  const changes = diffCommitments(rows, previous)
  const counts = countChanges(changes)

  const athletes = await page<MatchableAthlete>((from, to) =>
    sb.from("athletes").select("id, name, wrestling_name, highschool, state, graduationyear, gender, college").order("id").range(from, to),
  )

  const applied: CommitmentRunResult["applied"] = []
  const held: CommitmentRunResult["held"] = []
  const unresolvedColleges = new Set<string>()

  /*
   * Only a change is acted on. A row that read the same as last time is already on the profile,
   * and re-writing it would restamp college_set_at and make the push alert announce it again
   * (app/api/cron/commit-alerts).
   */
  for (const change of changes) {
    if (change.type === "removed") {
      /*
       * A removed row is Flo taking something back. It is never applied automatically: clearing a
       * college silently would drop a wrestler back onto every coach's uncommitted board with no
       * one told why. It is held, with what it used to say.
       */
      held.push({ wrestlerName: change.previous.wrestlerName, college: change.previous.college, reason: "removed-from-list", detail: `Flo no longer lists him as committed to ${change.previous.college}`, classYear: change.previous.classYear, state: change.previous.state })
      continue
    }
    if (change.type === "corrected") continue
    const row: FloCommitmentRow = change.row
    const match = matchCommitmentRow(row, athletes)
    if (match.kind === "held") {
      held.push({ wrestlerName: row.wrestlerName, college: row.college, reason: match.reason, detail: match.detail, classYear: row.classYear, state: row.state })
      continue
    }
    const college = resolveCommitmentCollege(row.college)
    if (!college.resolved) unresolvedColleges.add(row.college)
    /*
     * Our own commitment outranks Flo's.
     *
     * Two sources feed this field and they are not equal. Flo's men's lists are Division I only;
     * ours are every division, and ours were entered by somebody who knew - the family, the high
     * school coach, Matt. So Flo fills a gap and never overwrites an answer: where we already
     * hold a different college, the row is held with both readings for a person to settle. A
     * wrestler who really has flipped from Mount Olive to a D1 program is exactly that case, and
     * it is worth thirty seconds of someone's attention rather than a silent edit.
     */
    if (match.ourCollege && resolveCommitmentCollege(match.ourCollege).name !== college.name) {
      held.push({ wrestlerName: row.wrestlerName, college: college.name, reason: "ours-differs", detail: `we hold ${match.ourCollege}; Flo lists ${college.name}`, classYear: row.classYear, state: row.state })
      continue
    }
    if (match.ourCollege) continue
    applied.push({
      athleteId: match.athleteId,
      athleteName: match.athleteName,
      college: college.name,
      change: change.type,
      previousCollege: change.type === "flipped" ? change.previousCollege : undefined,
    })
  }

  if (!dryRun) {
    for (const a of applied) {
      const { error } = await sb
        .from("athletes")
        /*
         * `commitmentdate` is deliberately not set. It means the day the wrestler committed, and
         * Flo's list does not publish one; stamping today would date a commitment made in July to
         * this morning. The push alert tests both dates, so a Flo row stays quiet until a person
         * enters the real date - which is the right way round for an alert that names a wrestler.
         */
        .update({ college: a.college, ...(a.change === "added" && !baseline ? { college_set_at: new Date().toISOString() } : {}) })
        .eq("id", a.athleteId)
      if (error) errors.push(`athletes ${a.athleteId}: ${error.message}`)
    }
    const historyRows = applied.map((a) => {
      const row = rows.find((r) => r.wrestlerName === a.athleteName || wrestlerKey("", r.wrestlerName) === wrestlerKey("", a.athleteName))
      return {
        athlete_id: a.athleteId,
        wrestler_name: a.athleteName,
        college: a.college,
        previous_college: a.previousCollege ?? null,
        status: "reported",
        change: a.change,
        class_year: row?.classYear ?? null,
        gender: row?.gender ?? null,
        reported_date: new Date().toISOString().slice(0, 10),
        source: "FloWrestling commitment list",
        source_url: row?.sourceUrl ?? lists[0]!.sourceUrl,
        detail: a.previousCollege ? `flipped from ${a.previousCollege}` : null,
      }
    })
    if (historyRows.length) {
      const { error } = await sb.from("athlete_commitment_history").insert(historyRows)
      if (error) errors.push(`athlete_commitment_history: ${error.message}`)
    }
    for (const h of held) {
      const { error } = await sb.from("flo_commitment_holds").upsert(
        {
          wrestler_key: `${h.classYear}|${h.wrestlerName.toLowerCase()}`,
          wrestler_name: h.wrestlerName,
          college: h.college,
          class_year: h.classYear,
          gender: rows.find((r) => r.wrestlerName === h.wrestlerName)?.gender ?? "Male",
          high_school: rows.find((r) => r.wrestlerName === h.wrestlerName)?.highSchool ?? null,
          state: h.state,
          reason: h.reason,
          detail: h.detail,
          source_url: rows.find((r) => r.wrestlerName === h.wrestlerName)?.sourceUrl ?? lists[0]!.sourceUrl,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "wrestler_key" },
      )
      if (error) errors.push(`flo_commitment_holds: ${error.message}`)
    }
    /* The snapshot last, so a run that dies retries rather than forgetting. */
    const snapshot = rows.map((r) => {
      const s = toSnapshotRow(r)
      return {
        list_article_id: s.listArticleId,
        wrestler_key: s.wrestlerKey,
        wrestler_name: s.wrestlerName,
        college: s.college,
        division_label: s.divisionLabel,
        big_board_rank: s.bigBoardRank,
        high_school: s.highSchool,
        state: s.state,
        weight: s.weight,
        class_year: s.classYear,
        gender: s.gender,
        source_url: r.sourceUrl,
        last_seen_at: new Date().toISOString(),
      }
    })
    for (let i = 0; i < snapshot.length; i += 400) {
      const { error } = await sb.from("flo_commitment_rows").upsert(snapshot.slice(i, i + 400), { onConflict: "wrestler_key" })
      if (error) errors.push(`flo_commitment_rows: ${error.message}`)
    }
    const goneKeys = changes.filter((c): c is Extract<CommitmentChange, { type: "removed" }> => c.type === "removed").map((c) => c.previous.wrestlerKey)
    if (goneKeys.length) {
      const { error } = await sb.from("flo_commitment_rows").delete().in("wrestler_key", goneKeys)
      if (error) errors.push(`flo_commitment_rows delete: ${error.message}`)
    }
  }

  const finishedAt = new Date().toISOString()
  const result: CommitmentRunResult = {
    dryRun,
    startedAt,
    finishedAt,
    lists: [
      ...lists.map((l) => ({ articleId: l.articleId, title: l.title, sourceUrl: l.sourceUrl, classYear: l.classYear, gender: l.gender, rows: l.rows.length, retrievedAt: l.retrievedAt })),
      ...failures.map((f) => ({ articleId: f.articleId, title: "(not read)", sourceUrl: f.sourceUrl, classYear: 0, gender: "", rows: 0, retrievedAt: startedAt, error: f.error })),
    ],
    rowsRead: rows.length,
    notCommitments,
    counts,
    baseline,
    applied,
    held,
    unresolvedColleges: [...unresolvedColleges],
    recentCommitNotes: lists.flatMap((l) => l.recentCommitNotes),
    errors,
  }

  if (!dryRun) {
    await sb.from("flo_commitment_runs").insert({
      started_at: startedAt,
      finished_at: finishedAt,
      dry_run: false,
      lists: result.lists,
      rows_read: result.rowsRead,
      added: counts.added,
      flipped: counts.flipped,
      removed: counts.removed,
      corrected: counts.corrected,
      applied: applied.length,
      held: held.length,
      error: errors.length ? errors.join(" | ") : null,
    })
  }
  return result
}
