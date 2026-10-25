/**
 * Builds a Command Center snapshot from the latest Flo export and seed list, and queues alerts.
 *
 * A snapshot is everything the page shows, computed once per upload and stored, so the public
 * page never parses a 7,000-row export on a request. Alerts are rows in `super32_live_alerts`,
 * keyed so one bout or milestone can only ever be queued once; nothing here sends a push.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  addUnstartedSeeds,
  parseFloExport,
  recap,
  samePerson,
  scoreboard,
  splitDivisions,
  summarizeEntrants,
  type EntrantSummary,
  type Gender,
  type Recap,
  type Scoreboard,
  type SeedRow,
  type Tier,
  type NcFilter,
  teamIsNc,
} from "./engine"
import { loadCredentials } from "./credentials"

export const SUPER32_EVENT_KEY = "super32-2026"
export const LIVE_PATH = "/news/super32-live"

/**
 * Entrants on an NC club who are not counted as North Carolina wrestlers (Matt, 22 Oct 2026):
 * both attend school out of state. They are left off the page, the totals and the alerts.
 */
export const NOT_NC = ["Jaclyn Bouzakis", "Jack Harty"]

/**
 * Wrestlers to Watch for 2026 (Matt, 23 Oct 2026): the top of our NC class rankings plus three he
 * named. The rankings choose who appears; the rank itself is never shown, because class ranks are
 * for members and coaches only. Ethan Halstead is class of 2031, below the usual window, so the
 * named ids are also loaded for profile matching.
 */
export { WATCH_NAMED_IDS } from "./watch-named"
import { WATCH_NAMED_IDS } from "./watch-named"
export const WATCH_TOP_PER_CLASS = 5
const isNcEntrant: NcFilter = (name, team, gender) => teamIsNc(name, team, gender) && !NOT_NC.some((n) => samePerson({ name: n }, { name }))

export type SnapshotBout = {
  round: string
  win: boolean
  opponent: string
  opponentTeam: string
  winType: string
  result: string
  tier: Tier | null
  upset: boolean
  reasons: string[]
  opponentSeed: number | null
  key: string
  /** When this bout first appeared in an update (ISO). Orders the Latest Results list. */
  seenAt?: string
}

export type SnapshotEntrant = Omit<EntrantSummary, "bouts"> & {
  athleteId: string | null
  school: string | null
  photo: string | null
  classYear: number | null
  bouts: SnapshotBout[]
  /** History chips, strongest first: "#12 nationally (SI)", "2025 Super 32 4th", "2026 NC 4A champion". */
  chips: string[]
  /**
   * Wrestlers to Watch priority, 1 strongest; null when no qualifying credential. 1 seeded,
   * 2 nationally ranked, 3 returning Super 32 All-American, 4 2026 NC state champion,
   * 5 2026 NHSCA All-American.
   */
  watch: number | null
}

export type FeedItem = {
  key: string
  seenAt: string
  tier: Tier
  upset: boolean
  name: string
  athleteId: string | null
  photo: string | null
  school: string | null
  gender: Gender
  weight: string
  opponent: string
  opponentTeam: string
  reasons: string[]
  winType: string
  result: string
  round: string
}

export type SnapshotRecap = Omit<Recap, "topPerformance" | "biggestUpset" | "longestStreak" | "notableEliminations"> & {
  at: string
  gender: Gender | "all"
  topPerformance: { name: string; weight: string; line: string } | null
  biggestUpset: { name: string; weight: string; line: string } | null
  longestStreak: { name: string; weight: string; streak: number } | null
  notableEliminations: Array<{ name: string; weight: string; seed: number | null }>
}

export type SnapshotData = {
  /** Watch candidates not yet seen in a bracket. Shown only before results; never counted. */
  watchPreview?: SnapshotEntrant[]
  eventKey: string
  generatedAt: string
  seedsFinal: boolean
  hasResults: boolean
  scoreboards: { all: Scoreboard; boys: Scoreboard; girls: Scoreboard }
  entrants: SnapshotEntrant[]
  feed: FeedItem[]
  recaps: SnapshotRecap[]
  boutSeenAt: Record<string, string>
  unresolved: string[]
  unmatched: string[]
  brackets: Array<{ gender: Gender; weight: string; entrants: number; seedsMatched: number; how: string }>
}

export function parseSeedsCsv(text: string): SeedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const head = (lines[0] ?? "").toLowerCase().split(",").map((h) => h.trim())
  const at = (n: string) => head.indexOf(n)
  const [ig, iw, is, inm, ist] = [at("gender"), at("weight"), at("seed"), at("name"), at("state")]
  if ([ig, iw, is, inm, ist].some((i) => i < 0)) throw new Error("Seeds need columns gender, weight, seed, name, state")
  return lines.slice(1).map((l) => l.split(",")).flatMap((c) => {
    const g = (c[ig] ?? "").trim().toLowerCase()
    const gender: Gender | null = /^(b|m)/.test(g) ? "boys" : /^(g|w|f)/.test(g) ? "girls" : null
    // A blank seed is an unseeded entrant from the official field, not a bad row.
    const rawSeed = (c[is] ?? "").trim()
    const seed = rawSeed ? Number(rawSeed) : null
    if (!gender || (seed !== null && !Number.isFinite(seed)) || !(c[inm] ?? "").trim()) return []
    return [{ gender, weight: (c[iw] ?? "").trim(), seed, name: (c[inm] ?? "").trim(), state: (c[ist] ?? "").trim().toUpperCase() }]
  })
}

type AthleteRow = { id: string; name: string | null; wrestling_name: string | null; photourl: string | null; highschool: string | null; graduationyear: number | null; gender: string | null }

async function loadNcAthletes(supabase: SupabaseClient, eventYear: number): Promise<AthleteRow[]> {
  const out: AthleteRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("athletes")
      .select("id, name, wrestling_name, photourl, highschool, graduationyear, gender")
      .eq("is_nc_athlete", true)
      // Super 32 opens a season: seniors are the class of year+1, freshmen year+4. A profile with
      // no class year at all (Lauren Samuel, 2025 Super 32 7th) can still be the wrestler; it
      // links only when it is the single exact name-and-gender match, like any other.
      .or(`graduationyear.is.null,and(graduationyear.gte.${eventYear + 1},graduationyear.lte.${eventYear + 4})`)
      .order("id")
      .range(from, from + 999)
    if (error || !data?.length) break
    out.push(...(data as AthleteRow[]))
    if (data.length < 1000) break
  }
  return out
}

type WatchCandidate = AthleteRow & { prospect_ranking: number | null; named: boolean }

async function loadWatchCandidates(supabase: SupabaseClient, eventYear: number): Promise<WatchCandidate[]> {
  const cols = "id, name, wrestling_name, photourl, highschool, graduationyear, gender, prospect_ranking"
  const [ranked, named] = await Promise.all([
    supabase.from("athletes").select(cols).eq("is_nc_athlete", true)
      .gte("graduationyear", eventYear + 1).lte("graduationyear", eventYear + 4)
      .not("prospect_ranking", "is", null).lte("prospect_ranking", WATCH_TOP_PER_CLASS).limit(200),
    supabase.from("athletes").select(cols).in("id", WATCH_NAMED_IDS),
  ])
  const out = new Map<string, WatchCandidate>()
  for (const r of (ranked.data ?? []) as WatchCandidate[]) out.set(r.id, { ...r, named: false })
  for (const r of (named.data ?? []) as WatchCandidate[]) out.set(r.id, { ...r, named: true })
  return [...out.values()]
}

const isFemale = (g: string | null) => /^f/i.test(g ?? "")
const ORD = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`)

type History = { s32: Map<string, number>; state: Map<string, { place: number; classification: string }> }

/** Super 32 2025 finishes and 2026 NC state finishes, by athlete id. */
async function loadNcHistory(supabase: SupabaseClient, ids: string[]): Promise<History> {
  const s32 = new Map<string, number>()
  const state = new Map<string, { place: number; classification: string }>()
  if (!ids.length) return { s32, state }
  const [a, b] = await Promise.all([
    supabase.from("super32_results").select("athlete_id, placement").eq("year", 2025).in("athlete_id", ids).not("placement", "is", null),
    supabase.from("wrestling_nchsaa_results").select("athlete_id, place, classification").eq("year", 2026).in("athlete_id", ids).gte("place", 1).lte("place", 8),
  ])
  for (const r of (a.data ?? []) as Array<{ athlete_id: string; placement: string | number }>) {
    const p = Number.parseInt(String(r.placement), 10)
    if (p >= 1 && p <= 8) s32.set(r.athlete_id, p)
  }
  for (const r of (b.data ?? []) as Array<{ athlete_id: string; place: number; classification: string | null }>) {
    const cur = state.get(r.athlete_id)
    if (!cur || r.place < cur.place) state.set(r.athlete_id, { place: r.place, classification: r.classification ?? "" })
  }
  return { s32, state }
}

function chipsFor(e: { name: string; gender: Gender; seed: number | null; athleteId: string | null }, credentials: Array<{ name: string; state: string | null; gender: Gender | null; kind: string; rank?: number; label: string }>, hist: History) {
  const chips: Array<[number, string]> = []
  let watch: number | null = null
  const take = (p: number) => { if (watch === null || p < watch) watch = p }
  if (e.seed !== null) { chips.push([0, `#${e.seed} seed`]); take(1) }
  const mine = credentials.filter((c) => c.state === "NC" && (!c.gender || c.gender === e.gender) && samePerson({ name: c.name }, { name: e.name }))
  const ranked = mine.filter((c) => c.kind === "national_rank" || c.kind === "board_rank").sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0]
  if (ranked) { chips.push([1, ranked.label]); take(2) }
  const s32 = e.athleteId ? hist.s32.get(e.athleteId) : undefined
  if (s32) { chips.push([2, `2025 Super 32 ${ORD(s32)}`]); take(3) }
  const st = e.athleteId ? hist.state.get(e.athleteId) : undefined
  if (st) {
    chips.push([3, `2026 NC ${st.classification} ${st.place === 1 ? "champion" : ORD(st.place)}`.replace(/\s+/g, " ")])
    if (st.place === 1) take(4)
  }
  const nhsca = mine.find((c) => /NHSCA/.test(c.label))
  if (nhsca) { chips.push([4, nhsca.label]); take(5) }
  return { chips: chips.sort((a, b) => a[0] - b[0]).map((c) => c[1]), watch }
}

function matchAthlete(e: { name: string; gender: Gender }, athletes: AthleteRow[]): AthleteRow | "ambiguous" | null {
  const hits = athletes.filter(
    (a) => (!a.gender || isFemale(a.gender) === (e.gender === "girls")) &&
      [a.name, a.wrestling_name].some((n) => n && samePerson({ name: n }, { name: e.name })),
  )
  if (hits.length === 1) return hits[0]!
  return hits.length ? "ambiguous" : null
}

function recapForStore(r: Recap, at: string, gender: Gender | "all"): SnapshotRecap {
  const line = (x: { entrant: EntrantSummary; win: { reasons: string[]; bout: { loser: string; loserTeam: string; result: string } } }) =>
    `beat ${x.win.bout.loser} (${x.win.bout.loserTeam})${x.win.reasons[0] ? `, ${x.win.reasons[0]}` : ""}${x.win.bout.result ? `, ${x.win.bout.result}` : ""}`
  return {
    ...r, at, gender,
    topPerformance: r.topPerformance ? { name: r.topPerformance.entrant.name, weight: r.topPerformance.entrant.weight, line: line(r.topPerformance) } : null,
    biggestUpset: r.biggestUpset ? { name: r.biggestUpset.entrant.name, weight: r.biggestUpset.entrant.weight, line: line(r.biggestUpset) } : null,
    longestStreak: r.longestStreak ? { name: r.longestStreak.name, weight: r.longestStreak.weight, streak: r.longestStreak.streak } : null,
    notableEliminations: r.notableEliminations.map((e) => ({ name: e.name, weight: e.weight, seed: e.seed })),
  }
}

type Upload = { id: string; content: string; seeds_final: boolean; created_at: string }

export async function latestUpload(supabase: SupabaseClient, eventKey: string, kind: "flo" | "seeds"): Promise<Upload | null> {
  const { data } = await supabase
    .from("super32_live_uploads").select("id, content, seeds_final, created_at")
    .eq("event_key", eventKey).eq("kind", kind).order("created_at", { ascending: false }).limit(1)
  return (data?.[0] as Upload | undefined) ?? null
}

export async function latestSnapshot(supabase: SupabaseClient, eventKey = SUPER32_EVENT_KEY, publishedOnly = false) {
  let q = supabase.from("super32_live_snapshots").select("id, data, published, published_at, created_at").eq("event_key", eventKey)
  if (publishedOnly) q = q.eq("published", true)
  const { data } = await q.order("created_at", { ascending: false }).limit(1)
  return (data?.[0] as { id: string; data: SnapshotData; published: boolean; published_at: string | null; created_at: string } | undefined) ?? null
}

export type SnapshotInputs = {
  floContent: string | null
  seeds: SeedRow[]
  seedsFinal: boolean
  prev: SnapshotData | null
  /** Extra division hints for a rehearsal on a year without seeds. */
  hints?: Array<{ gender: Gender; weight: string; name: string; state?: string | null }>
  /** The year the event is wrestled; picks which class years can be linked. 2026 unless rehearsing. */
  eventYear?: number
  /**
   * False for a past year: today's rankings and titles would label 2025 opponents with honours
   * they won later, so a past event carries no opponent credentials at all.
   */
  credentials?: boolean
}

/** Everything the page shows, computed from one export and one seed list. Reads profiles; writes nothing. */
export async function computeSnapshot(supabase: SupabaseClient, eventKey: string, input: SnapshotInputs, now = new Date().toISOString()) {
  const eventYear = input.eventYear ?? 2026
  const [credentials, windowAthletes, candidates] = await Promise.all([input.credentials === false ? Promise.resolve([]) : loadCredentials(supabase), loadNcAthletes(supabase, eventYear), loadWatchCandidates(supabase, eventYear)])
  const athletes = [...windowAthletes, ...candidates.filter((c) => !windowAthletes.some((a) => a.id === c.id))]
  const { seeds, seedsFinal } = input
  const ctx = { seeds, credentials, seedsFinal }

  const rows = input.floContent ? parseFloExport(input.floContent) : []
  const split = splitDivisions(rows, [...seeds.map((s) => ({ gender: s.gender, weight: s.weight, name: s.name, state: s.state })), ...(input.hints ?? [])])
  const summaries = addUnstartedSeeds(summarizeEntrants(split.bouts, ctx, isNcEntrant), seeds, isNcEntrant)

  const boutSeenAt: Record<string, string> = { ...(input.prev?.boutSeenAt ?? {}) }
  const newKeys = new Set<string>()
  for (const b of split.bouts) {
    if (!boutSeenAt[b.key]) { boutSeenAt[b.key] = now; newKeys.add(b.key) }
  }

  const unmatched: string[] = []
  const matches = summaries.map((e) => matchAthlete(e, athletes))
  const hist = await loadNcHistory(supabase, matches.flatMap((m) => (m && m !== "ambiguous" ? [m.id] : [])))
  const entrants: SnapshotEntrant[] = summaries.map((e, i) => {
    const m = matches[i]!
    if (m === "ambiguous") unmatched.push(`${e.name} (${e.gender} ${e.weight}): more than one NC profile matches`)
    else if (!m) unmatched.push(`${e.name} (${e.gender} ${e.weight}): no NC profile in a current class`)
    const a = m && m !== "ambiguous" ? m : null
    return {
      ...chipsFor({ name: e.name, gender: e.gender, seed: e.seed, athleteId: a?.id ?? null }, credentials, hist),
      ...e,
      athleteId: a?.id ?? null,
      school: a?.highschool ?? null,
      photo: a?.photourl ?? null,
      classYear: a?.graduationyear ?? null,
      bouts: e.bouts.map((b) => ({
        round: b.bout.round, win: b.win, opponent: b.opponent, opponentTeam: b.opponentTeam,
        winType: b.bout.winType, result: b.bout.result,
        tier: b.tiered?.tier ?? null, upset: b.tiered?.upset ?? false, reasons: b.tiered?.reasons ?? b.opponentReasons ?? [],
        opponentSeed: b.tiered?.opponentSeed ?? b.lossToSeed ?? null, key: b.bout.key, seenAt: boutSeenAt[b.bout.key] ?? now,
      })),
    }
  })

  // Curated watch: a ranked or named wrestler found in the brackets joins at level 2 (ranked).
  const byId = new Map(candidates.map((c) => [c.id, c]))
  for (const e of entrants) {
    if (e.athleteId && byId.has(e.athleteId)) e.watch = Math.min(e.watch ?? 9, 2)
  }
  const seen = new Set(entrants.map((e) => e.athleteId).filter(Boolean))
  const previewHist = await loadNcHistory(supabase, candidates.filter((c) => !seen.has(c.id)).map((c) => c.id))
  const watchPreview: SnapshotEntrant[] = candidates
    .filter((c) => !seen.has(c.id))
    .sort((a, b) => Number(b.named) - Number(a.named) || (a.prospect_ranking ?? 99) - (b.prospect_ranking ?? 99) || (a.graduationyear ?? 0) - (b.graduationyear ?? 0))
    .map((c) => {
      const gender: Gender = isFemale(c.gender) ? "girls" : "boys"
      const name = c.name ?? ""
      return {
        ...chipsFor({ name, gender, seed: null, athleteId: c.id }, credentials, previewHist),
        // Weight is left blank: athletes.weightclass is not where they will wrestle.
        name, team: "NC", gender, weight: "", seed: null, wins: 0, losses: 0, status: "not_started" as const, placement: null,
        aaClinched: false, finalist: false, streak: 0, hotStreak: false, onFire: false, consiRun: false,
        athleteId: c.id, school: c.highschool && c.highschool !== "NA" ? c.highschool : null, photo: c.photourl ?? null, classYear: c.graduationyear ?? null,
        bouts: [], watch: 2,
      }
    })

  const feed: FeedItem[] = entrants
    .flatMap((e) => e.bouts.filter((b) => b.win && (b.tier === "huge" || b.tier === "big" || b.tier === "significant")).map((b) => ({
      key: b.key, seenAt: boutSeenAt[b.key] ?? now, tier: b.tier as Tier, upset: b.upset,
      name: e.name, athleteId: e.athleteId, photo: e.photo, school: e.school, gender: e.gender, weight: e.weight,
      opponent: b.opponent, opponentTeam: b.opponentTeam, reasons: b.reasons, winType: b.winType, result: b.result, round: b.round,
    })))
    .sort((a, b) => b.seenAt.localeCompare(a.seenAt) || ({ huge: 0, big: 1, significant: 2 } as Record<string, number>)[a.tier]! - ({ huge: 0, big: 1, significant: 2 } as Record<string, number>)[b.tier]!)

  const recaps = [...(input.prev?.recaps ?? [])]
  let latestRecap: SnapshotRecap | null = null
  if (newKeys.size && summaries.some((e) => e.bouts.some((b) => newKeys.has(b.bout.key)))) {
    for (const g of ["girls", "boys"] as const) {
      if (summaries.some((e) => e.gender === g && e.bouts.some((b) => newKeys.has(b.bout.key)))) recaps.unshift(recapForStore(recap(summaries, newKeys, g), now, g))
    }
    latestRecap = recapForStore(recap(summaries, newKeys), now, "all")
    recaps.unshift(latestRecap)
  }

  const data: SnapshotData = {
    eventKey, generatedAt: now, seedsFinal, hasResults: split.bouts.some((b) => !!b.loser),
    scoreboards: { all: scoreboard(summaries), boys: scoreboard(summaries, "boys"), girls: scoreboard(summaries, "girls") },
    entrants, feed, recaps, boutSeenAt, watchPreview,
    unresolved: split.unresolved, unmatched, brackets: split.brackets,
  }
  return { data, latestRecap, newKeys }
}

export async function buildSnapshot(supabase: SupabaseClient, eventKey = SUPER32_EVENT_KEY): Promise<{ id: string; data: SnapshotData; alertsQueued: number }> {
  const [flo, seedsUp, prev] = await Promise.all([
    latestUpload(supabase, eventKey, "flo"),
    latestUpload(supabase, eventKey, "seeds"),
    latestSnapshot(supabase, eventKey),
  ])
  const { data, latestRecap, newKeys } = await computeSnapshot(supabase, eventKey, {
    floContent: flo?.content ?? null,
    seeds: seedsUp ? parseSeedsCsv(seedsUp.content) : [],
    seedsFinal: !!seedsUp?.seeds_final,
    prev: prev?.data ?? null,
  })

  const { data: inserted, error } = await supabase
    .from("super32_live_snapshots")
    .insert({ event_key: eventKey, flo_upload_id: flo?.id ?? null, seeds_upload_id: seedsUp?.id ?? null, data })
    .select("id").single()
  if (error || !inserted) throw new Error(`snapshot insert failed: ${error?.message}`)

  // Alerts only once seeds are final: a preliminary list must never put a push in the queue.
  const alerts = data.seedsFinal ? queueAlerts(data.entrants, prev?.data.entrants ?? [], newKeys, latestRecap, flo?.id ?? "none", eventKey, inserted.id) : []
  let alertsQueued = 0
  if (alerts.length) {
    const { data: rowsIn } = await supabase.from("super32_live_alerts").upsert(alerts, { onConflict: "dedupe_key", ignoreDuplicates: true }).select("id")
    alertsQueued = rowsIn?.length ?? 0
  }
  // One championship-side list waits at a time: a newer one replaces any older one not yet sent,
  // and when nobody linked is unbeaten any more, a waiting list is untrue and goes too.
  const unbeatenNow = data.entrants.some((e) => e.status === "alive" && e.bouts.some((b) => b.winType !== "BYE"))
  if (alerts.some((a) => a.kind === "champ_side") || !unbeatenNow) {
    await supabase.from("super32_live_alerts").update({ status: "dismissed" })
      .eq("event_key", eventKey).eq("kind", "champ_side").in("status", ["pending", "held"]).neq("snapshot_id", inserted.id)
  }
  return { id: inserted.id, data, alertsQueued }
}

/**
 * Two alerts, nothing else (Matt, 24 Oct):
 * - Huge and Big wins new in this update, one push for the lot. Sent automatically.
 * - Who is still unbeaten on the championship side (wrestled, no loss), when that list changed.
 *   Waits for Matt to send; a newer one replaces an older one still waiting.
 * Every NC entrant counts, linked to a profile or not: Ellis Chia's Huge win had no push because
 * he has no profile (24 Oct). The NC test (team code, NOT_NC) already ran on the entrant list.
 */
export function queueAlerts(
  entrants: SnapshotEntrant[],
  prevEntrants: SnapshotEntrant[],
  newKeys: Set<string>,
  _latestRecap: SnapshotRecap | null,
  floId: string,
  eventKey: string,
  snapshotId: string,
) {
  const id = (e: { gender: string; weight: string; name: string }) => `${e.gender}|${e.weight}|${e.name}`
  const named = entrants
  const short = (e: SnapshotEntrant) => `${e.name} (${e.gender === "girls" ? "G" : ""}${e.weight})`
  const out: Array<Record<string, unknown>> = []

  // Sunday (day two) every NC boys win alerts: the four left are fighting for the blood round and
  // All-American (Matt, 25 Oct). Huge and Big keep their labels; any other win reads "NC WIN".
  const dayTwo = Date.now() >= new Date("2026-10-25T10:00:00Z").getTime()
  // An All-American clinch always pushes, boys or girls, whatever the opponent's seed: Ella
  // Taylor's quarterfinal win over an unseeded girl sent nothing (25 Oct).
  const before = new Map(prevEntrants.map((e) => [id(e), e]))
  const newlyAA = (e: SnapshotEntrant) => e.aaClinched && !before.get(id(e))?.aaClinched
  const counts = (e: SnapshotEntrant, b: SnapshotEntrant["bouts"][number]) =>
    b.win && newKeys.has(b.key) && !/^(bye|for|m ?for|ff|mff)$/i.test(b.winType.trim()) &&
    (b.tier === "huge" || b.tier === "big" || (dayTwo && e.gender === "boys") || newlyAA(e))
  const wins = named.flatMap((e) => e.bouts.filter((b) => counts(e, b)).map((b) => ({ e, b })))
  const rank = (t: string | null) => (t === "huge" ? 0 : t === "big" ? 1 : 2)
  wins.sort((x, y) => rank(x.b.tier) - rank(y.b.tier))
  if (wins.length) {
    const nHuge = wins.filter((w) => w.b.tier === "huge").length
    const nBig = wins.filter((w) => w.b.tier === "big").length
    const word = (t: string | null) => (t === "huge" ? "HUGE" : t === "big" ? "BIG" : "NC WIN")
    const standing = (e: SnapshotEntrant) => e.aaClinched ? `${e.wins}-${e.losses}, an All-American` : e.status === "alive" ? `${e.wins}-0` : `${e.wins}-${e.losses}, alive`
    const title = wins.length === 1
      ? (wins[0]!.e.aaClinched ? `${wins[0]!.e.name} is a Super 32 All-American!` : wins[0]!.b.tier === "huge" || wins[0]!.b.tier === "big" ? `${word(wins[0]!.b.tier)} WIN for North Carolina at Super 32` : `${wins[0]!.e.name} wins at Super 32`)
      : nHuge + nBig ? `Super 32: ${[nHuge ? `${nHuge} HUGE` : "", nBig ? `${nBig} BIG` : "", wins.length - nHuge - nBig ? `${wins.length - nHuge - nBig} more` : ""].filter(Boolean).join(" + ")} wins for NC` : `Super 32: ${wins.length} NC wins`
    let body = ""
    let shown = 0
    for (const { e, b } of wins) {
      const opp = b.opponentSeed ? `#${b.opponentSeed} seed ${b.opponent}` : b.opponent
      const line = `${word(b.tier)}: ${short(e)} def. ${opp} (${b.opponentTeam}), ${b.round}. Now ${standing(e)}.`
      if ((body + " " + line).length > 230) break
      body = body ? `${body} ${line}` : line
      shown += 1
    }
    if (shown < wins.length) body += ` +${wins.length - shown} more in Super 32 HQ.`
    // A clinch that came by forfeit is not a listed win, so say how it was clinched (Yates, 25 Oct).
    for (const { e } of wins.slice(0, shown)) {
      const fft = e.aaClinched ? e.bouts.find((b) => b.win && newKeys.has(b.key) && /^(for|m ?for|ff|mff|inj)/i.test(b.winType.trim())) : undefined
      if (fft) body += ` Clinched All-American with a ${/^m/i.test(fft.winType.trim()) ? "medical " : ""}forfeit win over ${fft.opponent} (${fft.opponentTeam}), ${fft.round}.`
    }
    out.push({ event_key: eventKey, dedupe_key: `wins:${floId}`, kind: nHuge ? "huge" : "big", title, body, path: LIVE_PATH, status: "pending", snapshot_id: snapshotId })
  }

  const unbeaten = (list: SnapshotEntrant[]) => list.filter((e) => e.status === "alive" && e.bouts.some((b) => b.winType !== "BYE"))
  const now = unbeaten(entrants)
  const was = new Set(unbeaten(prevEntrants).map(id))
  const changed = now.length !== was.size || now.some((e) => !was.has(id(e)))
  if (changed && now.length) {
    const title = `Super 32: ${now.length} NC ${now.length === 1 ? "wrestler" : "wrestlers"} still in the championship bracket`
    let body = ""
    const names = now.map(short)
    let i = 0
    for (; i < names.length; i++) {
      const next = body ? `${body}, ${names[i]}` : names[i]!
      if (next.length > 210) break
      body = next
    }
    if (i < names.length) body += ` +${names.length - i} more`
    out.push({ event_key: eventKey, dedupe_key: `champ:${floId}`, kind: "champ_side", title, body: `Unbeaten so far: ${body}.`, path: LIVE_PATH, status: "pending", snapshot_id: snapshotId })
  }
  return out
}
