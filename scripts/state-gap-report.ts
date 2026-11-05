#!/usr/bin/env npx tsx
/**
 * What each state is missing, as an ask Muse can act on without a conversation.
 *
 *   npx tsx --env-file=.env.local scripts/state-gap-report.ts            # every state
 *   ...                                               --state TN         # one
 *   ...                                               --out <file.md>    # write the ask
 *
 * Why this exists: every state turned into the same exchange - Matt asks what is missing, I run
 * something, find one gap, report it, and a day later find a different gap in the same state that
 * nobody had thought to look for. The checklist was living in my head and being rebuilt each time.
 * Every gap type we have hit is enumerated here, so a state is examined the same way every time and
 * the output is the message, not a table someone then has to interpret.
 *
 * Cheap on purpose: counts and narrow selects, keyset-paged. It does NOT read every bout row to
 * check mirroring - that is a quarter of a million rows and belongs in all-states-launch-sweep.ts
 * before a launch decision, not in a routine status check. Running that six times in an afternoon
 * is part of how the database ran out of connections on 4 Nov 2026.
 */
import fs from "fs"
import path from "path"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { RECRUITING_BRAND } from "@/lib/recruiting/brand"
import { HOME_STATE, inState } from "@/lib/recruiting/states"
import { championshipKeySlug } from "@/lib/athlete-state"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const arg = (k: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null)
const ONLY = arg("--state")?.toUpperCase() ?? null
const OUT = arg("--out")

/** Keyset paging: never OFFSET. See lib/state-placers.ts for what OFFSET cost us. */
async function pageById<T extends { id: string }>(build: () => any, label: string): Promise<T[]> {
  const out: T[] = []
  let after: string | null = null
  for (;;) {
    let q = build().order("id", { ascending: true }).limit(1000)
    if (after) q = q.gt("id", after)
    const { data, error } = await q
    if (error) throw new Error(`${label}: ${error.message}`)
    const rows = (data ?? []) as T[]
    out.push(...rows)
    if (rows.length < 1000) return out
    after = rows[rows.length - 1]!.id
  }
}

const CURRENT_CLASSES = [2027, 2030] as const
const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "")
const who = (r: any) => `${norm(r.wrestler_name)}|${/^f|girl/i.test(String(r.gender)) ? "g" : "b"}`

type Gap = { kind: string; need: string; size: number }

type StateReport = {
  code: string
  name: string
  live: boolean
  seasons: Map<number, { placed: number; qualifiers: number }>
  placedTotal: number
  qualTotal: number
  placedWithYear: number
  qualWithYear: number
  unknownLatest: number
  latestSeason: number
  ceiling: number
  profiles: number
  boutSides: number
  fsgrYears: number[]
  associations: string[]
  gaps: Gap[]
}

async function examine(code: string, name: string, live: boolean): Promise<StateReport> {
  const isHome = code === HOME_STATE
  /*
   * The home state keeps its championship results in `wrestling_nchsaa_results`, not in
   * `state_tournament_placers`, and that table holds no qualifiers and no class year - the year
   * lives on the profile. Reading the usual table reported North Carolina, the baseline state with
   * 1,021 profiles, as having no results at all.
   */
  const rows = isHome
    ? (
        await pageById<any>(
          () => sb.from("wrestling_nchsaa_results").select("id,year,place,classification,wrestler_name"),
          "NC results",
        )
      ).map((r) => ({
        ...r,
        season: r.year,
        grad_year: null,
        gender: null,
        association: r.classification === "NCISA" ? "NCISA" : "NCHSAA",
      }))
    : await pageById<any>(
        () =>
          sb
            .from("state_tournament_placers")
            .select("id,season,place,grad_year,association,wrestler_name,gender")
            .eq("state", code),
        `${code} placers`,
      )
  const placed = rows.filter((r) => r.place != null)
  const quals = rows.filter((r) => r.place == null)
  const seasons = new Map<number, { placed: number; qualifiers: number }>()
  for (const r of rows) {
    const s = Number(r.season)
    const e = seasons.get(s) ?? { placed: 0, qualifiers: 0 }
    r.place != null ? e.placed++ : e.qualifiers++
    seasons.set(s, e)
  }
  const latestSeason = Math.max(0, ...rows.map((r) => Number(r.season) || 0))
  const noYearLatest = new Set(rows.filter((r) => !r.grad_year && Number(r.season) === latestSeason).map(who))
  /*
   * The ceiling counts only wrestlers seen in the last TWO seasons. The mint chain creates
   * profiles from those and merely links the season before, because a wrestler who appears once
   * three seasons ago and never again has usually left the sport or the state - minting him gives
   * a page nothing will ever update. Counting him made the report nag about work nobody intends
   * to do: Georgia showed 59 "mintable and not minted" and all 59 were 2024-only, held on purpose.
   */
  const recentSeasons = [latestSeason, latestSeason - 1]
  const ceiling = new Set(
    rows
      .filter((r) => recentSeasons.includes(Number(r.season)))
      .filter((r) => Number(r.grad_year) >= CURRENT_CLASSES[0] && Number(r.grad_year) <= CURRENT_CLASSES[1])
      .map(who),
  ).size

  const { count: profiles } = await inState(sb.from("athletes").select("*", { count: "exact", head: true }), code)
    .gte("graduationyear", CURRENT_CLASSES[0])
    .lte("graduationyear", CURRENT_CLASSES[1])

  /*
   * Bout keys are named for the ASSOCIATION, not the state code - Tennessee's are
   * `tssaa-states-*`, which contain no "tn" at all. Matching on the code reported a state with
   * 7,728 bout sides as having no ledger, which is the kind of false alarm this whole script
   * exists to stop. The prefixes come from the state's own associations, through the same
   * `championshipKeySlug` the importer uses, plus the freestyle/Greco layer.
   */
  const assocPrefixes = new Set<string>([`${code.toLowerCase()}-usaw-states-`])
  for (const a of new Set(rows.map((r) => String(r.association ?? "")).filter(Boolean))) {
    const slug = championshipKeySlug(code, a)
    if (slug) assocPrefixes.add(`${slug}-states-`)
  }
  if (isHome) for (const a of ["NCHSAA", "NCISA"]) {
    const slug = championshipKeySlug(code, a)
    if (slug) assocPrefixes.add(`${slug}-states-`)
  }
  let boutSides = 0
  for (const prefix of assocPrefixes) {
    const { count } = await sb.from("other_tournament_bouts").select("id", { count: "exact", head: true }).like("event_key", `${prefix}%`)
    boutSides += count ?? 0
  }

  const fsgr = await pageById<any>(
    () => sb.from("other_tournament_bouts").select("id,year").like("event_key", `${code.toLowerCase()}-usaw-states-%`),
    `${code} fs/gr`,
  )
  const fsgrYears = [...new Set(fsgr.map((r) => Number(r.year)))].sort()

  return {
    code,
    name,
    live,
    seasons,
    placedTotal: placed.length,
    qualTotal: quals.length,
    placedWithYear: placed.filter((r) => r.grad_year).length,
    qualWithYear: quals.filter((r) => r.grad_year).length,
    unknownLatest: noYearLatest.size,
    latestSeason,
    ceiling,
    profiles: profiles ?? 0,
    boutSides: boutSides ?? 0,
    fsgrYears,
    associations: [...new Set(rows.map((r) => String(r.association)).filter(Boolean))],
    gaps: [],
  }
}

/** Every gap type we have ever found, applied the same way to every state. */
function findGaps(r: StateReport, peerEntrantsPerSeason: number, isHome: boolean) {
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 100)
  /*
   * The home state's results table carries no qualifiers and no class year, so the class-year and
   * partial-field checks have nothing to read and would only ever produce false alarms. Its ledger
   * and freestyle/Greco coverage are still checked, because those are real questions for it too.
   */
  if (isHome) {
    if (!r.boutSides) r.gaps.push({ kind: "no bout ledger", need: "the state championship bout ledger", size: r.placedTotal })
    const wanted = [r.latestSeason, r.latestSeason - 1, r.latestSeason - 2].filter((y) => y > 2000)
    const missingFs = wanted.filter((y) => !r.fsgrYears.includes(y))
    if (missingFs.length) {
      r.gaps.push({
        kind: "freestyle/Greco years",
        need: `freestyle & Greco for ${missingFs.join(", ")}${r.fsgrYears.length ? ` (we hold ${r.fsgrYears.join(", ")})` : ""}`,
        size: 150 * missingFs.length,
      })
    }
    return
  }

  if (!r.placedTotal && !r.qualTotal) {
    r.gaps.push({ kind: "no results at all", need: "the state championship results for the last three seasons, placers and qualifiers", size: 1 })
    return
  }
  const qualPct = pct(r.qualWithYear, r.qualTotal)
  if (r.qualTotal && qualPct < 60) {
    r.gaps.push({
      kind: "qualifier class years",
      need: `class years for the ${r.qualTotal - r.qualWithYear} qualifier rows with none (${qualPct}% covered). ${r.unknownLatest} of those wrestlers competed in ${r.latestSeason} — those are the ones that become profiles.`,
      size: r.unknownLatest,
    })
  }
  const placedPct = pct(r.placedWithYear, r.placedTotal)
  if (r.placedTotal && placedPct < 90) {
    r.gaps.push({
      kind: "placed class years",
      need: `class years for the ${r.placedTotal - r.placedWithYear} PLACED rows with none (${placedPct}% covered). Credential accuracy, not profile count.`,
      size: r.placedTotal - r.placedWithYear,
    })
  }
  if (!r.boutSides && r.placedTotal) {
    r.gaps.push({ kind: "no bout ledger", need: `the bout ledger for all ${r.seasons.size} seasons — ${r.placedTotal} placed rows with no matches behind them`, size: r.placedTotal })
  }
  const seasonsWanted = [r.latestSeason, r.latestSeason - 1, r.latestSeason - 2].filter((y) => y > 2000)
  const missingSeasons = seasonsWanted.filter((y) => !r.seasons.has(y))
  if (missingSeasons.length) {
    r.gaps.push({ kind: "missing seasons", need: `no results at all for ${missingSeasons.join(", ")}`, size: 500 * missingSeasons.length })
  }
  // A season far thinner than the peer average is a partial field, not a small state.
  for (const [season, e] of [...r.seasons].sort()) {
    const total = e.placed + e.qualifiers
    if (peerEntrantsPerSeason && total < peerEntrantsPerSeason * 0.55) {
      r.gaps.push({
        kind: "field looks partial",
        need: `${season} holds ${total} entrants (${e.placed} placed, ${e.qualifiers} qualifiers) against a ${Math.round(peerEntrantsPerSeason)} average elsewhere — confirm every division and both genders were captured, or say it is genuinely this small`,
        size: Math.round(peerEntrantsPerSeason - total),
      })
    }
  }
  if (!r.fsgrYears.length) {
    r.gaps.push({ kind: "no freestyle/Greco", need: "the USA Wrestling freestyle & Greco state championships, 16U and Junior, both genders", size: 300 })
  } else {
    const missingFs = seasonsWanted.filter((y) => !r.fsgrYears.includes(y))
    if (missingFs.length) r.gaps.push({ kind: "freestyle/Greco years", need: `freestyle & Greco for ${missingFs.join(", ")} (we hold ${r.fsgrYears.join(", ")})`, size: 150 * missingFs.length })
  }
  if (r.ceiling - r.profiles > 25) {
    r.gaps.push({ kind: "mine to fix — unminted", need: `${r.ceiling - r.profiles} wrestlers in a current class with no profile. A mint I owe, not data you owe.`, size: r.ceiling - r.profiles })
  }
}

function render(reports: StateReport[]): string {
  const out: string[] = []
  const A = (s = "") => out.push(s)
  A("# What each state is missing")
  A("")
  A(`Generated by \`scripts/state-gap-report.ts\` on ${new Date().toISOString().slice(0, 10)}. Every state is`)
  A("checked for the same list of gaps, so this does not change shape from one state to the next.")
  A("Ordered by the number of profiles the fix would create.")
  A("")
  A("| State | Live | Profiles | Possible | Placers | Qualifiers | Qual yrs | Bout sides | Gaps |")
  A("|---|---|---|---|---|---|---|---|---|")
  for (const r of reports) {
    const qp = r.qualTotal ? Math.round((r.qualWithYear / r.qualTotal) * 100) : 100
    A(
      `| ${r.code} | ${r.live ? "yes" : "no"} | ${r.profiles} | ${r.ceiling} | ${r.placedTotal} | ${r.qualTotal} | ${qp}% | ${r.boutSides.toLocaleString()} | ${r.gaps.length} |`,
    )
  }
  A("")
  for (const r of reports.filter((x) => x.gaps.length)) {
    A(`## ${r.name} (${r.code})${r.live ? " — LIVE" : ""}`)
    A("")
    A(
      r.code === HOME_STATE
        ? `Home state: results live in wrestling_nchsaa_results, ${r.placedTotal} placed rows across ${[...r.seasons.keys()].sort().join(", ")}; ${r.associations.join(", ")}. ${r.profiles} profiles. It holds no qualifier rows and no class years on results, so those checks do not apply.`
        : `Holds ${r.placedTotal} placed and ${r.qualTotal} qualifier rows across ${[...r.seasons.keys()].sort().join(", ") || "no seasons"}; ${r.associations.join(", ") || "no association recorded"}. ${r.profiles} profiles against a possible ${r.ceiling}.`,
    )
    A("")
    for (const g of r.gaps.sort((a, b) => b.size - a.size)) A(`- **${g.kind}** — ${g.need}`)
    A("")
  }
  const clean = reports.filter((x) => !x.gaps.length).map((x) => x.code)
  if (clean.length) {
    A(`## Nothing missing`)
    A("")
    A(clean.join(", "))
    A("")
  }
  return out.join("\n")
}

async function main() {
  const states = RECRUITING_BRAND.states.filter((s) => !ONLY || s.code === ONLY)
  const reports: StateReport[] = []
  for (const s of states) {
    process.stderr.write(`  ${s.code}\r`)
    reports.push(await examine(s.code, s.name, Boolean(s.live)))
  }
  // Peer baseline: the median entrants-per-season across states that have any, so "thin" means
  // thin next to what a state tournament normally yields, not next to the biggest state.
  const perSeason = reports
    .flatMap((r) => [...r.seasons.values()].map((e) => e.placed + e.qualifiers))
    .filter((n) => n > 0)
    .sort((a, b) => a - b)
  const median = perSeason.length ? perSeason[Math.floor(perSeason.length / 2)]! : 0
  for (const r of reports) findGaps(r, median, r.code === HOME_STATE)
  reports.sort((a, b) => Math.max(0, ...b.gaps.map((g) => g.size)) - Math.max(0, ...a.gaps.map((g) => g.size)))
  const md = render(reports)
  if (OUT) {
    fs.writeFileSync(OUT, md)
    console.log(`wrote ${OUT} — ${reports.filter((r) => r.gaps.length).length} state(s) with gaps, median season ${median} entrants`)
  } else {
    console.log(md)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
