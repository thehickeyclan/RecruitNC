#!/usr/bin/env npx tsx
/**
 * Go / no-go for opening a state to college coaches. Read-only. Every official placer must be
 * accounted for (Muse, 20 Oct 2026): a profile or a reason in docs/state-launch/<STATE>-accounted.json.
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
import { execSync } from "child_process"
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
type Placement = { id: string; season: number; place: number | null; name: string; school: string | null; athlete_id: string | null; grad_year: number | null; weight: string | null; association: string | null }

/** Callers order by id: unordered pages overlap and drop rows. */
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
  return all<Athlete>((f, t) => inState(sb.from("athletes").select(ATHLETE_COLS), state).order("id").range(f, t) as never)
}

/** NC's championship lives in wrestling_nchsaa_results; every other state's in state_tournament_placers. */
async function placementsOf(state: string): Promise<Placement[]> {
  if (state === HOME_STATE) {
    const rows = await all<Record<string, unknown>>((f, t) =>
      sb.from("wrestling_nchsaa_results").select("id,year,place,wrestler_name,school,athlete_id,weight_class,classification").not("place", "is", null).order("id").range(f, t),
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
      association: r.classification === "NCISA" ? "NCISA" : "NCHSAA",
    }))
  }
  const rows = await all<Record<string, unknown>>((f, t) =>
    sb.from("state_tournament_placers").select("id,season,place,wrestler_name,school_clean,school_raw,athlete_id,grad_year,weight,association").eq("state", state).order("id").range(f, t),
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
    association: (r.association as string | null) ?? null,
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
      out.push({ athlete_id: r.athlete_id, season: Number(r.season), source: r.state, independent: /(ISA|VISAA)$/i.test(r.association ?? ""), label: `${r.state} ${r.season} #${r.place ?? "?"} ${r.school_clean ?? r.school_raw ?? ""}`.trim() })
  }
  // The same placement can sit in a table twice; report it once.
  return [...new Map(out.map((l) => [`${l.athlete_id}|${l.label}`, l])).values()]
}

const key = (name: string | null, year: unknown) => `${String(name ?? "").toLowerCase().replace(/\s+/g, " ").trim()}|${year ?? ""}`
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 100)

type Row = { check: string; kind: "GATE" | "INFO"; value: string; baseline?: string; pass: boolean; detail?: string[] }

/*
 * Every official placer accounted for (Muse's review, 20 Oct 2026): the launch line says "every
 * state placer has a profile", so the gate is 100%, not 90%. A placer without a profile passes only
 * when docs/state-launch/<STATE>-accounted.json names him with a reason: graduated (no class year
 * on the placer row), duplicate, namesake, source-conflict or approved (a Matt-approved exception).
 * The same file names each class year left unresolved (at most 5%, each named) and each
 * pre-freshman result verified as a real 7th or 8th grade varsity result.
 */
/** The main checkout's ranking-snapshots/ when run from a git worktree (exports are untracked). */
function mainCheckoutSnapshots(): string | null {
  try {
    const common = execSync("git rev-parse --git-common-dir", { cwd: __dirname, encoding: "utf8" }).trim()
    return path.join(path.resolve(__dirname, common), "..", "ranking-snapshots")
  } catch {
    return null
  }
}

type Accounted = {
  placers?: Array<{ name: string; school?: string; season?: number; reason: "graduated" | "duplicate" | "namesake" | "source-conflict" | "approved"; note?: string }>
  classYearUnresolved?: Array<{ athleteId: string; note?: string }>
  preFreshmanVerified?: Array<{ athleteId: string; note?: string }>
  /**
   * A wrestler whose North Carolina results are genuine history, because he moved.
   *
   * The gate below treats an NC result on another state's profile as a possible mis-link, which
   * is right by default. It is not always wrong, though: Jack Harty won NCHSAA 4A titles at
   * Northern Guilford and now wrestles for Greens Farms Academy in Connecticut, so his profile
   * is a Connecticut profile carrying two real North Carolina championships. Naming him here
   * says that was checked, the way preFreshmanVerified does for an eighth-grade medal, instead
   * of leaving Connecticut permanently NO-GO on a fact about one transfer.
   */
  homeStateResultsVerified?: Array<{ athleteId: string; note?: string }>
}
function accountedFor(state: string): Accounted {
  // The repo this script lives in, then the working folder: the same answer wherever it is run.
  for (const root of [path.resolve(__dirname, ".."), process.cwd()]) {
    try {
      return JSON.parse(fs.readFileSync(path.join(root, "docs", "state-launch", `${state}-accounted.json`), "utf8")) as Accounted
    } catch {}
  }
  return {}
}
const nameKey = (n: string) => n.toLowerCase().replace(/[^a-z]/g, "")

/**
 * Each association's official placing depth (Muse: "the association's official placing depth, not
 * a universal 1st-6th"). NC's NCHSAA podium is four deep here (the profile scope Matt set), NCISA
 * six. Unlisted associations use 6 until the source manifest says otherwise.
 */
const PLACING_DEPTH: Record<string, number> = { NCHSAA: 4, NCISA: 6 }
/** Other states: the division's own places_awarded (SCHSL and SCISA award 4), else 6. */
const awarded = new Map<string, number>()
async function loadAwarded(state: string) {
  const { data } = await sb.from("state_tournament_divisions").select("season, association, places_awarded").eq("state", state)
  for (const d of data ?? []) if (d.places_awarded) awarded.set(`${d.season}|${String(d.association).toUpperCase()}`, Math.max(awarded.get(`${d.season}|${String(d.association).toUpperCase()}`) ?? 0, Number(d.places_awarded)))
}
const depthOf = (association: string | null, season?: number) =>
  PLACING_DEPTH[String(association ?? "").toUpperCase()] ?? awarded.get(`${season}|${String(association ?? "").toUpperCase()}`) ?? 6

async function measure(state: string) {
  const athletes = await athletesOf(state)
  const current = athletes.filter((a) => CURRENT.includes(Number(a.graduationyear)))
  await loadAwarded(state)
  const placements = await placementsOf(state)
  const latest = Math.max(0, ...placements.map((p) => p.season))
  // Placers only: NC records qualifiers as place 0 and SC's file lists every entrant with no place.
  const latestPlacers = placements.filter((p) => p.season === latest && p.place != null && p.place >= 1 && p.place <= depthOf(p.association, p.season) && (p.grad_year == null || p.grad_year >= SENIORS))
  const acct = accountedFor(state)
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
  const verifiedEarly = new Set((acct.preFreshmanVerified ?? []).map((v) => v.athleteId))
  const namesakes = links.filter((l) => yearsEarly(l) > (l.independent ? 2 : 0) && !verifiedEarly.has(l.athlete_id)).map(line)
  const middleSchool = links.filter((l) => l.independent && yearsEarly(l) > 0 && yearsEarly(l) <= 2).map(line)
  // Out of state NC results on a non-NC profile: possible (a move), never assumed.
  const verifiedHomeResults = new Set((acct.homeStateResultsVerified ?? []).map((v) => v.athleteId))
  const crossState =
    state === HOME_STATE
      ? []
      : links
          .filter((l) => l.source === HOME_STATE && !verifiedHomeResults.has(l.athlete_id))
          .map((l) => `${byId.get(l.athlete_id)?.name} carries ${l.label} · ${l.athlete_id}`)

  const dupCount = new Map<string, Athlete[]>()
  for (const a of current) dupCount.set(key(a.name, a.graduationyear), [...(dupCount.get(key(a.name, a.graduationyear)) ?? []), a])
  const dups = [...dupCount.values()].filter((v) => v.length > 1).map((v) => `${v[0].name} (${v[0].graduationyear}) × ${v.length}: ${v.map((a) => a.id).join(", ")}`)

  const recentNoClass = athletes.filter((a) => recentIds.has(a.id) && !a.graduationyear)
  const namedUnresolved = new Set((acct.classYearUnresolved ?? []).map((u) => u.athleteId))
  const unnamedNoClass = recentNoClass.filter((a) => !namedUnresolved.has(a.id))
  const unlinked = latestPlacers.filter((p) => !p.athlete_id)
  /*
   * A placer's class year often lives in the identity registry, not on the placer row (the
   * RankWrestlers import fills athlete_identities). A registry year before this year's seniors is
   * a graduate: accounted for. Same name and state, and the school must agree when the name is
   * shared, so a namesake's year is never borrowed.
   */
  const registryGrad = new Map<string, number>()
  const names = [...new Set(unlinked.map((p) => p.name.toLowerCase().replace(/\s+/g, " ").trim()))]
  for (let i = 0; i < names.length; i += 100) {
    const { data } = await sb.from("athlete_identities").select("normalized_name,primary_school,graduation_year").eq("state", state).in("normalized_name", names.slice(i, i + 100))
    const byName = new Map<string, Array<{ school: string | null; year: number | null }>>()
    for (const r of data ?? []) byName.set(r.normalized_name, [...(byName.get(r.normalized_name) ?? []), { school: r.primary_school, year: r.graduation_year }])
    for (const p of unlinked) {
      const hits = (byName.get(p.name.toLowerCase().replace(/\s+/g, " ").trim()) ?? []).filter((h) => h.year)
      const pick = hits.length === 1 ? hits[0] : hits.find((h) => h.school && p.school && nameKey(h.school) === nameKey(p.school))
      if (pick?.year) registryGrad.set(p.id, pick.year)
    }
  }
  /*
   * Graduates whose profiles were pruned (scripts/prune-graduated-profiles.ts exports each one,
   * with its class year, to ranking-snapshots/ before deleting it). Name and school must both agree.
   */
  const pruned = new Set<string>()
  // Pruned-profile exports are untracked, so they live in whichever checkout ran the prune: read both.
  for (const dir of [...new Set([path.join(process.cwd(), "ranking-snapshots"), path.resolve(__dirname, "..", "ranking-snapshots"), mainCheckoutSnapshots(), process.env.PRUNE_EXPORTS_DIR].filter(Boolean) as string[])]) {
    let files: string[] = []
    try {
      files = fs.readdirSync(dir).filter((f) => /^graduated-profiles-export-.*\.json$/.test(f))
    } catch {
      continue
    }
    for (const f of files) {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as { profiles?: Array<{ name?: string; highschool?: string; graduationyear?: number }> }
        for (const x of d.profiles ?? []) if (x.name && Number(x.graduationyear) < SENIORS) pruned.add(`${nameKey(x.name)}|${nameKey(x.highschool ?? "")}`)
      } catch {}
    }
  }
  const graduatedByRegistry = (p: Placement) => (registryGrad.get(p.id) ?? 9999) < SENIORS || pruned.has(`${nameKey(p.name)}|${nameKey(p.school ?? "")}`)
  const accountedPlacer = (p: Placement) =>
    (acct.placers ?? []).find((x) => nameKey(x.name) === nameKey(p.name) && (!x.season || x.season === p.season) && (!x.school || !p.school || nameKey(x.school) === nameKey(p.school)))
  const unaccounted = unlinked.filter((p) => !accountedPlacer(p) && !graduatedByRegistry(p))
  /*
   * Champions and finalists with no profile, listed by name whatever accounts for them.
   *
   * Vermont's Maxwell LaPerle - the 2026 state champion at 190 - had no class year in any Vermont
   * source. Naming him in the accounted file was enough to clear the gate above, so his absence
   * read as one more number in a passing line; the class year that settled it (three NHSCA grade
   * prints) was sitting in data the import already held. A missing state champion is the most
   * visible hole a state can have, so the latest season's top three are always printed by name,
   * and a graduation that nothing dates has to say what dates it.
   */
  const graduatedOnRow = (p: Placement) => p.grad_year != null && p.grad_year < SENIORS
  const topOfLatest = placements
    .filter((p) => p.season === latest && !p.athlete_id && (p.place ?? 0) >= 1 && (p.place ?? 99) <= 3)
    .map((p) => {
      const a = accountedPlacer(p)
      const why = a
        ? `${a.reason}${a.note ? ` - ${a.note}` : ""}`
        : graduatedOnRow(p)
          ? `graduated (class of ${p.grad_year})`
          : graduatedByRegistry(p)
            ? "graduated (identity registry)"
            : "UNACCOUNTED"
      return `${p.name}, ${p.school ?? "?"}, ${p.weight ?? "?"} #${p.place} - ${why}`
    })
  const asserted = unlinked
    .filter((p) => {
      const a = accountedPlacer(p)
      return a?.reason === "graduated" && !graduatedByRegistry(p) && !graduatedOnRow(p) && !String(a.note ?? "").trim()
    })
    .map((p) => `${p.name}, ${p.school ?? "?"}, ${p.weight ?? "?"} #${p.place ?? "?"} - "graduated" with no class year in any source and no note`)

  const reasons = new Map<string, number>()
  for (const p of unlinked) {
    const r = accountedPlacer(p)?.reason ?? (graduatedByRegistry(p) ? "graduated" : undefined)
    if (r) reasons.set(r, (reasons.get(r) ?? 0) + 1)
  }

  return {
    state,
    latest,
    rows: [
      {
        check: `${latest} official placers accounted for (profile or a named reason)`,
        kind: "GATE",
        value: `${latestPlacers.length - unaccounted.length}/${latestPlacers.length} · ${latestPlacers.length - unlinked.length} profiled${[...reasons].map(([r, n]) => `, ${n} ${r}`).join("")}`,
        pass: unaccounted.length === 0,
        detail: unaccounted.map((p) => `${p.name}, ${p.school ?? "?"}, ${p.weight ?? "?"} #${p.place ?? "?"}${p.association ? ` (${p.association})` : ""}`),
      },
      {
        check: "Recent placers' class years accounted for (≤ 5% unresolved, each named)",
        kind: "GATE",
        value: `${recentIds.size - unnamedNoClass.length}/${recentIds.size} · ${recentNoClass.length} unresolved (${pct(recentNoClass.length, recentIds.size)}%)`,
        pass: unnamedNoClass.length === 0 && pct(recentNoClass.length, recentIds.size) <= 5,
        detail: unnamedNoClass.map((a) => `${a.name}, ${a.highschool ?? "?"} · ${a.id}`),
      },
      {
        check: '"Graduated" placers with no dated source and no note',
        kind: "GATE",
        value: String(asserted.length),
        pass: asserted.length === 0,
        detail: asserted,
      },
      { check: `${latest} champions and finalists with no profile`, kind: "INFO", value: String(topOfLatest.length), pass: true, detail: topOfLatest },
      { check: "Championship-linked profiles with no state", kind: "GATE", value: String(wrongState.length), pass: wrongState.length === 0, detail: wrongState },
      { check: "Unexplained results before freshman year (namesake or wrong class)", kind: "GATE", value: String(namesakes.length), pass: namesakes.length === 0, detail: namesakes },
      { check: "Independent-school results from 7th/8th grade (check class year)", kind: "INFO", value: String(middleSchool.length), pass: true, detail: middleSchool },
      { check: "NC results on this state's profiles (unnamed)", kind: "GATE", value: String(crossState.length), pass: crossState.length === 0, detail: crossState },
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
    /*
     * The point of printing the rows is that a fix starts from names; forty of a hundred and
     * thirteen is a percentage again. --all prints them, which is what gets sent to Muse.
     */
    const limit = process.argv.includes("--all") ? Number.POSITIVE_INFINITY : 40
    for (const d of (r.detail ?? []).slice(0, limit)) console.log(`  - ${d}`)
    if ((r.detail?.length ?? 0) > limit) console.log(`  … and ${r.detail!.length - limit} more (--all to list them)`)
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
