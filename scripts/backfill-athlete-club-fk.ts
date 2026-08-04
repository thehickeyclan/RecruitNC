/**
 * Backfill athletes.wrestling_club_id from the legacy free-text club name.
 *
 * Resolves through exactly the same path the public map uses — normalised club name plus
 * the alias table — so the FK agrees with the counts already on screen rather than
 * introducing a second, subtly different answer.
 *
 * Idempotent: only fills rows where the FK is still null. Anything it cannot resolve is
 * listed at the end for a human, never guessed.
 *
 *   npx tsx scripts/backfill-athlete-club-fk.ts          # report only
 *   npx tsx scripts/backfill-athlete-club-fk.ts --apply  # write
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeClubName } from "@/lib/clubs/club-normalize"

const APPLY = process.argv.includes("--apply")

async function main() {
  const admin = createAdminClient()

  const { data: clubs, error: clubError } = await admin.from("wrestling_clubs").select("id,name,normalized_name")
  if (clubError) throw new Error(`clubs: ${clubError.message}`)

  const { data: aliases } = await admin.from("wrestling_club_aliases").select("club_id,normalized_alias")

  const keyToClub = new Map<string, number>()
  for (const club of clubs ?? []) {
    const row = club as { id: number; name: string; normalized_name: string | null }
    keyToClub.set(row.normalized_name ?? normalizeClubName(row.name), row.id)
    keyToClub.set(normalizeClubName(row.name), row.id)
  }
  for (const alias of aliases ?? []) {
    const row = alias as { club_id: number; normalized_alias: string }
    if (row.normalized_alias) keyToClub.set(row.normalized_alias, row.club_id)
  }

  const { data: athletes, error: athleteError } = await admin.from("athletes").select("*").limit(5000)
  if (athleteError) throw new Error(`athletes: ${athleteError.message}`)

  const nameById = new Map((clubs ?? []).map((c) => [(c as { id: number }).id, (c as { name: string }).name]))

  let linked = 0
  let alreadyLinked = 0
  let blank = 0
  const unresolved = new Map<string, number>()

  for (const row of athletes ?? []) {
    const athlete = row as Record<string, any>
    const text = String(athlete.wrestlingClub ?? "").trim()

    if (athlete.wrestling_club_id) {
      alreadyLinked++
      continue
    }
    if (!text) {
      blank++
      continue
    }

    const clubId = keyToClub.get(normalizeClubName(text))
    if (!clubId) {
      unresolved.set(text, (unresolved.get(text) ?? 0) + 1)
      continue
    }

    if (APPLY) {
      const { error } = await admin.from("athletes").update({ wrestling_club_id: clubId }).eq("id", athlete.id)
      if (error) {
        console.error(`  ✗ ${athlete.name ?? athlete.id}: ${error.message}`)
        continue
      }
    }
    linked++
  }

  console.log(APPLY ? "APPLIED\n" : "DRY RUN — re-run with --apply to write\n")
  console.log(`  athletes:          ${(athletes ?? []).length}`)
  console.log(`  already linked:    ${alreadyLinked}`)
  console.log(`  ${APPLY ? "linked" : "would link"}:      ${linked}`)
  console.log(`  no club on file:   ${blank}`)
  console.log(`  unresolved:        ${[...unresolved.values()].reduce((sum, n) => sum + n, 0)}`)

  if (unresolved.size) {
    console.log("\n  needs a human — add a club or an alias, then re-run:")
    for (const [text, count] of [...unresolved.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(count).padStart(3)}  "${text}"`)
    }
  }

  if (APPLY) {
    const { data: after } = await admin.from("athletes").select("wrestling_club_id").limit(5000)
    const counts = new Map<number, number>()
    for (const row of after ?? []) {
      const id = (row as { wrestling_club_id: number | null }).wrestling_club_id
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    console.log("\n  top clubs by linked athletes:")
    for (const [id, count] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
      console.log(`    ${String(count).padStart(3)}  ${nameById.get(id) ?? id}`)
    }
  }
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
