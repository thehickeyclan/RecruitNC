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
import { firstLast, prefersDuplicate, survivorScore } from "@/lib/duplicate-athletes"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
  process.exit(1)
}
const admin = createClient(url, key, { auth: { persistSession: false } })
const emitSql = process.argv.includes("--sql")

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
  return refs.sort((a, b) => a.table.localeCompare(b.table) || a.column.localeCompare(b.column))
}

async function main() {
  const refs = await athleteReferences()
  const { data: all, error } = await admin.from("athletes").select("*")
  if (error) {
    console.error("Could not read athletes:", error.message)
    process.exit(1)
  }

  const groups = new Map<string, Array<Record<string, unknown>>>()
  for (const row of all ?? []) {
    const key = `${firstLast(String(row.name))}|${row.graduationyear ?? ""}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  const dupes = [...groups].filter(([, rows]) => rows.length > 1)

  console.log(`${refs.length} tables reference athletes. ${dupes.length} name+class groups have more than one profile.\n`)

  const statements: string[] = []
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
    }

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

  if (!emitSql) {
    console.log("Re-run with --sql to print the SQL.")
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
