/**
 * Create athlete records for ranked North Carolina wrestlers we do not hold.
 *
 * A class we have not met cannot be ranked. RankWrestler lists 100 wrestlers in the Class of
 * 2029 and this database held 24, so the board's "top 30" was 23 names — not a ranking of the
 * class but a list of the wrestlers who happened to find us. Publishing that would have said
 * RecruitNC rates somebody 23rd in North Carolina when we had never heard of the other 77.
 *
 * It creates a shell: name, school, class, weight, and nothing else. No ranking, no results, no
 * contact details, no photograph. These are minors, and what goes in is only what an outside
 * ranking service already publishes about them — enough for a result to attach to later.
 *
 * Matching before creating is the whole job. A duplicate athlete is worse than a missing one:
 * it splits a wrestler's results across two profiles, and this session already spent an hour on
 * one Luke Richards whose NHSCA season had gone to his duplicate. Anything that matches an
 * existing name is skipped and reported, never merged automatically.
 *
 * Usage:
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local \
 *     scripts/create-athletes-from-rankwrestler.ts --class 2029 [--apply]
 */
import { createClient } from "@supabase/supabase-js"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"

function arg(name: string): string {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]!
  throw new Error(`Missing required --${name}`)
}

/** Split a display name the way the rest of the app stores one. */
function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") }
}

async function main() {
  const classYear = Number(arg("class"))
  const apply = process.argv.includes("--apply")
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Newest edition only: an older one lists wrestlers who have since moved or stopped.
  const { data: rankings, error } = await client
    .from("rankwrestler_rankings")
    .select("rank, wrestler_name, school, weight_class, edition, athlete_id")
    .eq("class_year", classYear)
    .order("edition", { ascending: false })
  if (error) throw new Error(`Loading rankings: ${error.message}`)
  if (!rankings?.length) throw new Error(`No RankWrestler rows for the class of ${classYear}.`)
  const latest = rankings[0]!.edition
  const current = rankings.filter((r) => r.edition === latest)
  console.log(`edition ${latest}: ${current.length} ranked wrestlers`)

  const { data: athletes, error: athleteError } = await client
    .from("athletes")
    .select("id, name, wrestling_name, graduationyear, highschool")
  if (athleteError) throw new Error(`Loading athletes: ${athleteError.message}`)

  const existing = athletes ?? []
  const toCreate: Record<string, unknown>[] = []
  const skipped: string[] = []

  for (const row of current) {
    const name = String(row.wrestler_name ?? "").trim()
    if (!name) continue
    if (row.athlete_id) { skipped.push(`#${row.rank} ${name} — already linked`); continue }

    /*
     * Matched across every class, not just this one. A wrestler whose graduation year we have
     * wrong is still a wrestler we hold, and creating a second record would bury the first.
     */
    const matches = existing.filter((a) =>
      [a.name, a.wrestling_name].filter(Boolean).some((k) => namesLikelySamePerson(String(k), name)),
    )
    if (matches.length) {
      skipped.push(
        `#${row.rank} ${name} — matches ${matches.map((m) => `${m.name} (class of ${m.graduationyear})`).join(", ")}`,
      )
      continue
    }

    const { firstName, lastName } = splitName(name)
    toCreate.push({
      name,
      firstName,
      lastName,
      highschool: String(row.school ?? "").trim() || null,
      weightclass: String(row.weight_class ?? "").trim() || null,
      graduationyear: classYear,
      // The boys' list; a girls' ranking is published separately and is not this file.
      gender: "Male",
      is_nc_athlete: true,
      status: "active",
      recruiting_status: "Uncommitted",
      // Deliberately not set: prospect_ranking. Being ranked by somebody else is not being
      // ranked by us, and a number here would put them straight onto the public board.
    })
  }

  console.log(`\nwould create ${toCreate.length}, skipping ${skipped.length}`)
  console.log("\nskipped:")
  for (const s of skipped.slice(0, 25)) console.log(`   ${s}`)
  if (skipped.length > 25) console.log(`   … and ${skipped.length - 25} more`)
  console.log("\nto create:")
  for (const c of toCreate.slice(0, 12)) console.log(`   ${c.name} — ${c.highschool}, ${c.weightclass}lb`)
  if (toCreate.length > 12) console.log(`   … and ${toCreate.length - 12} more`)

  if (!apply) {
    console.log("\nDRY RUN — pass --apply to create")
    return
  }

  let created = 0
  for (let i = 0; i < toCreate.length; i += 50) {
    const { data, error: insertError } = await client
      .from("athletes")
      .insert(toCreate.slice(i, i + 50))
      .select("id, name")
    if (insertError) throw new Error(`Inserting: ${insertError.message}`)
    created += data?.length ?? 0
  }
  console.log(`\ncreated ${created} athletes`)

  /*
   * Link the ranking rows to the records just made, so the cross-check works immediately rather
   * than waiting for somebody to notice it is still missing.
   */
  const { data: after } = await client
    .from("athletes")
    .select("id, name")
    .eq("graduationyear", classYear)
  let linked = 0
  for (const row of current) {
    if (row.athlete_id) continue
    const match = (after ?? []).find((a) => String(a.name) === String(row.wrestler_name))
    if (!match) continue
    const { error: linkError } = await client
      .from("rankwrestler_rankings")
      .update({ athlete_id: match.id })
      .eq("class_year", classYear)
      .eq("edition", latest)
      .eq("rank", row.rank)
    if (!linkError) linked += 1
  }
  console.log(`linked ${linked} ranking rows to the new records`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
