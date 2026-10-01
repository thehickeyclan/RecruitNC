import { NextResponse } from "next/server"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildTocFieldBoard } from "@/lib/toc/field-board"
import { latestSeasonMatchRows } from "@/lib/toc/ai-seeding"
import { accoladeLine, findSignificantWins, withAccoladesOnly, type Bout, type RankedOpponent } from "@/lib/significant-wins"
import { getQualifierSignificantWinBouts } from "@/lib/other-tournaments"
import { HEAD_TO_HEAD_WINDOW_DAYS } from "@/lib/head-to-head"
import { getCuratedSignificantWins } from "@/lib/curated-significant-wins"
import { getSubmittedWins } from "@/lib/athlete-submitted-wins"
import { highSchoolBouts, isHighSchoolSeason } from "@/lib/high-school-window"
import { loadStatePlacerIndex } from "@/lib/state-placers"
import { mergeBoutSources } from "@/lib/bout-source-deduplication"
import { styleOfEvent } from "@/lib/wrestling-style"

/**
 * The wins on a profile worth a reader's attention: over the TOC field, or over a ranked prospect.
 *
 * Ranked opponents include classes that are not published yet. The 2029 rankings are private, but
 * a win over one of those wrestlers is no less real — and only the fact of the ranking leaves this
 * endpoint, never the number, so nothing unpublished is disclosed by it.
 *
 * Most recent season only, the same window seeding uses for head-to-head. A significant win is an
 * argument about who somebody is beating now; a win from three seasons ago, at a different weight
 * and a different stage of growing up, is a different claim and does not belong in the same list.
 */

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const [{ data: rawRows }, { data: invitations }, rawTournamentBouts, stateIndex, { data: gradRow }] = await Promise.all([
    admin.from("matches").select("season,matches,grade").eq("athlete_id", id),
    admin.from("toc_invitations").select("*, athletes(id,name)"),
    // Qualifier and national-event wins live in their own table, not in the match import.
    getQualifierSignificantWinBouts(admin, id, "wins", "any").catch(() => [] as Bout[]),
    // Other states' placers too: a win over a Virginia champion at NHSCA belongs here.
    loadStatePlacerIndex(admin, new Date(), { outOfState: true }).catch(() => ({
      statePlacers: [],
      stateSchools: [],
      fargoAllAmericans: [],
    })),
    admin.from("athletes").select("graduationyear").eq("id", id).maybeSingle(),
  ])
  // No middle school seasons or bouts anywhere (Matt, 1 October 2026).
  const grad = (gradRow as { graduationyear?: number | null } | null)?.graduationyear ?? null
  const rows = (rawRows ?? []).filter((r: any) => isHighSchoolSeason(r.season, grad, r.grade))
  const tournamentBouts = highSchoolBouts(rawTournamentBouts as never[], grad) as Bout[]
  // Inside the head-to-head window they count for every reason; older ones only for a state
  // placer, like the earlier seasons of the match import below.
  const cutoff = Date.now() - HEAD_TO_HEAD_WINDOW_DAYS * 86_400_000
  const isOlder = (bout: Bout) => {
    const at = bout.date ? Date.parse(String(bout.date)) : Number.NaN
    return Number.isFinite(at) && at < cutoff
  }
  const qualifierBouts = tournamentBouts.filter((b) => !isOlder(b))
  const olderTournamentBouts = tournamentBouts.filter(isOlder)

  /*
   * Wins the athlete reported themselves, published without review.
   *
   * Carried with `source: "athlete-reported"` so the profile can label them. A coach is owed
   * the difference between a win we imported off a bracket and one someone typed into a form —
   * and the label is also what makes publishing-without-review safe to offer.
   */
  // Only with the opponent's accolade filled in: a win with no accolade does not make this list.
  const submittedWins = highSchoolBouts((await getSubmittedWins(admin, id)).filter((win) => win.credential.trim()), grad).map((win) => ({
    opponent: win.opponent,
    opponentSchool: win.opponentSchool,
    event: win.event,
    date: win.date,
    result: win.result,
    weight: null,
    reason: "credentialed" as const,
    credential: win.credential,
    scope: "national" as const,
    source: "athlete-reported" as const,
  }))

  const boutsOf = (row: unknown): Bout[] => {
    try {
      const value = (row as { matches?: unknown }).matches
      return Array.isArray(value) ? value : JSON.parse(String(value ?? "[]"))
    } catch {
      return []
    }
  }
  const latestRows = latestSeasonMatchRows((rows ?? []) as never)
  const matchBouts: Bout[] = highSchoolBouts(latestRows.flatMap(boutsOf) as never[], grad) as Bout[]
  /*
   * Earlier seasons count for one thing: a win over a state champion or placer. Every known win
   * over one belongs on the profile - a college coach wants to see who a wrestler has beaten, and
   * a state finalist beaten as a freshman is still a state finalist beaten. The other reasons keep
   * the current-season window above.
   */
  const earlierBouts: Bout[] = highSchoolBouts(
    [
      ...olderTournamentBouts,
      ...((rows ?? []) as unknown[]).filter((r) => !latestRows.includes(r as never)).flatMap(boutsOf),
    ] as never[],
    grad,
  ) as Bout[]
  // The same bout arrives from both the season import and an event CSV; merge them the way the
  // scouting report does, preferring the event row, so a win is not listed twice.
  const bouts: Bout[] = mergeBoutSources(qualifierBouts, matchBouts)
  const curatedWins = getCuratedSignificantWins(id).map((win) => ({
    ...win,
    reason: "credentialed" as const,
    scope: "national" as const,
  }))
  if (bouts.length === 0 && earlierBouts.length === 0 && curatedWins.length === 0 && submittedWins.length === 0) {
    return NextResponse.json({ wins: submittedWins })
  }

  const tocField = buildTocFieldBoard(invitations ?? []).weights
    .flatMap((weight) => weight.athletes.filter((a) => a.status === "confirmed").map((a) => a.name))
    .filter(Boolean)

  // Paginated: PostgREST caps a request at 1000 rows and there are more ranked athletes than that
  // across every class once the unpublished ones are included.
  const ranked: RankedOpponent[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from("athletes")
      .select("name,prospect_ranking,graduationyear")
      .not("prospect_ranking", "is", null)
      .range(from, from + 999)
    if (!data?.length) break
    for (const row of data) {
      if (row.name) {
        ranked.push({
          name: String(row.name),
          ranking: row.prospect_ranking == null ? null : Number(row.prospect_ranking),
          graduationYear: row.graduationyear == null ? null : Number(row.graduationyear),
        })
      }
    }
    if (data.length < 1000) break
  }

  const index = { tocField, ranked, ...stateIndex }
  const currentWins = findSignificantWins(bouts, index)
  const currentKeys = new Set(currentWins.map((w) => `${w.opponent.toLowerCase()}|${w.date}`))
  const earlierStateWins = findSignificantWins(earlierBouts, index, { stateOnly: true }).filter(
    (w) => !currentKeys.has(`${w.opponent.toLowerCase()}|${w.date}`),
  )
  // Accolades only: ranked (NC or national) or a state champion/placer. TOC field alone is dropped.
  const calculatedWins = withAccoladesOnly([...currentWins, ...earlierStateWins]).map((win) => ({
    opponent: win.opponent,
    opponentSchool: win.opponentSchool,
    event: win.event,
    date: win.date,
    result: win.result,
    weight: win.weight,
    reason: win.reason,
    // The opponent's state finish, when they have one, is the label a reader recognises - beside
    // the stronger reason rather than instead of it.
    credential: !accoladeLine(win)
      ? win.reason === "national-ranked"
        ? (win.nationalRankLabel ?? "Nationally ranked")
        : null
      : win.reason === "state-champion" || win.reason === "state-placer" || win.reason === "national-placer"
        ? accoladeLine(win)
        : `${win.reason === "toc-field" ? "TOC field" : win.reason === "national-ranked" ? win.nationalRankLabel ?? "Nationally ranked" : "NC ranked"} · ${accoladeLine(win)}`,
    // A win over another state's placer is a national result, and the filter should say so.
    scope: win.opponentState && win.opponentState !== "NC" ? ("national" as const) : ("in-state" as const),
  }))

  /*
   * The same bout, reported twice. A family's submitted win and the imported bracket rarely agree
   * to the letter - JT Hill's TOC win arrived as "Jay Mills", 19 September, from the family and as
   * "Jeshurun Mills", 18 September, from the bracket - so two entries are one bout when the names
   * could be the same person and the dates are within two days. The earlier list wins.
   */
  const dayOf = (date: string | null) => {
    const t = date ? Date.parse(date) : Number.NaN
    return Number.isNaN(t) ? null : t / 86_400_000
  }
  const sameBout = (a: { opponent: string; date: string | null }, b: { opponent: string; date: string | null }) => {
    if (!namesLikelySamePerson(a.opponent, b.opponent)) return false
    const da = dayOf(a.date)
    const db = dayOf(b.date)
    return da == null || db == null ? a.date === b.date : Math.abs(da - db) <= 2
  }
  const wins: Array<(typeof submittedWins)[number] | (typeof curatedWins)[number] | (typeof calculatedWins)[number]> = []
  for (const win of [...submittedWins, ...curatedWins, ...calculatedWins]) {
    if (!wins.some((kept) => sameBout(kept, win))) wins.push(win)
  }

  // Folkstyle or freestyle/Greco, so the profile can list them apart.
  return NextResponse.json({ wins: wins.map((w) => ({ ...w, style: styleOfEvent(w.event) })) })
}
