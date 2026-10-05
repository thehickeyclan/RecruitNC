#!/usr/bin/env npx tsx
/**
 * Bouts that belong to one of our athletes but carry no athlete_id, so no profile shows them.
 *
 * 678 of them. The name on the row is identical to the profile's — Carson Raper is missing 17
 * bouts, Hayden Smith 12 — so nothing clever is needed to find them: the identity registry already
 * says the alias and the profile are the same person.
 *
 * What IS needed is proof it is the same person, because "Hayden Smith of NC" is the shape of
 * every namesake mistake we have made. The registry has no class year for most wrestlers, so two
 * NC wrestlers of one name are a single identity, and attributing both their records to one
 * profile would put another boy's losses on a recruit's page.
 *
 * So a bout is only claimed when the weight corroborates: within CLOSE_LB of a weight the athlete
 * is already known to have wrestled, in a season near it. Anything else is left for review — the
 * bout stays visible to Data Dawg's name lookup either way, it just does not get attached to a
 * profile on a name alone. See [[check-weight-before-claiming-nc-kid]].
 *
 *   npx tsx scripts/link-our-bouts-by-identity.ts            # dry run
 *   npx tsx scripts/link-our-bouts-by-identity.ts --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const WRITE = process.argv.includes("--write")
/** A wrestler moves a class or two between seasons, not five. */
const CLOSE_LB = 30
const CLOSE_SEASONS = 2

async function page<T>(table: string, select: string, f: (q: any) => any = (q) => q): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await f(sb.from(table).select(select)).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")

  const ours = await page<{ id: string; canonical_name: string; state: string | null; athlete_id: string }>(
    "athlete_identities",
    "id, canonical_name, state, athlete_id",
    (q) => q.not("athlete_id", "is", null),
  )
  const byIdentity = new Map(ours.map((o) => [o.id, o]))
  const aliases = await page<{ identity_id: string; alias_name_raw: string; alias_team: string | null; status: string }>(
    "identity_aliases",
    "identity_id, alias_name_raw, alias_team, status",
  )
  const mine = aliases.filter((a) => a.status === "linked" && byIdentity.has(a.identity_id))
  console.log(`aliases pointing at one of our profiles: ${mine.length}`)

  /* Every bout already attributed to one of our athletes — the weights we can corroborate against. */
  const linked = await page<{ athlete_id: string; weight_class: string | null; year: number | null }>(
    "other_tournament_bouts",
    "athlete_id, weight_class, year",
    (q) => q.not("athlete_id", "is", null),
  )
  const known = new Map<string, Array<{ weight: number; year: number }>>()
  for (const b of linked) {
    const w = Number(b.weight_class)
    const y = Number(b.year)
    if (!w || !y) continue
    if (!known.has(b.athlete_id)) known.set(b.athlete_id, [])
    known.get(b.athlete_id)!.push({ weight: w, year: y })
  }

  const claim: Array<{ boutId: string; athleteId: string }> = []
  const review: Array<{ who: string; why: string; bouts: number }> = []
  let claimed = 0
  let held = 0

  for (const [identityId, group] of groupBy(mine, (a) => a.identity_id)) {
    const who = byIdentity.get(identityId)!
    const names = [...new Set(group.map((g) => g.alias_name_raw))]
    const candidates = await page<{ id: string; weight_class: string | null; year: number | null; event_name: string }>(
      "other_tournament_bouts",
      "id, weight_class, year, event_name",
      (q) => q.in("athlete_name", names).is("athlete_id", null),
    )
    if (!candidates.length) continue
    const history = known.get(who.athlete_id) ?? []
    for (const c of candidates) {
      const w = Number(c.weight_class)
      const y = Number(c.year)
      const corroborated = history.some(
        (h) => Math.abs(h.weight - w) <= CLOSE_LB && Math.abs(h.year - y) <= CLOSE_SEASONS,
      )
      if (w && y && corroborated) { claim.push({ boutId: c.id, athleteId: who.athlete_id }); claimed++ }
      else held++
    }
    const claimedIds = new Set(claim.map((c) => c.boutId))
    const mineClaimed = candidates.filter((c) => claimedIds.has(c.id)).length
    if (candidates.length - mineClaimed > 0) {
      review.push({
        who: `${who.canonical_name} (${who.state})`,
        why: history.length
          ? `${candidates.length - mineClaimed} bouts at a weight or year his own record does not support`
          : "no linked bouts to corroborate a weight against",
        bouts: candidates.length - mineClaimed,
      })
    }
  }

  console.log(`\n   bouts claimed (weight and season corroborate): ${claimed}`)
  console.log(`   bouts held back for review                   : ${held}`)
  console.log(`\nheld back, by athlete:`)
  for (const r of review.slice(0, 12)) console.log(`   ${r.who.padEnd(28)} ${r.why}`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }

  /*
   * One update per athlete, covering all of that athlete's claimed bouts, rather than one per
   * bout: 510 bouts across a few hundred athletes is a few hundred requests, not 510.
   */
  const byAthlete = groupBy(claim, (c) => c.athleteId)
  let updated = 0
  for (const [athleteId, rows] of byAthlete) {
    for (let i = 0; i < rows.length; i += 200) {
      const ids = rows.slice(i, i + 200).map((r) => r.boutId)
      const { error } = await sb.from("other_tournament_bouts").update({ athlete_id: athleteId }).in("id", ids)
      if (error) { console.error(`update for ${athleteId} FAILED:`, error.message); return }
      updated += ids.length
    }
  }
  console.log(`bouts attached to a profile: ${updated}`)

  /* Read it back: an update that matched nothing looks exactly like one that worked. */
  const stillLoose = await page<{ id: string }>("other_tournament_bouts", "id", (q) =>
    q.in("id", claim.slice(0, 200).map((c) => c.boutId)).is("athlete_id", null),
  )
  console.log(`of the first 200 claimed, still unattached: ${stillLoose.length} (expected 0)`)
}

function groupBy<T, K>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>()
  for (const r of rows) {
    const k = key(r)
    if (!out.has(k)) out.set(k, [])
    out.get(k)!.push(r)
  }
  return out
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
