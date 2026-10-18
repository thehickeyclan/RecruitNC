#!/usr/bin/env npx tsx
/**
 * National bouts that belong to a state's profiles but carry no athlete_id (Matt, 18 October 2026).
 *
 * South Carolina's profiles were minted from the 2026 state placers on 15 October. The identity
 * linker (scripts/link-our-bouts-by-identity.ts) only reaches wrestlers who are in the identity
 * registry, and most SC boys are not, so their national records stayed unattached: Sy Strobel —
 * two-time 3A champion, 4th at NHSCA 2025, a win over Carson Worrick at Super 32 2025 — had 44
 * national bouts on file and none on his profile. Only 46 of 161 SC boys had any.
 *
 * A bout is claimed only when all of these hold — a name alone is never enough
 * ([[check-weight-before-claiming-nc-kid]], [[club-state-is-not-wrestler-state]]):
 *   1. the bout's wrestler name is the profile's name (or its wrestling name), exactly;
 *   2. no other profile anywhere carries that name — two of a name go to review;
 *   3. the bout's team is the state's code, or names his school or club;
 *   4. its weight is within CLOSE_LB of a weight he is known to have made (state placement,
 *      high-school season, or an already-linked bout) within CLOSE_SEASONS seasons;
 *   5. it is a high-school event for his class (lib/high-school-window.ts).
 * Everything else is printed as held back, with the reason.
 *
 *   npx tsx scripts/link-state-profile-bouts.ts --state SC            # dry run
 *   npx tsx scripts/link-state-profile-bouts.ts --state SC --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { isHighSchoolEvent } from "../lib/high-school-window"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

const arg = (name: string) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const STATE = String(arg("--state") ?? "").toUpperCase()
const WRITE = process.argv.includes("--write")
const CLOSE_LB = 30
const CLOSE_SEASONS = 2
const STATE_NAMES: Record<string, string> = { SC: "south carolina", NC: "north carolina", GA: "georgia", VA: "virginia" }

if (!/^[A-Z]{2}$/.test(STATE) || STATE === "NC") {
  console.error("Usage: --state XX (not NC: North Carolina bouts are linked by scripts/link-our-bouts-by-identity.ts)")
  process.exit(1)
}

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[’'`.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

async function page<T>(table: string, select: string, f: (q: any) => any = (q) => q): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await f(sb.from(table).select(select)).order("id").range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

type Profile = {
  id: string
  name: string | null
  wrestling_name: string | null
  highschool: string | null
  wrestlingClub: string | null
  graduationyear: number | null
  gender: string | null
}
type Bout = {
  id: string
  event_key: string
  event_name: string | null
  event_date: string | null
  year: number | null
  weight_class: string | null
  athlete_name: string | null
  athlete_club: string | null
}

async function main() {
  console.log(`${WRITE ? "WRITING" : "DRY RUN — nothing is written"} · state ${STATE}\n`)

  const profiles = await page<Profile>(
    "athletes",
    'id, name, wrestling_name, highschool, "wrestlingClub", graduationyear, gender',
    (q) => q.eq("state", STATE).eq("is_nc_athlete", false),
  )
  console.log(`${STATE} profiles: ${profiles.length}`)

  // Every profile's names, every state: a second profile of the same name sends the bout to review.
  const allNames = await page<{ id: string; name: string | null; wrestling_name: string | null }>(
    "athletes",
    "id, name, wrestling_name",
  )
  const holders = new Map<string, Set<string>>()
  for (const a of allNames) {
    for (const n of [a.name, a.wrestling_name]) {
      const k = norm(n)
      if (!k) continue
      if (!holders.has(k)) holders.set(k, new Set())
      holders.get(k)!.add(a.id)
    }
  }

  // Weights each profile is known to have made, by season.
  const known = new Map<string, Array<{ weight: number; year: number }>>()
  const note = (id: string, weight: unknown, year: unknown) => {
    const w = Number(String(weight ?? "").match(/\d+/)?.[0])
    const y = Number(year)
    if (!w || !y) return
    if (!known.has(id)) known.set(id, [])
    known.get(id)!.push({ weight: w, year: y })
  }
  const ids = profiles.map((p) => p.id)
  for (let i = 0; i < ids.length; i += 100) {
    const slice = ids.slice(i, i + 100)
    const [{ data: placers }, { data: bouts }, { data: seasons }] = await Promise.all([
      sb.from("state_tournament_placers").select("athlete_id, weight, season").in("athlete_id", slice),
      sb.from("other_tournament_bouts").select("athlete_id, weight_class, year").in("athlete_id", slice).limit(5000),
      sb.from("matches").select("athlete_id, season, matches").in("athlete_id", slice),
    ])
    for (const r of placers ?? []) note(String(r.athlete_id), r.weight, r.season)
    for (const r of bouts ?? []) note(String(r.athlete_id), r.weight_class, r.year)
    for (const r of seasons ?? []) {
      const end = Number(String(r.season ?? "").split("-").pop())
      const list = Array.isArray(r.matches) ? (r.matches as Array<Record<string, unknown>>) : []
      for (const m of list) note(String(r.athlete_id), m.weight ?? m.weight_class, end)
    }
  }

  const claims: Array<{ boutId: string; athleteId: string }> = []
  const held: Array<{ who: string; why: string; n: number }> = []
  const claimedBy = new Map<string, { name: string; n: number; events: Set<string> }>()
  const stateName = STATE_NAMES[STATE] ?? ""

  for (const p of profiles) {
    const names = [...new Set([p.name, p.wrestling_name].map((n) => String(n ?? "").trim()).filter(Boolean))]
    const bouts: Bout[] = []
    for (const n of names) {
      const { data } = await sb
        .from("other_tournament_bouts")
        .select("id, event_key, event_name, event_date, year, weight_class, athlete_name, athlete_club")
        .ilike("athlete_name", n)
        .is("athlete_id", null)
        .limit(1000)
      bouts.push(...((data ?? []) as Bout[]))
    }
    if (!bouts.length) continue
    const label = `${p.name} (${p.highschool ?? "?"}, ${p.graduationyear ?? "?"})`

    const shared = names.some((n) => [...(holders.get(norm(n)) ?? [])].some((id) => id !== p.id))
    if (shared) {
      held.push({ who: label, why: "another profile has the same name", n: bouts.length })
      continue
    }

    const school = norm(p.highschool)
    const club = norm(p.wrestlingClub)
    const weights = known.get(p.id) ?? []
    const reasons = new Map<string, number>()
    const bump = (r: string) => reasons.set(r, (reasons.get(r) ?? 0) + 1)

    for (const b of bouts) {
      const team = norm(b.athlete_club)
      const teamOk =
        team === STATE.toLowerCase() ||
        (stateName && team === stateName) ||
        (school.length >= 4 && (team.includes(school) || school.includes(team) && team.length >= 4)) ||
        (club.length >= 4 && (team.includes(club) || club.includes(team) && team.length >= 4))
      if (!teamOk) {
        bump(`team "${b.athlete_club ?? ""}" is not ${STATE} or his school`)
        continue
      }
      if (!isHighSchoolEvent({ graduationYear: p.graduationyear, year: b.year, event: b.event_name, eventDate: b.event_date })) {
        bump("before high school")
        continue
      }
      const w = Number(String(b.weight_class ?? "").match(/\d+/)?.[0])
      const y = Number(b.year)
      if (!weights.length) {
        bump("no known weight to check against")
        continue
      }
      const fits = weights.some((k) => Math.abs(k.weight - w) <= CLOSE_LB && Math.abs(k.year - y) <= CLOSE_SEASONS)
      if (!fits) {
        bump(`${w} lb in ${y} does not fit his known weights`)
        continue
      }
      claims.push({ boutId: b.id, athleteId: p.id })
      const c = claimedBy.get(p.id) ?? { name: label, n: 0, events: new Set<string>() }
      c.n += 1
      c.events.add(b.event_key)
      claimedBy.set(p.id, c)
    }
    for (const [why, n] of reasons) held.push({ who: label, why, n })
  }

  console.log(`\nbouts claimed: ${claims.length} across ${claimedBy.size} profiles`)
  for (const c of [...claimedBy.values()].sort((a, b) => b.n - a.n)) {
    console.log(`   ${String(c.n).padStart(3)}  ${c.name}  ${[...c.events].sort().join(", ")}`)
  }
  console.log(`\nheld back:`)
  for (const h of held.sort((a, b) => a.who.localeCompare(b.who))) console.log(`   ${String(h.n).padStart(3)}  ${h.who} — ${h.why}`)

  if (!WRITE) {
    console.log("\nRe-run with --write.")
    return
  }
  // Every claim on disk first, so a write can be undone exactly: set athlete_id back to null on these ids.
  const logPath = `link-state-profile-bouts-${STATE}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`
  fs.writeFileSync(path.join(process.cwd(), "ranking-snapshots", logPath), JSON.stringify(claims, null, 1))
  console.log(`\nclaims logged to ranking-snapshots/${logPath}`)
  let written = 0
  const byAthlete = new Map<string, string[]>()
  for (const c of claims) byAthlete.set(c.athleteId, [...(byAthlete.get(c.athleteId) ?? []), c.boutId])
  for (const [athleteId, boutIds] of byAthlete) {
    for (let i = 0; i < boutIds.length; i += 200) {
      const { error, count } = await sb
        .from("other_tournament_bouts")
        .update({ athlete_id: athleteId }, { count: "exact" })
        .in("id", boutIds.slice(i, i + 200))
        .is("athlete_id", null)
      if (error) throw new Error(error.message)
      written += count ?? 0
    }
  }
  console.log(`\nwrote athlete_id on ${written} bouts`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
