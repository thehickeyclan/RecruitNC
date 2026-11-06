#!/usr/bin/env npx tsx
/**
 * Attach an imported national event's rows to the profiles that were MINTED FROM THAT EVENT,
 * using the event's own participant ids rather than a name match.
 *
 * Why this exists. We minted 197 profiles from the National Preps field, one per wrestler in a
 * current class whose grade prints agreed, each carrying the Flo participant id in
 * `source_athlete_id`. Then we imported the 2024 and 2026 ledgers, and `relink-other-tournament-
 * event.ts` linked almost none of them: it corroborates a name match with a weight the profile
 * has wrestled at before, and these profiles have no before. Their only results are the ones
 * being linked. 216 rows were held on "no weight on record within 30 lb", and all 197 profiles
 * had pages with nothing on them.
 *
 * The weight guard is right and stays. This takes the other road: the ledger prints a Flo id on
 * both sides of every bout (`Winner ID`, `Loser ID`), and the profile was minted from a Flo id.
 * So the identity is not inferred at all - it is an identifier at both ends, which is stronger
 * evidence than any name match and cannot put one wrestler's bouts on another's page.
 *
 * The two ids are not the same id, which is the whole reason this needs the tabs. A ledger row
 * carries the ENTRY id ("10ixNhiFOUr0jC4j", 16 characters); the mint used the PERSON id
 * ("0DQ1kP9wjYPTDbQgw", 17). Joining them directly matches nothing at all - the first run of this
 * script filled 0 rows and reported 7,739 ids with no profile, which is what a silent id-space
 * mismatch looks like. The participants tab record carries both fields, so `--tabs` is what
 * bridges them: entry id -> person id -> profile.
 *
 * Guards, because an id is only as good as the row it is read off:
 *
 * - A profile is only ever reached through `source_athlete_id` + `source_athlete_id_source`. A
 *   profile minted from some other source is never touched, however well the name fits.
 * - Rows are matched to a participant id on weight plus name within the one event, and any key
 *   that is not unique in the ledger is dropped rather than guessed. Two same-named wrestlers at
 *   one weight is the only shape that could go wrong, and it goes nowhere instead.
 * - Only an empty id is filled. A row that already names a profile is never changed.
 * - Both sides of a bout are kept in step: a bout's `opponent_id` is filled from the same map.
 *
 *   npx tsx scripts/link-event-rows-by-source-id.ts --tabs <dir> --source "National Preps"
 *   npx tsx scripts/link-event-rows-by-source-id.ts --tabs <dir> --source "National Preps" --apply
 */
import fs from "node:fs"
import path from "node:path"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

for (const file of [".env.local", ".env"]) {
  const full = path.join(process.cwd(), file)
  if (!fs.existsSync(full)) continue
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const eq = line.indexOf("=")
    if (eq < 1 || line.trimStart().startsWith("#")) continue
    const key = line.slice(0, eq).trim()
    if (process.env[key]) continue
    process.env[key] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
  }
}

const arg = (n: string, d = "") => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? String(process.argv[i + 1] ?? d) : d
}
const TABS = arg("tabs")
const SOURCE = arg("source")
const APPLY = process.argv.includes("--apply")
if (!TABS || !SOURCE) {
  console.error('--tabs <dir of participants JSON> and --source "<label>" are required')
  process.exit(1)
}

/** Apostrophes arrive mangled from Flo ("D?Ettore"); fold them the way the platform does. */
const norm = (s: string) =>
  String(s ?? "")
    .replace(/(?<=\p{L})[?�](?=\p{L})/gu, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
const keyOf = (weight: string, name: string) => `${String(weight ?? "").trim()}|${norm(name)}`

async function page<T>(sb: SupabaseClient, table: string, select: string, key: string): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    // A fixed order, or pages overlap and rows go missing.
    const { data, error } = await sb.from(table).select(select).eq("event_key", key).order("id").range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  /* participant id -> profile, for profiles minted from this source only. */
  const bySourceId = new Map<string, { id: string; name: string }>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("athletes")
      .select("id,name,source_athlete_id")
      .eq("source_athlete_id_source", SOURCE)
      .order("id")
      .range(from, from + 999)
    if (error) throw new Error(`athletes: ${error.message}`)
    for (const r of data ?? []) if (r.source_athlete_id) bySourceId.set(String(r.source_athlete_id), { id: String(r.id), name: String(r.name) })
    if (!data || data.length < 1000) break
  }
  console.log(`profiles minted from ${SOURCE}: ${bySourceId.size}`)

  /*
   * (event_key, weight|name) -> person id, straight off the participants tabs.
   *
   * The tabs are the better source and not merely a bridge: a tab record carries the person id,
   * the weight, the division and the name together, so it needs no ledger and it covers a season
   * whose ledger we never received. Reading the ledger's entry ids and translating them through
   * the tabs reaches exactly the same profiles and misses 2025, whose rows were imported long
   * before any ledger existed.
   *
   * A key that two wrestlers answer to is refused, not guessed.
   */
  const keyToProfile = new Map<string, Map<string, string | null>>()
  for (const f of fs.readdirSync(TABS).filter((x) => x.endsWith(".json"))) {
    const season = /^(\d{4})/.exec(f)?.[1]
    if (!season) { console.log(`  ${f}: no season in the filename, skipped`); continue }
    const j = JSON.parse(fs.readFileSync(path.join(TABS, f), "utf8")) as {
      items?: Array<{ personId?: string; firstName?: string; lastName?: string; weightClass?: string; division?: string }>
    }
    for (const it of j.items ?? []) {
      if (!it.personId || !it.weightClass) continue
      const eventKey = /girl|female|women/i.test(String(it.division ?? "")) ? `national-preps-girls-${season}` : `national-preps-${season}`
      if (!keyToProfile.has(eventKey)) keyToProfile.set(eventKey, new Map())
      const m = keyToProfile.get(eventKey)!
      const k = keyOf(String(it.weightClass), `${it.firstName} ${it.lastName}`)
      if (!m.has(k)) m.set(k, String(it.personId))
      else if (m.get(k) !== String(it.personId)) m.set(k, null) // two wrestlers, one key: refuse it
    }
  }

  let filledResults = 0, filledBouts = 0, filledOpponents = 0, ambiguous = 0, noProfile = 0
  for (const [eventKey, m] of keyToProfile) {
    for (const v of m.values()) if (v === null) ambiguous += 1
    const profileFor = (weight: string, name: string) => {
      const personId = m.get(keyOf(weight, name))
      if (!personId) return null
      const hit = bySourceId.get(personId)
      if (!hit) { noProfile += 1; return null }
      return hit
    }

    type Res = { id: string; athlete_name: string; weight_class: string | null; athlete_id: string | null }
    const results = await page<Res>(sb, "other_tournament_results", "id,athlete_name,weight_class,athlete_id", eventKey)
    const resUpdates: Array<{ id: string; athlete_id: string }> = []
    for (const r of results) {
      if (r.athlete_id) continue
      const hit = profileFor(String(r.weight_class ?? ""), r.athlete_name)
      if (hit) resUpdates.push({ id: r.id, athlete_id: hit.id })
    }

    type Bout = { id: string; athlete_name: string; opponent_name: string; weight_class: string | null; athlete_id: string | null; opponent_id: string | null }
    const bouts = await page<Bout>(sb, "other_tournament_bouts", "id,athlete_name,opponent_name,weight_class,athlete_id,opponent_id", eventKey)
    const boutUpdates: Array<{ id: string; athlete_id?: string; opponent_id?: string }> = []
    for (const b of bouts) {
      const patch: { id: string; athlete_id?: string; opponent_id?: string } = { id: b.id }
      if (!b.athlete_id) {
        const hit = profileFor(String(b.weight_class ?? ""), b.athlete_name)
        if (hit) patch.athlete_id = hit.id
      }
      if (!b.opponent_id) {
        const hit = profileFor(String(b.weight_class ?? ""), b.opponent_name)
        if (hit) patch.opponent_id = hit.id
      }
      if (patch.athlete_id || patch.opponent_id) boutUpdates.push(patch)
    }

    console.log(
      `${eventKey.padEnd(28)} results ${String(resUpdates.length).padStart(4)} to fill of ${String(results.length).padStart(4)} · bouts ${String(boutUpdates.length).padStart(4)} of ${String(bouts.length).padStart(5)}`,
    )
    filledResults += resUpdates.length
    filledBouts += boutUpdates.filter((b) => b.athlete_id).length
    filledOpponents += boutUpdates.filter((b) => b.opponent_id).length

    if (!APPLY) continue
    for (const u of resUpdates) {
      const { error } = await sb.from("other_tournament_results").update({ athlete_id: u.athlete_id }).eq("id", u.id).is("athlete_id", null)
      if (error) throw new Error(`results ${u.id}: ${error.message}`)
    }
    for (const u of boutUpdates) {
      const patch: Record<string, string> = {}
      if (u.athlete_id) patch.athlete_id = u.athlete_id
      if (u.opponent_id) patch.opponent_id = u.opponent_id
      const { error } = await sb.from("other_tournament_bouts").update(patch).eq("id", u.id)
      if (error) throw new Error(`bouts ${u.id}: ${error.message}`)
    }
  }

  console.log(
    `\n${APPLY ? "filled" : "would fill"}: ${filledResults} result rows · ${filledBouts} bout athlete ids · ${filledOpponents} bout opponent ids`,
  )
  console.log(`keys refused as ambiguous (two wrestlers, one weight and name): ${ambiguous}`)
  console.log(`ledger ids with no profile minted from this source (expected - most of the field): ${noProfile}`)
  if (!APPLY) console.log("\nDry run. --apply to write.")
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
