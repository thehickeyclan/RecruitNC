#!/usr/bin/env npx tsx
/**
 * What results we hold, and where the holes are.
 *
 * Written because the answer kept being assembled by hand and getting stale. Two things it is
 * careful about, both of which have burned us:
 *
 * Bout rows are stored once per wrestler, so a bout between two wrestlers we both hold is two
 * rows. Counting rows as matches doubles everything, so bouts are reported as rows and the
 * distinct-teams count is what says whether a collection is national or just ours.
 *
 * A placement COLUMN being empty is not the same as a wrestler not placing. For NHSCA, Super 32
 * and Fargo the placement stores are North Carolina only and mostly unfilled, while the brackets
 * underneath are national and complete — so finishes get derived from placement-round bouts at
 * read time. This report shows both, because "we have the matches but not the stored placement"
 * is the single most common shape of our gaps.
 *
 *   npx tsx scripts/report-data-coverage.ts
 *   npx tsx scripts/report-data-coverage.ts --csv ranking-snapshots/data-coverage.csv
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
const CSV = process.argv.includes("--csv") ? process.argv[process.argv.indexOf("--csv") + 1] : null

async function page<T = any>(table: string, select: string): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

/** Which placement store, if any, backs an event — and how much of it is filled. */
const PLACEMENT_STORE: Array<{ match: RegExp; table: string; label: string }> = [
  { match: /nhsca high school nationals/i, table: "nhsca_placements", label: "nhsca_placements" },
  { match: /super 32(?! early)/i, table: "super32_results", label: "super32_results" },
  { match: /fargo/i, table: "fargo_results", label: "fargo_results" },
]

async function main() {
  const rows: Array<Record<string, string | number>> = []

  /* ---- national and invitational events, from the bout store ---- */
  const bouts = await page<{ event_name: string; year: number; athlete_id: string | null; athlete_club: string | null }>(
    "other_tournament_bouts",
    "event_name, year, athlete_id, athlete_club",
  )
  type Agg = { rows: number; ours: number; theirs: number; teams: Set<string> }
  const byEvent = new Map<string, Agg>()
  for (const b of bouts) {
    const k = `${b.year}|${b.event_name}`
    if (!byEvent.has(k)) byEvent.set(k, { rows: 0, ours: 0, theirs: 0, teams: new Set() })
    const a = byEvent.get(k)!
    a.rows++
    if (b.athlete_id) a.ours++
    else a.theirs++
    if (b.athlete_club) a.teams.add(String(b.athlete_club).trim())
  }

  type Fill = { rows: number; filled: number; states: number }
  const placementFill = new Map<string, Fill>()
  for (const store of PLACEMENT_STORE) {
    const data = await page<{ year: number; placement: unknown; state?: string }>(store.table, "year, placement, state")
    for (const r of data) {
      const k = `${store.table}|${r.year}`
      if (!placementFill.has(k)) placementFill.set(k, { rows: 0, filled: 0, states: 0 })
      const a = placementFill.get(k)!
      a.rows++
      if (r.placement != null && String(r.placement) !== "") a.filled++
    }
    for (const y of new Set(data.map((r) => r.year))) {
      const k = `${store.table}|${y}`
      if (placementFill.has(k)) placementFill.get(k)!.states = new Set(data.filter((r) => r.year === y).map((r) => r.state)).size
    }
  }
  const otherResults = await page<{ year: number; event_name: string; placement: unknown; state?: string }>(
    "other_tournament_results",
    "year, event_name, placement, state",
  )
  const otherResultFill = new Map<string, { rows: number; filled: number }>()
  for (const r of otherResults) {
    const k = `${r.year}|${r.event_name}`
    if (!otherResultFill.has(k)) otherResultFill.set(k, { rows: 0, filled: 0 })
    const a = otherResultFill.get(k)!
    a.rows++
    if (r.placement != null && String(r.placement) !== "") a.filled++
  }

  console.log("TOURNAMENTS — bout (match) coverage\n")
  console.log(
    ["year", "event", "bout_rows", "ours", "unlinked", "teams", "scope", "placement_store", "placement_filled"].join("\t"),
  )
  for (const [k, a] of [...byEvent.entries()].sort()) {
    const [year, event] = k.split("|")
    /*
     * One team means every row is ours — the collection is North Carolina only, even at a national
     * event. That distinction is the whole point of this report: 49 teams at Fargo is the national
     * bracket, 1 team is our own wrestlers' matches at it.
     */
    const scope = a.teams.size <= 1 ? "NC only" : a.teams.size < 20 ? "regional" : "national"
    const store = PLACEMENT_STORE.find((s) => s.match.test(event))
    const fill: Fill | undefined = store
      ? placementFill.get(`${store.table}|${year}`)
      : (() => {
          const o = otherResultFill.get(k)
          return o ? { ...o, states: 0 } : undefined
        })()
    const filled = fill ? `${fill.filled}/${fill.rows}${fill.states === 1 ? " (NC only)" : ""}` : "none"
    rows.push({
      section: "tournament",
      year,
      name: event,
      bout_rows: a.rows,
      linked_to_our_profiles: a.ours,
      unlinked: a.theirs,
      distinct_teams: a.teams.size,
      scope,
      placement_store: store?.label ?? (fill ? "other_tournament_results" : ""),
      placement_filled: filled,
    })
    console.log(
      [year, event, a.rows, a.ours, a.theirs, a.teams.size, scope, store?.label ?? (fill ? "other_tournament_results" : "-"), filled].join("\t"),
    )
  }

  /*
   * Events that exist only as placements, with no bouts at all.
   *
   * The first version of this report walked the bout store alone, so the Southeast Regionals —
   * 2,825 placement rows and not one bout — did not appear in the tournament section. Reading its
   * coverage off a truncated query instead, I called 2025 missing and imported it a second time.
   * An event we hold is worse than useless if the report that lists our holdings cannot see it.
   */
  const boutEvents = new Set([...byEvent.keys()].map((k) => k.split("|")[1]))
  const placementOnly = new Map<string, { rows: number; filled: number; states: Set<string> }>()
  for (const r of otherResults) {
    if (boutEvents.has(r.event_name)) continue
    const k = `${r.year}|${r.event_name}`
    if (!placementOnly.has(k)) placementOnly.set(k, { rows: 0, filled: 0, states: new Set() })
    const a = placementOnly.get(k)!
    a.rows++
    if (r.placement != null && String(r.placement) !== "") a.filled++
    const st = (r as { state?: string }).state
    if (st) a.states.add(String(st))
  }
  if (placementOnly.size) {
    console.log("\n\nTOURNAMENTS — placements only, no bouts held\n")
    console.log(["year", "event", "result_rows", "placement_filled", "states"].join("\t"))
    for (const [k, a] of [...placementOnly.entries()].sort()) {
      const [year, event] = k.split("|")
      rows.push({
        section: "tournament (placements only)",
        year,
        name: event,
        bout_rows: 0,
        placement_filled: `${a.filled}/${a.rows}`,
        scope: a.states.size <= 1 ? "NC only" : a.states.size < 20 ? "regional" : "national",
      })
      console.log([year, event, a.rows, `${a.filled}/${a.rows}`, a.states.size].join("\t"))
    }
  }

  /* ---- state tournaments ---- */
  const placers = await page<{ state: string; season: number; gender: string; grad_year: number | null }>(
    "state_tournament_placers",
    "state, season, gender, grad_year",
  )
  const stBouts = await page<{ state: string; season: number; gender: string }>(
    "state_tournament_bouts",
    "state, season, gender",
  )
  const boutKeys = new Set(stBouts.map((r) => `${r.state}|${r.season}|${r.gender}`))
  const states = [...new Set(placers.map((r) => r.state))].sort()
  const seasons = [...new Set(placers.map((r) => Number(r.season)))].sort()

  console.log("\n\nSTATE TOURNAMENTS — placers held, by state\n")
  console.log(["state", ...seasons.flatMap((s) => [`boys_${s}`, `girls_${s}`]), "placement_bouts", "grad_year_pct"].join("\t"))
  for (const st of states) {
    const mine = placers.filter((r) => r.state === st)
    const cells = seasons.flatMap((s) =>
      ["Boys", "Girls"].map((g) => mine.filter((r) => r.gender === g && Number(r.season) === s).length || 0),
    )
    const hasBouts = [...boutKeys].some((k) => k.startsWith(`${st}|`))
    const gy = Math.round((100 * mine.filter((r) => r.grad_year).length) / mine.length)
    rows.push({
      section: "state",
      year: seasons.join("+"),
      name: st,
      ...Object.fromEntries(cells.map((c, i) => [["boys", "girls"][i % 2] + "_" + seasons[Math.floor(i / 2)], c])),
      placement_bouts: hasBouts ? "yes" : "no",
      grad_year_pct: `${gy}%`,
    })
    console.log([st, ...cells, hasBouts ? "yes" : "no", `${gy}%`].join("\t"))
  }

  console.log("\nTOTALS")
  for (const s of seasons) {
    for (const g of ["Boys", "Girls"]) {
      const mine = placers.filter((r) => r.gender === g && Number(r.season) === s)
      console.log(`  ${g} ${s}: ${mine.length} placers across ${new Set(mine.map((r) => r.state)).size} states`)
    }
  }
  console.log(`  grad_year known: ${placers.filter((r) => r.grad_year).length}/${placers.length}`)

  /* ---- North Carolina's own history, which lives in its own table ---- */
  const nchsaa = await page<{ year: number; place: unknown; athlete_id: string | null }>(
    "wrestling_nchsaa_results",
    "year, place, athlete_id",
  )
  const years = [...new Set(nchsaa.map((r) => Number(r.year)))].sort()
  console.log(
    `\nNCHSAA (NC state, own table): ${nchsaa.length} rows, ${years[0]}-${years[years.length - 1]} (${years.length} seasons), ` +
      `${nchsaa.filter((r) => r.place != null).length} with a place, ${nchsaa.filter((r) => r.athlete_id).length} linked to a profile`,
  )
  rows.push({
    section: "nc",
    year: `${years[0]}-${years[years.length - 1]}`,
    name: "NCHSAA state championships (wrestling_nchsaa_results)",
    bout_rows: 0,
    placement_filled: `${nchsaa.filter((r) => r.place != null).length}/${nchsaa.length}`,
    scope: "NC only",
  })

  if (CSV) {
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
    const esc = (v: unknown) => {
      const t = String(v ?? "")
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
    }
    fs.writeFileSync(CSV, [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n")
    console.log(`\nwrote ${CSV} (${rows.length} rows)`)
  }
}
main().catch((e) => {
  console.error("FAILED:", e.message)
  process.exit(1)
})
