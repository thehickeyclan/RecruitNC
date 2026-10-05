#!/usr/bin/env npx tsx
/**
 * Tie the bout store's wrestlers to the identity registry.
 *
 * The bout store names a person as (athlete_name, athlete_club), and the club is a state code at
 * the national events and a club name at the duals. The registry is keyed on (name, state), so
 * every row carrying a state code can be resolved — and that is what turns "Nick Meza" in the
 * brackets and "Nicholas Meza" in Arizona's placer list into one wrestler.
 *
 * Matched once per alias rather than once per bout: 8,951 decisions instead of 105,351, written to
 * identity_aliases keyed on the RAW spelling so a bout row joins on the values it already has.
 *
 * Gender is NOT inferred from the event name. NHSCA and Super 32 run their girls' divisions inside
 * the one event — "2026 NHSCA High School Nationals" covers both — so reading gender from the
 * event would mark every girl at those two as male. It is taken only where it is actually stated:
 * a Fargo women's bracket, or a source file collected as girls'. Where it is unknown and two
 * wrestlers of that name differ only by gender, the alias goes to review rather than guessing.
 *
 *   npx tsx scripts/link-bouts-to-identities.ts            # dry run
 *   npx tsx scripts/link-bouts-to-identities.ts --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { nameWords, namesLikelySamePerson } from "@/lib/athlete-name-match"

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
const SOURCE = "other_tournament_bouts"
const MATCHER = "bout-identity-v1"
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")

async function page<T>(table: string, select: string): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

type Identity = {
  id: string
  normalized_name: string | null
  last_name: string | null
  state: string | null
  gender: string | null
  graduation_year: number | null
  evidence: Record<string, unknown> | null
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")

  const identities = (await page<Identity>(
    "athlete_identities",
    "id, normalized_name, last_name, state, gender, graduation_year, evidence",
  )).filter((i) => i.normalized_name)
  const byNameState = new Map<string, Identity[]>()
  const bySurnameState = new Map<string, Identity[]>()
  for (const i of identities) {
    /* A surname with no first name identifies a family, not a person — never a link target. */
    if (i.evidence?.name_incomplete) continue
    const k = `${i.normalized_name}|${i.state}`
    if (!byNameState.has(k)) byNameState.set(k, [])
    byNameState.get(k)!.push(i)
    const sk = `${i.last_name}|${i.state}`
    if (!bySurnameState.has(sk)) bySurnameState.set(sk, [])
    bySurnameState.get(sk)!.push(i)
  }
  console.log(`identities available to match: ${[...byNameState.values()].reduce((n, v) => n + v.length, 0)}`)

  type Bout = { athlete_name: string; athlete_club: string | null; event_name: string; source_file: string | null }
  const bouts = await page<Bout>(SOURCE, "athlete_name, athlete_club, event_name, source_file")
  console.log(`bout rows read: ${bouts.length}`)

  type Alias = { raw: string; team: string; norm: string; bouts: number; female: boolean; events: Set<string> }
  const aliases = new Map<string, Alias>()
  for (const b of bouts) {
    const team = String(b.athlete_club ?? "").trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(team)) continue
    const raw = String(b.athlete_name ?? "").trim()
    if (!raw) continue
    const key = `${raw}|${team}`
    if (!aliases.has(key)) {
      aliases.set(key, { raw, team, norm: nn(raw), bouts: 0, female: false, events: new Set() })
    }
    const a = aliases.get(key)!
    a.bouts++
    a.events.add(b.event_name)
    /*
     * Stated, not inferred: a Fargo women's bracket is its own event, and a girls' collection file
     * says so in its name. The NHSCA and Super 32 event names cover both genders and prove nothing.
     */
    if (/women|girls/i.test(String(b.event_name)) || /girls|women/i.test(String(b.source_file ?? ""))) {
      a.female = true
    }
  }
  console.log(`aliases carrying a state code: ${aliases.size}`)

  const rows: Array<Record<string, unknown>> = []
  const tally = { exact: 0, fuzzy: 0, review: 0, none: 0, exactBouts: 0, fuzzyBouts: 0 }
  const reviewSamples: string[] = []

  for (const a of aliases.values()) {
    const narrow = (cands: Identity[]) => {
      if (cands.length <= 1) return cands
      /* Only a known gender narrows; an unknown one must not be read as male. */
      if (a.female) return cands.filter((c) => c.gender === "Female")
      return cands
    }
    let method: string | null = null
    let score = 0
    let cands = narrow(byNameState.get(`${a.norm}|${a.team}`) ?? [])
    if (cands.length === 1) { method = "exact_name_state"; score = 100 }
    if (!method && cands.length === 0) {
      const surname = a.norm.split(" ").slice(-1)[0]
      const loose = (bySurnameState.get(`${surname}|${a.team}`) ?? []).filter((c) =>
        namesLikelySamePerson(String(c.normalized_name), a.norm),
      )
      cands = narrow(loose)
      if (cands.length === 1) { method = "fuzzy_surname_state"; score = 80 }
    }

    if (method && cands.length === 1) {
      if (method === "exact_name_state") { tally.exact++; tally.exactBouts += a.bouts } else { tally.fuzzy++; tally.fuzzyBouts += a.bouts }
      rows.push({
        identity_id: cands[0].id,
        source: SOURCE,
        alias_name_raw: a.raw,
        alias_team: a.team,
        alias_name_norm: a.norm,
        status: "linked",
        method,
        score,
        matcher_version: MATCHER,
        candidates: { bouts: a.bouts, events: [...a.events].slice(0, 8), gender_known: a.female ? "Female" : null },
      })
      continue
    }
    if (cands.length > 1) {
      tally.review++
      if (reviewSamples.length < 8) {
        reviewSamples.push(`${a.raw} (${a.team}) -> ${cands.map((c) => `${c.normalized_name} ${c.gender} ${c.graduation_year ?? "?"}`).join(" | ")}`)
      }
      rows.push({
        identity_id: cands[0].id,
        source: SOURCE,
        alias_name_raw: a.raw,
        alias_team: a.team,
        alias_name_norm: a.norm,
        status: "review",
        method: "ambiguous",
        score: 50,
        matcher_version: MATCHER,
        candidates: {
          bouts: a.bouts,
          gender_known: a.female ? "Female" : null,
          options: cands.map((c) => ({ identity_id: c.id, name: c.normalized_name, gender: c.gender, grad_year: c.graduation_year })),
        },
      })
      continue
    }
    tally.none++
  }

  console.log(`\n   exact  name+state -> one identity : ${tally.exact}  (${tally.exactBouts} bouts)`)
  console.log(`   fuzzy  surname    -> one identity : ${tally.fuzzy}  (${tally.fuzzyBouts} bouts)`)
  console.log(`   ambiguous, written as review      : ${tally.review}`)
  for (const r of reviewSamples) console.log(`      ${r}`)
  console.log(`   no identity on file               : ${tally.none}`)
  const linkedBouts = tally.exactBouts + tally.fuzzyBouts
  console.log(`\nwould resolve ${tally.exact + tally.fuzzy} aliases covering ${linkedBouts} of ${bouts.length} bout rows (${Math.round((100 * linkedBouts) / bouts.length)}%)`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }

  let done = 0
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error } = await sb.from("identity_aliases").upsert(batch as never, { onConflict: "source,alias_name_raw,alias_team" })
    if (error) {
      const { error: e2 } = await sb.from("identity_aliases").insert(batch as never)
      if (e2) { console.error(`batch at ${i} FAILED:`, e2.message); return }
    }
    done += batch.length
    if (done % 2500 === 0 || done === rows.length) console.log(`   written ${done}/${rows.length}`)
  }
  const { count } = await sb.from("identity_aliases").select("id", { count: "exact", head: true })
  console.log(`\nidentity_aliases now holds ${count} rows`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
