#!/usr/bin/env npx tsx
/**
 * Go / no-go for opening a state to college coaches. Read-only.
 *
 *   npx tsx scripts/state-readiness.ts --state SC
 *
 * Runs the measurable half of docs/STATE-LAUNCH-CHECKLIST.md for one state, side by side with North
 * Carolina, which is the standard. GATE rows must pass before `live: true` in lib/recruiting/brand.ts;
 * INFO rows are reported, not blocking. Every failing GATE prints the rows behind it, so a fix starts
 * from names, not a percentage.
 *
 * Written 17 Oct 2026 after South Carolina's pre-launch check found, by hand, a state champion with no
 * state and a namesake's 2021 NC result on his profile (Alex Johnson, Catawba Ridge).
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { HOME_STATE, inState, normalizeStateCode } from "../lib/recruiting/states"

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

const STATE = normalizeStateCode(process.argv.find((a) => a.startsWith("--state="))?.split("=")[1] ?? process.argv[process.argv.indexOf("--state") + 1])
if (!STATE) {
  console.error("Usage: npx tsx scripts/state-readiness.ts --state SC")
  process.exit(1)
}

/** The class that are seniors this season: a season runs July to June. */
const now = new Date()
const SENIORS = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
const CURRENT = [SENIORS, SENIORS + 1, SENIORS + 2, SENIORS + 3]

type Athlete = {
  id: string
  name: string | null
  graduationyear: number | string | null
  gender: string | null
  highschool: string | null
  state: string | null
  is_nc_athlete: boolean | null
  claimed_by_user_id: string | null
  photourl: string | null
}
/** One placement, from whichever table holds the state's championship. */
type Placement = { id: string; season: number; place: number | null; name: string; school: string | null; athlete_id: string | null; grad_year: number | null; weight: string | null }

async function all<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

const ATHLETE_COLS = "id,name,graduationyear,gender,highschool,state,is_nc_athlete,claimed_by_user_id,photourl"

async function athletesOf(state: string): Promise<Athlete[]> {
  return all<Athlete>((f, t) => inState(sb.from("athletes").select(ATHLETE_COLS), state).range(f, t) as never)
}

/** NC's championship lives in wrestling_nchsaa_results; every other state's in state_tournament_placers. */
async function placementsOf(state: string): Promise<Placement[]> {
  if (state === HOME_STATE) {
    const rows = await all<Record<string, unknown>>((f, t) =>
      sb.from("wrestling_nchsaa_results").select("id,year,place,wrestler_name,school,athlete_id,weight_class").not("place", "is", null).range(f, t),
    )
    return rows.map((r) => ({
      id: String(r.id),
      season: Number(r.year),
      place: r.place == null ? null : Number(r.place),
      name: String(r.wrestler_name ?? ""),
      school: (r.school as string) ?? null,
      athlete_id: (r.athlete_id as string) ?? null,
      grad_year: null,
      weight: (r.weight_class as string) ?? null,
    }))
  }
  const rows = await all<Record<string, unknown>>((f, t) =>
    sb.from("state_tournament_placers").select("id,season,place,wrestler_name,school_clean,school_raw,athlete_id,grad_year,weight").eq("state", state).range(f, t),
  )
  return rows.map((r) => ({
    id: String(r.id),
    season: Number(r.season),
    place: r.place == null ? null : Number(r.place),
    name: String(r.wrestler_name ?? ""),
    school: ((r.school_clean ?? r.school_raw) as string) ?? null,
    athlete_id: (r.athlete_id as string) ?? null,
    grad_year: r.grad_year == null ? null : Number(r.grad_year),
    weight: (r.weight as string) ?? null,
  }))
}

type Link = { athlete_id: string; season: number; source: string; independent: boolean; label: string }

/** Every placement linked to these profiles, from both championship tables. */
async function linkedPlacements(ids: string[]): Promise<Link[]> {
  const out: Link[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const [nc, other] = await Promise.all([
      sb.from("wrestling_nchsaa_results").select("athlete_id,year,school,classification,place").in("athlete_id", chunk),
      sb.from("state_tournament_placers").select("athlete_id,season,state,association,school_clean,school_raw,place").in("athlete_id", chunk),
    ])
    for (const r of nc.data ?? []) out.push({ athlete_id: r.athlete_id, season: Number(r.year), source: "NC", independent: r.classification === "NCISA", label: `NC ${r.year} ${r.classification ?? ""} #${r.place ?? "?"} ${r.school ?? ""}`.trim() })
    for (const r of other.data ?? [])
      out.push({ athlete_id: r.athlete_id, season: Number(r.season), source: r.state, independent: /ISA$/i.test(r.association ?? ""), label: `${r.state} ${r.season} #${r.place ?? "?"} ${r.school_clean ?? r.school_raw ?? ""}`.trim() })
  }
  // The same placement can sit in a table twice; report it once.
  return [...new Map(out.map((l) => [`${l.athlete_id}|${l.label}`, l])).values()]
}

const key = (name: string | null, year: unknown) => `${String(name ?? "").toLowerCase().replace(/\s+/g, " ").trim()}|${year ?? ""}`
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 100)

type Row = { check: string; kind: "GATE" | "INFO"; value: string; baseline?: string; pass: boolean; detail?: string[] }

async function measure(state: string) {
  const athletes = await athletesOf(state)
  const current = athletes.filter((a) => CURRENT.includes(Number(a.graduationyear)))
  const placements = await placementsOf(state)
  const latest = Math.max(0, ...placements.map((p) => p.season))
  // Placers only: NC records qualifiers as place 0 and SC's file lists every entrant with no place.
  const latestPlacers = placements.filter((p) => p.season === latest && p.place != null && p.place >= 1 && p.place <= 6 && (p.grad_year == null || p.grad_year >= SENIORS))
  const byId = new Map(athletes.map((a) => [a.id, a]))

  // Profiles a coach should reach: linked to a placement in the last two seasons.
  const recentIds = new Set(placements.filter((p) => p.athlete_id && p.season >= latest - 1).map((p) => p.athlete_id!))

  // Every profile linked to this state's championship must count for this state.
  const linkedIds = [...new Set(placements.map((p) => p.athlete_id).filter(Boolean) as string[])]
  const wrongState: string[] = []
  for (let i = 0; i < linkedIds.length; i += 200) {
    const { data } = await sb.from("athletes").select("id,name,state,is_nc_athlete,graduationyear").in("id", linkedIds.slice(i, i + 200))
    for (const a of data ?? []) {
      const counts = a.is_nc_athlete === true ? HOME_STATE : normalizeStateCode(a.state)
      // A graduate is not this check's business, and a recorded other state is a decision (a move:
      // Jack Harty, NC champion now at a Connecticut prep school, is CT by Matt's ruling, 17 Oct 2026).
      // What this catches is a champion with no state at all, invisible in every state's lists.
      if (counts || Number(a.graduationyear) < SENIORS) continue
      wrongState.push(`${a.name} (${a.graduationyear ?? "no class"}) has no state · ${a.id}`)
    }
  }

  // A result before the wrestler's freshman season belongs to someone else, or carries a wrong class
  // year. Independent schools (NCISA, SCISA) let 7th and 8th graders wrestle varsity, so those two
  // seasons are a review list there, not a failure; anything earlier fails everywhere.
  const links = await linkedPlacements(current.map((a) => a.id))
  const line = (l: Link) => `${byId.get(l.athlete_id)?.name} (class ${byId.get(l.athlete_id)?.graduationyear}) carries ${l.label} · ${l.athlete_id}`
  const yearsEarly = (l: Link) => Number(byId.get(l.athlete_id)?.graduationyear) - 3 - l.season
  const namesakes = links.filter((l) => yearsEarly(l) > (l.independent ? 2 : 0)).map(line)
  const middleSchool = links.filter((l) => l.independent && yearsEarly(l) > 0 && yearsEarly(l) <= 2).map(line)
  // Out of state NC results on a non-NC profile: possible (a move), never assumed.
  const crossState =
    state === HOME_STATE
      ? []
      : links.filter((l) => l.source === HOME_STATE).map((l) => `${byId.get(l.athlete_id)?.name} carries ${l.label} · ${l.athlete_id}`)

  const dupCount = new Map<string, Athlete[]>()
  for (const a of current) dupCount.set(key(a.name, a.graduationyear), [...(dupCount.get(key(a.name, a.graduationyear)) ?? []), a])
  const dups = [...dupCount.values()].filter((v) => v.length > 1).map((v) => `${v[0].name} (${v[0].graduationyear}) × ${v.length}: ${v.map((a) => a.id).join(", ")}`)

  const recentNoClass = athletes.filter((a) => recentIds.has(a.id) && !a.graduationyear)
  const unlinked = latestPlacers.filter((p) => !p.athlete_id)

  return {
    state,
    latest,
    rows: [
      {
        check: `${latest} placers (not graduated) with a profile`,
        kind: "GATE",
        value: `${pct(latestPlacers.length - unlinked.length, latestPlacers.length)}% (${latestPlacers.length - unlinked.length}/${latestPlacers.length})`,
        pass: pct(latestPlacers.length - unlinked.length, latestPlacers.length) >= 90,
        detail: unlinked.map((p) => `${p.name}, ${p.school ?? "?"}, ${p.weight ?? "?"} #${p.place ?? "?"}`),
      },
      {
        check: "Recent placers' profiles missing a class year",
        kind: "GATE",
        value: `${recentNoClass.length} of ${recentIds.size}`,
        pass: pct(recentNoClass.length, recentIds.size) <= 5,
        detail: recentNoClass.map((a) => `${a.name}, ${a.highschool ?? "?"} · ${a.id}`),
      },
      { check: "Championship-linked profiles with no state", kind: "GATE", value: String(wrongState.length), pass: wrongState.length === 0, detail: wrongState },
      { check: "Results too early for the class year (namesake or wrong class)", kind: "GATE", value: String(namesakes.length), pass: namesakes.length === 0, detail: namesakes },
      { check: "Independent-school results from 7th/8th grade (check class year)", kind: "INFO", value: String(middleSchool.length), pass: true, detail: middleSchool },
      { check: "NC results on this state's profiles (review each)", kind: "GATE", value: String(crossState.length), pass: crossState.length === 0, detail: crossState },
      { check: "Duplicate profiles (same name and class)", kind: "GATE", value: String(dups.length), pass: dups.length === 0, detail: dups },
      {
        check: "Current-class profiles with a school",
        kind: "GATE",
        value: `${pct(current.filter((a) => a.highschool).length, current.length)}%`,
        pass: pct(current.filter((a) => a.highschool).length, current.length) >= 98,
        detail: current.filter((a) => !a.highschool).map((a) => `${a.name} · ${a.id}`),
      },
      {
        check: "Current-class profiles with a gender",
        kind: "GATE",
        value: `${pct(current.filter((a) => a.gender).length, current.length)}%`,
        pass: current.every((a) => a.gender),
        detail: current.filter((a) => !a.gender).map((a) => `${a.name} · ${a.id}`),
      },
      { check: "Profiles in current classes", kind: "INFO", value: `${current.length} (${CURRENT.map((y) => `${y}: ${current.filter((a) => Number(a.graduationyear) === y).length}`).join(", ")})`, pass: true },
      { check: "Girls in current classes", kind: "INFO", value: String(current.filter((a) => /^f/i.test(a.gender ?? "")).length), pass: true },
      { check: "Claimed by a family (coaches can message)", kind: "INFO", value: `${pct(current.filter((a) => a.claimed_by_user_id).length, current.length)}%`, pass: true },
      { check: "With a photo", kind: "INFO", value: `${pct(current.filter((a) => a.photourl).length, current.length)}%`, pass: true },
      { check: "All profiles with no class year", kind: "INFO", value: String(athletes.filter((a) => !a.graduationyear).length), pass: true },
    ] as Row[],
  }
}

async function main() {
  const [target, base] = await Promise.all([measure(STATE!), STATE === HOME_STATE ? null : measure(HOME_STATE)])
  console.log(`\n${STATE} go / no-go · seniors are the class of ${SENIORS} · latest ${STATE} championship ${target.latest}${base ? ` · baseline NC (${base.latest})` : ""}\n`)
  const w = Math.max(...target.rows.map((r) => r.check.length))
  for (const [i, r] of target.rows.entries()) {
    const mark = r.kind === "INFO" ? "  ·  " : r.pass ? " PASS" : " FAIL"
    const nc = base ? `   NC: ${base.rows[i].value}` : ""
    console.log(`${mark}  ${r.kind}  ${r.check.padEnd(w)}  ${r.value}${nc}`)
  }
  const failed = target.rows.filter((r) => r.kind === "GATE" && !r.pass)
  const listed = process.argv.includes("--all") ? target.rows.filter((r) => !r.pass || r.detail?.length) : failed
  for (const r of listed) {
    console.log(`\n${r.check}:`)
    for (const d of (r.detail ?? []).slice(0, 40)) console.log(`  - ${d}`)
    if ((r.detail?.length ?? 0) > 40) console.log(`  … and ${r.detail!.length - 40} more`)
  }
  console.log(
    failed.length
      ? `\nNO-GO on data: ${failed.length} gate${failed.length === 1 ? "" : "s"} failing. Then the manual half of docs/STATE-LAUNCH-CHECKLIST.md.`
      : `\nData gates pass. Now the manual half of docs/STATE-LAUNCH-CHECKLIST.md.`,
  )
  process.exit(failed.length ? 2 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
