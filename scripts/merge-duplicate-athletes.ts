/**
 * Finds athletes that are the same person twice and writes the SQL to consolidate them.
 *
 *   npx tsx --env-file=.env.local scripts/merge-duplicate-athletes.ts            # plan only
 *   npx tsx --env-file=.env.local scripts/merge-duplicate-athletes.ts --sql      # emit SQL
 *
 * Replaces `scripts/merge-duplicate-athletes.md`, which listed seven tables by hand and had
 * gone stale: fifty-three tables carry an `athlete_id`, `toc_invitations` among them. Running
 * that guide on a wrestler who had registered for the Tournament of Champions would have taken
 * his paid registration with him. So the reference list is read from the live PostgREST schema
 * every run and cannot drift again.
 *
 * Two rules the merge follows:
 *
 * - **Keep the most information.** The survivor is filled field by field from the duplicates
 *   wherever it is null, so a GPA on one row and a phone on the other both survive.
 * - **Never guess at people.** Grouping is first name, last name and graduation year, so
 *   "AMANUEL KAHSAI" and "Amanuel “Manny” Kahsai" meet but two different wrestlers do not get
 *   merged on a shared surname. Every group is printed for a human to read before any SQL runs.
 */
import { createClient } from "@supabase/supabase-js"
import { duplicateBlockKeys, prefersDuplicate, sameWrestler, survivorScore, type DuplicateCandidate } from "@/lib/duplicate-athletes"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
  process.exit(1)
}
const admin = createClient(url, key, { auth: { persistSession: false } })
const emitSql = process.argv.includes("--sql")
const write = process.argv.includes("--write")

/** Every column in the database that points at an athlete, read from the live schema. */
async function athleteReferences(): Promise<Array<{ table: string; column: string }>> {
  const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key!, Authorization: `Bearer ${key}` } })
  const spec = (await res.json()) as { definitions?: Record<string, { properties?: Record<string, { description?: string }> }> }
  const refs: Array<{ table: string; column: string }> = []
  for (const [table, def] of Object.entries(spec.definitions ?? {})) {
    if (table === "athletes") continue
    for (const [column, prop] of Object.entries(def.properties ?? {})) {
      const fk = String(prop.description ?? "").match(/<fk table='([^']+)' column='([^']+)'\/>/)
      // A declared foreign key, or a column named for one where the constraint was never added.
      if ((fk && fk[1] === "athletes") || (!fk && /^(athlete_id|opponent_id|winner_athlete_id|loser_athlete_id)$/.test(column))) {
        refs.push({ table, column })
      }
    }
  }
  /*
   * Views are dropped here. `unified_fundraising_lookup` carries an athlete_id and looks exactly
   * like a table in the schema, but a view derives from its base tables and cannot be updated -
   * and in the --sql path that error arrives inside `begin ... commit` and rolls the whole merge
   * back. Each candidate is probed with an update against an id that cannot exist: a table
   * answers "0 rows", a view refuses.
   */
  const writable: Array<{ table: string; column: string }> = []
  const NO_SUCH_ID = "00000000-0000-0000-0000-000000000000"
  for (const ref of refs) {
    const { error } = await admin.from(ref.table).update({ [ref.column]: NO_SUCH_ID }).eq(ref.column, NO_SUCH_ID)
    if (error && /cannot update view|is not updatable/i.test(error.message)) continue
    writable.push(ref)
  }
  return writable.sort((a, b) => a.table.localeCompare(b.table) || a.column.localeCompare(b.column))
}

/**
 * Apply the plan through PostgREST, because there is no psql on the machines this runs from and
 * nine hundred lines of SQL is not something to paste by hand.
 *
 * Not one transaction, so the order matters: the survivor is filled first, then the references
 * are repointed, and the duplicate row is deleted last. A run that dies partway leaves both
 * profiles alive with their rows split between them, which the scan finds again - rather than a
 * deleted profile whose results went nowhere.
 *
 * A join table with a unique key (a like, a coach's star) rejects the repoint when the survivor
 * already holds the same row. That is not a failure: both profiles were starred by one coach and
 * one of the two rows is now redundant, so the duplicate's row is deleted instead.
 */
async function apply(
  plan: Array<{ label: string; keepId: string; keep: Record<string, unknown>; drops: Array<{ id: string; row: Record<string, unknown>; sets: string[] }> }>,
  refs: Array<{ table: string; column: string }>,
) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  /*
   * Written outside the repository on purpose. The undo snapshot is the whole deleted row of
   * every duplicate - 108 columns, among them a contact email, a phone number, a birthdate, a
   * GPA and a Zelle address - and ranking-snapshots is a tracked directory. CLAUDE_SCRATCH or
   * the system temp directory, never a path git can see.
   */
  const dir = process.env.CLAUDE_SCRATCH_DIR || process.env.TMPDIR || "/tmp"
  const log = `${dir.replace(/\/$/, "")}/merge-duplicate-athletes-${stamp}.json`
  await import("fs").then((fs) => fs.writeFileSync(log, JSON.stringify({ undo: "each drops[].row is the full deleted athlete row; re-insert it and repoint by hand", plan }, null, 2)))
  console.log(`\nWRITING. Undo snapshot: ${log}\n`)
  let moved = 0, collisions = 0, deleted = 0
  for (const group of plan) {
    console.log(group.label)
    for (const drop of group.drops) {
      if (drop.sets.length) {
        const patch = Object.fromEntries(drop.sets.map((c) => [c, drop.row[c]]))
        const { error } = await admin.from("athletes").update(patch).eq("id", group.keepId)
        if (error) { console.log(`  FILL FAILED (${drop.sets.join(", ")}): ${error.message}`); continue }
        console.log(`  filled ${drop.sets.length} field(s) on the survivor: ${drop.sets.join(", ")}`)
      }
      for (const ref of refs) {
        const { error, count } = await admin.from(ref.table).update({ [ref.column]: group.keepId }, { count: "exact" }).eq(ref.column, drop.id)
        if (!error) { if (count) { moved += count; console.log(`  ${ref.table}.${ref.column}: ${count} row(s) moved`) }; continue }
        if (!/duplicate key|23505/i.test(error.message)) { console.log(`  ${ref.table}.${ref.column} FAILED: ${error.message}`); continue }
        const { error: delErr, count: gone } = await admin.from(ref.table).delete({ count: "exact" }).eq(ref.column, drop.id)
        if (delErr) { console.log(`  ${ref.table}.${ref.column} FAILED both ways: ${delErr.message}`); continue }
        collisions += gone ?? 0
        console.log(`  ${ref.table}.${ref.column}: the survivor already held the same row, dropped ${gone} redundant row(s)`)
      }
      const { error } = await admin.from("athletes").delete().eq("id", drop.id)
      if (error) { console.log(`  DELETE FAILED for ${drop.id}: ${error.message}`); continue }
      deleted++
      console.log(`  deleted ${drop.id} (${String(drop.row.name)})`)
    }
    console.log()
  }
  console.log(`${deleted} duplicate profile(s) deleted, ${moved} row(s) moved, ${collisions} redundant row(s) dropped.`)
  console.log(`Undo snapshot: ${log}`)
}

async function main() {
  const refs = await athleteReferences()
  /*
   * Paged, and ordered by id. A plain select stops at PostgREST's 1,000-row ceiling, which this
   * read quietly hit the moment the second state landed: it was comparing the first 1,000 of
   * 3,342 profiles and reporting no duplicates in the rest. Without the order the pages of such
   * a read also repeat and skip rows.
   */
  const all: Array<Record<string, unknown>> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("athletes").select("*").order("id").range(from, from + 999)
    if (error) {
      console.error("Could not read athletes:", error.message)
      process.exit(1)
    }
    all.push(...((data ?? []) as Array<Record<string, unknown>>))
    if (!data || data.length < 1000) break
  }

  /*
   * Grouping is `sameWrestler` (lib/duplicate-athletes.ts), not a key string, because the
   * duplicates that survive are the ones whose names do not key the same: Alex and Alexander
   * Rodriguez at Cardinal Gibbons, Wes and Wesley Files at Frankfort. Only its "certain" verdict
   * groups here - name, school and class year all agreeing - and "likely" and "review" are left
   * to scripts/scan-duplicate-profiles.ts and a person. Rows are joined transitively, so three
   * spellings of one wrestler become one group rather than three pairs.
   */
  const rows = all
  const candidate = (r: Record<string, unknown>): DuplicateCandidate => ({
    id: String(r.id), name: String(r.name ?? ""), wrestling_name: (r.wrestling_name as string) ?? null,
    highschool: (r.highschool as string) ?? null, state: (r.state as string) ?? null,
    graduationyear: r.graduationyear == null ? null : Number(r.graduationyear), gender: (r.gender as string) ?? null,
  })
  const blocks = new Map<string, Array<Record<string, unknown>>>()
  for (const r of rows) for (const k of duplicateBlockKeys(candidate(r))) blocks.set(k, [...(blocks.get(k) ?? []), r])
  const parent = new Map<string, string>()
  const find = (x: string): string => (parent.get(x) === x || !parent.has(x) ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!))
  for (const r of rows) parent.set(String(r.id), String(r.id))
  const reasons = new Map<string, string>()
  for (const group of blocks.values()) {
    if (group.length < 2 || group.length > 400) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const verdict = sameWrestler(candidate(group[i]!), candidate(group[j]!))
        if (verdict?.grade !== "certain") continue
        const [x, y] = [find(String(group[i]!.id)), find(String(group[j]!.id))]
        if (x !== y) parent.set(x, y)
        reasons.set(find(String(group[i]!.id)), verdict.why)
      }
    }
  }
  const byRoot = new Map<string, Array<Record<string, unknown>>>()
  for (const r of rows) {
    const root = find(String(r.id))
    byRoot.set(root, [...(byRoot.get(root) ?? []), r])
  }
  const dupes = [...byRoot]
    .filter(([, g]) => g.length > 1)
    .map(([root, g]) => [`${g[0]!.name} · ${g[0]!.highschool ?? "no school"} · ${g[0]!.graduationyear ?? "no class"} — ${reasons.get(root) ?? "same wrestler"}`, g] as [string, Array<Record<string, unknown>>])

  console.log(`${refs.length} tables reference athletes. ${dupes.length} groups hold more than one profile of the same wrestler.\n`)

  const statements: string[] = []
  /* The same plan the SQL describes, for --write to apply through PostgREST. */
  const plan: Array<{ label: string; keepId: string; keep: Record<string, unknown>; drops: Array<{ id: string; row: Record<string, unknown>; sets: string[] }> }> = []
  for (const [label, rows] of dupes) {
    const scored = []
    for (const row of rows) {
      const { count } = await admin.from("matches").select("id", { count: "exact", head: true }).eq("athlete_id", String(row.id))
      const { count: inv } = await admin.from("toc_invitations").select("id", { count: "exact", head: true }).eq("athlete_id", String(row.id))
      scored.push({ row, matchRows: count ?? 0, invited: (inv ?? 0) > 0, score: survivorScore(row, count ?? 0) })
    }
    // Oldest wins a genuine tie: on a double submit it is the row other things already point at.
    scored.sort((a, b) => b.score - a.score || String(a.row.created_at).localeCompare(String(b.row.created_at)))
    const keep = scored[0]!
    const merge = scored.slice(1)

    console.log(`${label}`)
    for (const s of scored) {
      console.log(
        `  ${s === keep ? "KEEP  " : "merge "} ${String(s.row.id)}  ${String(s.row.name).padEnd(28)}` +
          ` score:${String(s.score).padStart(5)}  matches:${s.matchRows}${s.invited ? "  TOC-INVITED" : ""}`,
      )
    }

    // Fill the survivor's empty columns from the duplicates before anything is deleted.
    const columns = Object.keys(keep.row).filter((c) => c !== "id" && c !== "created_at")
    /** Per duplicate, the survivor columns to take from it: its fills and any preferred value. */
    const takes = new Map<string, string[]>()
    for (const dup of merge) {
      const fills = columns.filter((c) => {
        const k = keep.row[c]
        const d = dup.row[c]
        const keepEmpty = k === null || k === "" || (Array.isArray(k) && !k.length)
        const dupHas = d !== null && d !== "" && !(Array.isArray(d) && !d.length)
        return keepEmpty && dupHas
      })
      if (fills.length) console.log(`         fills from ${String(dup.row.id).slice(0, 8)}: ${fills.join(", ")}`)

      /**
       * Fields where both rows hold a different value.
       *
       * Everything else survives the merge — empty columns are filled, and all fifty-three
       * reference tables are repointed — so a conflict is the only place information is
       * actually lost, and the only place a person needs to look. Kahsai carries
       * ncUnitedTeam "none" on one row and "blue" on the other; Lemke is prospect_ranking 74
       * and 75, a duplicate quietly occupying two slots in the class.
       */
      const conflicts = columns.filter((c) => {
        if (/_at$|^updated|^created/.test(c)) return false
        const k = keep.row[c]
        const d = dup.row[c]
        if (k === null || k === "" || d === null || d === "") return false
        return JSON.stringify(k) !== JSON.stringify(d)
      })
      for (const c of conflicts) {
        if (prefersDuplicate(c, keep.row[c], dup.row[c])) {
          console.log(`         TAKE  ${c}: ${JSON.stringify(dup.row[c]).slice(0, 40)} over ${JSON.stringify(keep.row[c]).slice(0, 40)}`)
          statements.push(
            `update public.athletes a set "${c}" = b."${c}" from public.athletes b` +
              ` where a.id = '${keep.row.id}' and b.id = '${dup.row.id}';`,
          )
          takes.set(String(dup.row.id), [...(takes.get(String(dup.row.id)) ?? []), c])
          continue
        }
        console.log(
          `         CONFLICT ${c}: keeping ${JSON.stringify(keep.row[c]).slice(0, 40)}` +
            `, discarding ${JSON.stringify(dup.row[c]).slice(0, 40)}`,
        )
      }
      for (const c of fills) {
        statements.push(
          `update public.athletes a set "${c}" = b."${c}" from public.athletes b` +
            ` where a.id = '${keep.row.id}' and b.id = '${dup.row.id}';`,
        )
      }
      takes.set(String(dup.row.id), [...fills, ...(takes.get(String(dup.row.id)) ?? [])])
    }
    plan.push({
      label,
      keepId: String(keep.row.id),
      keep: keep.row,
      drops: merge.map((d) => ({ id: String(d.row.id), row: d.row, sets: takes.get(String(d.row.id)) ?? [] })),
    })

    for (const dup of merge) {
      for (const ref of refs) {
        statements.push(
          `update public.${ref.table} set ${ref.column} = '${keep.row.id}' where ${ref.column} = '${dup.row.id}';`,
        )
      }
      statements.push(`delete from public.athletes where id = '${dup.row.id}';`)
    }
    console.log()
  }

  if (write) return apply(plan, refs)
  if (!emitSql) {
    console.log("Re-run with --sql to print the SQL, or --write to apply it here.")
    return
  }

  console.log("-- Consolidate duplicate athlete profiles.")
  console.log("-- Fills the survivor's empty fields first, then repoints every reference, then deletes.")
  console.log("-- A unique constraint on a join table (likes, college_coach_stars) can reject an")
  console.log("-- update where the survivor already holds the same row; delete that row and re-run.")
  console.log("begin;")
  for (const s of statements) console.log(s)
  console.log("commit;")
}

main()
