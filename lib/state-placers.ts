import type { SupabaseClient } from "@supabase/supabase-js"

import { nameWords, namesLikelySamePerson } from "@/lib/athlete-name-match"
import { sourceLabel } from "@/lib/national-rankings"
import type { EventPlacer, FargoAllAmerican, NationallyRankedOpponent, StatePlacer } from "@/lib/significant-wins"

/**
 * North Carolina state champions and placers (top 8, NCHSAA and NCISA), for recognising a win
 * over one on a profile or in a scouting report.
 *
 * Six seasons back: enough to cover every wrestler a current high-schooler could have met, and no
 * further, so a 2005 champion is never credited to a namesake wrestling today. One entry per name,
 * carrying every school that name placed for (the namesake check needs them) and the best finish.
 */
const YEARS_BACK = 6

type Row = { year: number; place: number; classification: string | null; wrestler_name: string; school: string | null }

/**
 * State placers plus every NC high school seen in those results, for the namesake check.
 *
 * `outOfState` adds other states' placers (state_tournament_placers). Opt-in, because the ranking
 * engine and star ratings share this index and would score those wins without anyone deciding
 * they should. `stateSchools` stays North Carolina's either way: it is the list that marks a bout
 * as against an NC kid, which is what rules a Virginia namesake out.
 */
type StatePlacerIndex = {
  statePlacers: StatePlacer[]
  stateSchools: string[]
  fargoAllAmericans: FargoAllAmerican[]
  /** Only with `outOfState`: the national lists, schools included so each bout is checked. */
  nationallyRanked?: NationallyRankedOpponent[]
  /** Only with `outOfState`: Super 32 / NHSCA / Journeymen placers. */
  eventPlacers?: EventPlacer[]
}

/**
 * Held for ten minutes per server instance. The index is the same for every profile and changes
 * only when someone imports results, while each profile load was re-reading twelve pages of
 * placers - and now the bout tables ask for it too.
 */
const INDEX_TTL_MS = 10 * 60_000
const indexCache = new Map<string, { at: number; value: Promise<StatePlacerIndex> }>()

export async function loadStatePlacerIndex(
  supabase: SupabaseClient,
  now = new Date(),
  options?: { outOfState?: boolean },
): Promise<StatePlacerIndex> {
  const key = `${now.getFullYear()}|${options?.outOfState ? "all" : "nc"}`
  const hit = indexCache.get(key)
  if (hit && Date.now() - hit.at < INDEX_TTL_MS) return hit.value
  const value = buildStatePlacerIndex(supabase, now, options)
  indexCache.set(key, { at: Date.now(), value })
  // A failed load must not be served for ten minutes.
  value.catch(() => indexCache.delete(key))
  return value
}

async function buildStatePlacerIndex(
  supabase: SupabaseClient,
  now: Date,
  options?: { outOfState?: boolean },
): Promise<StatePlacerIndex> {
  const [ncPlacers, otherPlacers, fargoAllAmericans, nationallyRanked] = await Promise.all([
    loadStatePlacers(supabase, now),
    options?.outOfState ? loadOutOfStatePlacers(supabase, now).catch(() => []) : Promise.resolve([]),
    loadFargoAllAmericans(supabase, now).catch(() => []),
    options?.outOfState ? loadNationallyRanked(supabase).catch(() => []) : Promise.resolve(undefined),
  ])
  const stateSchools = [...new Set(ncPlacers.flatMap((p) => p.schools))]
  const ncNames = otherPlacers.length ? [...ncPlacers.map((p) => p.name), ...(await loadNcAthleteNames(supabase).catch(() => []))] : []
  if (otherPlacers.length) markDistinctive(otherPlacers, ncNames)
  const eventPlacers = options?.outOfState ? await loadEventPlacers(supabase, otherPlacers, ncNames).catch(() => []) : undefined
  if (nationallyRanked?.length) markRankedDistinctive(nationallyRanked, ncNames, otherPlacers)
  return {
    statePlacers: [...ncPlacers, ...otherPlacers],
    stateSchools,
    fargoAllAmericans,
    ...(nationallyRanked ? { nationallyRanked } : {}),
    ...(eventPlacers ? { eventPlacers } : {}),
  }
}

/**
 * The newest edition of each outlet's national rankings, one entry per wrestler at his best rank:
 * "#9 Sports Illustrated (150)", "#3 FloWrestling P4P". Carries the school so a bout is credited
 * only with evidence it was him (nationalRankFits in lib/significant-wins.ts).
 */
export async function loadNationallyRanked(supabase: SupabaseClient): Promise<NationallyRankedOpponent[]> {
  type Row = { athlete_name: string; rank: number; source: string; state: string | null; high_school: string | null; scope: string; weight_class: string | null; ranking_month: string }
  /*
   * Newest edition per outlet first, then only those rows, paged. This used to read every held
   * edition in one query ordered by rank; PostgREST caps a response at 1,000 rows, so once three
   * editions were on file the low ranks of the newest one were cut off - #29 Matthew McDermott
   * vanished the night SI's October list was loaded.
   */
  // Newest month per outlet and gender (boys and girls lists publish on their own schedules).
  // Falls back to per-outlet only on a database that has no gender column yet.
  const editions: Array<{ source: string; month: string; gender: string | null; scope: string | null }> = []
  for (const source of ["sports_illustrated", "flowrestling", "matscouts"]) {
    let genderAware = true
    // Per list type too: MatScouts' October Big Board must not hide its September weight lists.
    for (const gender of ["M", "F"]) {
      for (const scope of ["weight", "p4p", "big_board"]) {
        const { data, error } = await supabase
          .from("national_rankings")
          .select("ranking_month")
          .eq("source", source)
          .eq("gender", gender)
          .eq("scope", scope)
          .order("ranking_month", { ascending: false })
          .limit(1)
        if (error) {
          genderAware = false
          break
        }
        if (data?.[0]?.ranking_month) editions.push({ source, month: String(data[0].ranking_month), gender, scope })
      }
      if (!genderAware) break
    }
    if (genderAware) continue
    const { data: head } = await supabase
      .from("national_rankings")
      .select("ranking_month")
      .eq("source", source)
      .order("ranking_month", { ascending: false })
      .limit(1)
    if (head?.[0]?.ranking_month) editions.push({ source, month: String(head[0].ranking_month), gender: null, scope: null })
  }
  const rows: Row[] = []
  for (const edition of editions) {
    for (let from = 0; ; from += 1000) {
      let query = supabase
        .from("national_rankings")
        .select("athlete_name, rank, source, state, high_school, scope, weight_class, ranking_month")
        .eq("source", edition.source)
        .eq("ranking_month", edition.month)
      if (edition.gender) query = query.eq("gender", edition.gender)
      if (edition.scope) query = query.eq("scope", edition.scope)
      const { data, error } = await query.order("rank", { ascending: true }).range(from, from + 999)
      if (error || !data?.length) break
      rows.push(...(data as Row[]))
      if (data.length < 1000) break
    }
  }
  rows.sort((a, b) => a.rank - b.rank)
  const best = new Map<string, NationallyRankedOpponent>()
  for (const r of rows) {
    const name = String(r.athlete_name ?? "").trim()
    if (!name) continue
    const key = `${name.toLowerCase()}|${r.state ?? ""}`
    // Sorted by rank, so the first row per wrestler is his best across outlets and lists.
    if (best.has(key)) continue
    const where = r.scope === "p4p" ? " P4P" : r.scope === "big_board" ? " Big Board" : r.weight_class ? ` (${r.weight_class})` : ""
    best.set(key, {
      name,
      rank: Number(r.rank),
      source: `${sourceLabel(r.source)}${where}`,
      state: r.state ?? null,
      school: r.high_school ?? null,
      weight: Number.parseInt(String(r.weight_class ?? ""), 10) || null,
    })
  }
  return [...best.values()]
}

/**
 * National-event placers, one entry per name and bracket state. Confirmation and distinctiveness
 * are borrowed from the same wrestler's state placing (same name, same state): a name only proven
 * safe there may be credited on name alone here, so no namesake slips in through Super 32.
 */
async function loadEventPlacers(supabase: SupabaseClient, statePlacers: StatePlacer[], ncNames: string[]): Promise<EventPlacer[]> {
  type Row = {
    event_name: string
    year: number
    place: number
    weight: string | null
    wrestler_name: string
    team: string | null
    state: string | null
    nc_namesake?: boolean | null
  }
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("national_event_placers").select("*").range(from, from + 999)
    if (error || !data?.length) break
    rows.push(...(data as Row[]))
    if (data.length < 1000) break
  }
  const stateFlags = new Map(statePlacers.map((p) => [`${p.state}|${p.name.toLowerCase()}`, p]))
  type Entry = EventPlacer & { finishes: EventPlacer["finishes"][number][]; schools: string[]; ncNamesake: boolean }
  const byKey = new Map<string, Entry>()
  for (const r of rows) {
    const name = String(r.wrestler_name ?? "").trim()
    if (!name) continue
    const key = `${r.state ?? r.team ?? ""}|${name.toLowerCase()}`
    const flags = r.state ? stateFlags.get(`${r.state}|${name.toLowerCase()}`) : undefined
    const entry = byKey.get(key) ?? {
      name,
      state: r.state,
      schools: !r.state && r.team ? [r.team] : [],
      identityConfirmed: Boolean(flags?.identityConfirmed),
      distinctive: Boolean(flags?.distinctive),
      ncNamesake: false,
      finishes: [],
    }
    // Not yet checked counts as a namesake, as for state placers.
    entry.ncNamesake ||= r.nc_namesake !== false
    entry.finishes.push({ event: r.event_name, year: r.year, place: r.place, weight: Number.parseInt(String(r.weight ?? ""), 10) || null })
    byKey.set(key, entry)
  }
  const entries = [...byKey.values()]

  /*
   * One wrestler, several brackets: Noah Sandlin placed at NHSCA for California in 2025 (170) and
   * for Ohio in 2026 (182). Entries with the same name are joined when every pair of weights is
   * plausible for one growing boy, so each carries both finishes ("2x NHSCA All-American").
   */
  const byName = new Map<string, Entry[]>()
  for (const e of entries) byName.set(e.name.toLowerCase(), [...(byName.get(e.name.toLowerCase()) ?? []), e])
  const consistent = (group: Entry[]) => {
    const ws = group.flatMap((e) => e.finishes.map((f) => f.weight)).filter((w): w is number => !!w)
    return ws.every((a) => ws.every((b) => a <= b * 1.3 && b <= a * 1.3))
  }
  for (const group of byName.values()) {
    if (group.length < 2 || !consistent(group)) continue
    const all = group.flatMap((e) => e.finishes)
    for (const e of group) e.finishes = all
  }

  /*
   * An event-only name (no state placing to borrow from) is distinctive when no other placer, event
   * or state, and no North Carolinian could carry it, and the confirmation pass found no NC namesake.
   */
  const pool = [...statePlacers.map((p) => p.name), ...entries.map((e) => e.name), ...ncNames]
  const byWord = new Map<string, string[]>()
  for (const name of pool) {
    for (const word of new Set(nameWords(name))) byWord.set(word, [...(byWord.get(word) ?? []), name])
  }
  for (const e of entries) {
    if (e.distinctive || e.ncNamesake) continue
    const group = byName.get(e.name.toLowerCase()) ?? [e]
    if (group.length > 1 && !consistent(group)) continue
    const rivals = new Set<string>()
    for (const word of nameWords(e.name)) {
      for (const other of byWord.get(word) ?? []) {
        // The same spelling is this wrestler (his other brackets, or himself).
        if (other.toLowerCase() !== e.name.toLowerCase() && namesLikelySamePerson(other, e.name)) rivals.add(other)
      }
    }
    e.distinctive = rivals.size === 0
  }
  return entries
}

/** Every North Carolina profile's name: a placer sharing one is never credited on name alone. */
async function loadNcAthleteNames(supabase: SupabaseClient): Promise<string[]> {
  const names: string[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("athletes").select("name").eq("is_nc_athlete", true).range(from, from + 999)
    if (error || !data?.length) break
    for (const row of data as { name: string | null }[]) if (row.name) names.push(row.name)
    if (data.length < 1000) break
  }
  return names
}

/**
 * Flags the out-of-state placers whose name no one else on file could carry: no other placer, in
 * any state, and no North Carolina profile or placer that the site's own matcher would call the
 * same person (nicknames included). Compared only within a shared surname word, the way
 * `placerCandidates` narrows, so eleven thousand names take milliseconds.
 */
/** A ranked name is distinctive when no NC wrestler and no differently-stated placer shares it. */
function markRankedDistinctive(ranked: NationallyRankedOpponent[], ncNames: string[], placers: StatePlacer[]) {
  const byWord = new Map<string, Array<{ name: string; state: string | null }>>()
  const add = (name: string, state: string | null) => {
    for (const word of new Set(nameWords(name))) {
      const list = byWord.get(word)
      if (list) list.push({ name, state })
      else byWord.set(word, [{ name, state }])
    }
  }
  for (const n of ncNames) add(n, "NC")
  for (const p of placers) add(p.name, p.state ?? null)
  for (const r of ranked) add(r.name, `ranked:${r.state ?? ""}`)
  for (const r of ranked) {
    const seen = new Set<string>()
    let others = 0
    for (const word of nameWords(r.name)) {
      for (const c of byWord.get(word) ?? []) {
        const key = `${c.name}|${c.state}`
        if (seen.has(key)) continue
        seen.add(key)
        if (!namesLikelySamePerson(c.name, r.name)) continue
        // Himself: his own ranked row(s), and a placer of his name in his own state.
        if (c.state === `ranked:${r.state ?? ""}` || (c.state && c.state === r.state)) continue
        others += 1
      }
    }
    r.distinctive = others === 0
  }
}

function markDistinctive(placers: StatePlacer[], ncNames: string[]) {
  const others = [...placers.map((p) => p.name), ...ncNames]
  const byWord = new Map<string, string[]>()
  for (const name of others) {
    for (const word of new Set(nameWords(name))) {
      const list = byWord.get(word)
      if (list) list.push(name)
      else byWord.set(word, [name])
    }
  }
  for (const placer of placers) {
    const candidates = new Set<string>()
    for (const word of nameWords(placer.name)) for (const name of byWord.get(word) ?? []) candidates.add(name)
    let matches = 0
    for (const name of candidates) if (namesLikelySamePerson(name, placer.name)) matches += 1
    // Exactly one: himself. And nobody of that name in our NC season records (nc_namesake).
    placer.distinctive = matches === 1 && !placer.ncNamesake
  }
}

type OutOfStateRow = {
  season: number
  state: string
  place: number
  classification: string | null
  wrestler_name: string
  school_raw: string | null
  weight?: string | null
  identity_confirmed?: boolean | null
  /** Null until the confirmation pass has checked NC season records for a namesake. */
  nc_namesake?: boolean | null
}

/** Other states' placers over the same window, one entry per name per state. */
export async function loadOutOfStatePlacers(supabase: SupabaseClient, now = new Date()): Promise<StatePlacer[]> {
  const rows: OutOfStateRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("state_tournament_placers")
      // `*` rather than naming identity_confirmed, so a database without that column still loads.
      .select("*")
      .gte("season", now.getFullYear() - YEARS_BACK)
      .order("season", { ascending: false })
      .range(from, from + 999)
    if (error || !data?.length) break
    rows.push(...(data as OutOfStateRow[]))
    if (data.length < 1000) break
  }

  const byName = new Map<string, { name: string; state: string; schools: Set<string>; confirmed: boolean; ncNamesake: boolean; rows: OutOfStateRow[] }>()
  for (const row of rows) {
    const name = String(row.wrestler_name ?? "").trim()
    if (!name) continue
    const key = `${row.state}|${name.toLowerCase().replace(/\s+/g, " ")}`
    const entry = byName.get(key) ?? { name, state: row.state, schools: new Set<string>(), confirmed: false, ncNamesake: false, rows: [] }
    if (row.school_raw) entry.schools.add(row.school_raw)
    entry.confirmed ||= Boolean(row.identity_confirmed)
    // Not yet checked counts as a namesake: the name-alone rule waits for the confirmation pass.
    entry.ncNamesake ||= row.nc_namesake !== false
    entry.rows.push(row)
    byName.set(key, entry)
  }

  // A state that runs one bracket has nothing worth naming: its "classification" is whatever the
  // source called the whole tournament - "Open", "Boys", "KHSAA Boys/Coed State Championship".
  const classesByState = new Map<string, Set<string>>()
  for (const r of rows) {
    const set = classesByState.get(r.state) ?? new Set<string>()
    set.add(String(r.classification ?? ""))
    classesByState.set(r.state, set)
  }
  const classLabel = (r: OutOfStateRow): string | null => {
    if ((classesByState.get(r.state)?.size ?? 0) <= 1) return null
    // "Boys 4A" (WA, OK), "6A Boys" (OR), "Class 5A" (AR) -> "4A", "6A", "5A". Class A/B keep "Class".
    const cleaned = String(r.classification ?? "")
      .replace(/\b(boys|girls|coed)\b/gi, "")
      .replace(/^class\s+(?=\d)/i, "")
      .replace(/\s+/g, " ")
      .trim()
    return cleaned || null
  }

  return [...byName.values()].map((e) => ({
    name: e.name,
    state: e.state,
    identityConfirmed: e.confirmed,
    ncNamesake: e.ncNamesake,
    schools: [...e.schools],
    finishes: e.rows.map((r) => ({
      year: r.season,
      place: r.place,
      classification: classLabel(r),
      state: r.state,
      weight: Number.parseInt(String(r.weight ?? ""), 10) || null,
    })),
  }))
}

/** Fargo All-Americans over the same window, one entry per name with every school and finish. */
export async function loadFargoAllAmericans(supabase: SupabaseClient, now = new Date()): Promise<FargoAllAmerican[]> {
  const { data, error } = await supabase
    .from("fargo_results")
    .select("year, division, placement, athlete_name, high_school")
    .eq("is_all_american", true)
    .gte("year", now.getFullYear() - YEARS_BACK)
    .limit(5000)
  if (error || !data) return []
  const byName = new Map<string, { name: string; schools: Set<string>; finishes: FargoAllAmerican["finishes"][number][] }>()
  for (const row of data as { year: number; division: string; placement: number | null; athlete_name: string; high_school: string | null }[]) {
    const name = String(row.athlete_name ?? "").trim()
    if (!name) continue
    const key = name.toLowerCase().replace(/\s+/g, " ")
    const entry = byName.get(key) ?? { name, schools: new Set<string>(), finishes: [] }
    if (row.high_school) entry.schools.add(row.high_school)
    entry.finishes.push({ year: row.year, division: row.division, placement: row.placement })
    byName.set(key, entry)
  }
  return [...byName.values()].map((e) => ({ name: e.name, schools: [...e.schools], finishes: e.finishes }))
}

export async function loadStatePlacers(supabase: SupabaseClient, now = new Date()): Promise<StatePlacer[]> {
  const since = now.getFullYear() - YEARS_BACK
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("wrestling_nchsaa_results")
      .select("year, place, classification, wrestler_name, school")
      .gte("year", since)
      .gte("place", 1)
      .lte("place", 8)
      .order("year", { ascending: false })
      .range(from, from + 999)
    if (error || !data?.length) break
    rows.push(...(data as Row[]))
    if (data.length < 1000) break
  }

  const byName = new Map<string, { name: string; schools: Set<string>; rows: Row[] }>()
  for (const row of rows) {
    const name = String(row.wrestler_name ?? "").trim()
    if (!name) continue
    const key = name.toLowerCase().replace(/\s+/g, " ")
    const entry = byName.get(key) ?? { name, schools: new Set<string>(), rows: [] }
    if (row.school) entry.schools.add(String(row.school))
    entry.rows.push(row)
    byName.set(key, entry)
  }

  return [...byName.values()].map((entry) => ({
    name: entry.name,
    schools: [...entry.schools],
    finishes: entry.rows.map((r) => ({ year: r.year, place: r.place, classification: r.classification })),
  }))
}
