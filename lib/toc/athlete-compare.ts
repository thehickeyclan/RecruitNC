/**
 * TOC admin: compare two athletes on credentials + direct head-to-head.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import type { NchsaaRowForProfile } from "@/lib/nchsaa-results-json"
import { loadNcUnitedResultsForNameSearch } from "@/lib/national-team-live-profile-results"
import type { TournamentResultForDisplay } from "@/lib/public-profile-data"

export type TocCompareAthleteSummary = {
  id: string
  name: string
  school: string | null
  gradYear: number | null
  weightClass: string | null
}

export type TocHeadToHeadMatch = {
  date: string | null
  tournament: string | null
  weight: string | null
  result: string | null
  method: string | null
  winnerSide: "a" | "b" | "unknown"
}

export type TocCompareDimension = {
  key: string
  label: string
  athleteA: string
  athleteB: string
  pointsA: number
  pointsB: number
  edge: "a" | "b" | "even" | "unknown"
}

export type TocAthleteCompareResult = {
  athleteA: TocCompareAthleteSummary
  athleteB: TocCompareAthleteSummary
  headToHead: {
    winsA: number
    winsB: number
    matches: TocHeadToHeadMatch[]
    summary: string
    edge: "a" | "b" | "even" | "unknown"
  }
  stateResults: { a: NchsaaRowForProfile[]; b: NchsaaRowForProfile[] }
  nhscaResults: { a: TournamentResultForDisplay[]; b: TournamentResultForDisplay[] }
  super32Results: { a: TournamentResultForDisplay[]; b: TournamentResultForDisplay[] }
  dualsResults: {
    a: { event: string; year: number; record: string }[]
    b: { event: string; year: number; record: string }[]
  }
  dimensions: TocCompareDimension[]
  scoreA: number
  scoreB: number
  recommendation: "a" | "b" | "too_close"
  summary: string
  markdown: string
}

type MatchBout = {
  date?: string
  weight?: string | number
  opponent?: string
  opponent_name?: string
  result?: string
  method?: string
  win_loss?: string
  tournament?: string
}

function parseMatchesField(value: unknown): MatchBout[] {
  if (!value) return []
  try {
    if (Array.isArray(value)) return value as MatchBout[]
    if (typeof value === "string") {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as MatchBout[]) : []
    }
  } catch {
    return []
  }
  return []
}

function parsePlacementNumber(raw: string | null | undefined): number | null {
  const s = String(raw ?? "").trim()
  if (!s) return null
  const lower = s.toLowerCase()
  if (lower.includes("champion") && !lower.includes("2")) return 1
  const m = s.match(/(\d+)/)
  if (m) {
    const n = parseInt(m[1], 10)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function placementPoints(place: number | null | undefined): number {
  if (place == null || place < 1) return 0
  if (place === 1) return 40
  if (place === 2) return 32
  if (place === 3) return 24
  if (place === 4) return 18
  if (place <= 8) return Math.max(6, 14 - place)
  return 2
}

export function recordWinPctPoints(record: string | null | undefined): number {
  const m = String(record ?? "").trim().match(/^(\d+)\s*-\s*(\d+)$/)
  if (!m) return 0
  const w = parseInt(m[1], 10)
  const l = parseInt(m[2], 10)
  const total = w + l
  if (total === 0) return 0
  return Math.round((w / total) * 12)
}

function formatStateLine(rows: NchsaaRowForProfile[]): string {
  const placers = rows.filter((r) => r.place != null && r.place >= 1)
  if (placers.length === 0) return "No state placers on file"
  const titles = placers.filter((r) => r.place === 1).length
  const best = placers.reduce((min, r) => (r.place! < min ? r.place! : min), 99)
  const recent = [...placers].sort((a, b) => b.year - a.year)[0]
  const parts = [`${titles} title${titles === 1 ? "" : "s"}`, `best ${best}${best === 1 ? "st" : best === 2 ? "nd" : best === 3 ? "rd" : "th"}`]
  if (recent) parts.push(`${recent.year} ${recent.classification} @ ${recent.weight_class} (${recent.place}${recent.place === 1 ? "st" : "th"})`)
  return parts.join(" · ")
}

function formatTournamentLines(rows: TournamentResultForDisplay[], label: string): string {
  if (rows.length === 0) return `No ${label} results on file`
  const sorted = [...rows].sort((a, b) => b.year - a.year)
  return sorted
    .slice(0, 4)
    .map((r) => {
      const p = r.placement || "—"
      const rec = r.record ? ` (${r.record})` : ""
      const wt = r.weight ? ` ${r.weight}` : ""
      return `${r.year}: ${p}${wt}${rec}`
    })
    .join("; ")
}

function formatDualsLines(
  rows: { event: string; year: number; record: string }[],
): string {
  if (rows.length === 0) return "No NHSCA Duals / NC United records on file"
  return rows
    .slice(0, 4)
    .map((r) => `${r.year} ${r.event}: ${r.record || "—"}`)
    .join("; ")
}

function scoreStateRows(rows: NchsaaRowForProfile[]): number {
  let pts = 0
  for (const r of rows) {
    pts += placementPoints(r.place)
    if (r.place === 1) pts += 8
  }
  return pts
}

function scoreTournamentRows(rows: TournamentResultForDisplay[]): number {
  let pts = 0
  for (const r of rows) {
    pts += placementPoints(parsePlacementNumber(r.placement))
    pts += recordWinPctPoints(r.record)
  }
  return pts
}

function scoreDualsRows(rows: { record: string }[]): number {
  let pts = 0
  for (const r of rows) {
    pts += recordWinPctPoints(r.record) * 2
    const m = r.record.match(/^(\d+)\s*-\s*(\d+)$/)
    if (m) {
      const w = parseInt(m[1], 10)
      pts += Math.min(w, 8)
    }
  }
  return pts
}

function edgeFromPoints(a: number, b: number): "a" | "b" | "even" | "unknown" {
  if (a === 0 && b === 0) return "unknown"
  if (Math.abs(a - b) <= 3) return "even"
  return a > b ? "a" : "b"
}

function boutWinnerSide(
  bout: MatchBout,
  nameA: string,
  nameB: string,
): "a" | "b" | "unknown" {
  const wl = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  const opponent = String(bout.opponent_name ?? bout.opponent ?? "").trim()
  const isWin = wl === "W" || wl.startsWith("W ") || wl.includes("WIN")
  const isLoss = wl === "L" || wl.startsWith("L ") || wl.includes("LOSS")
  if (!opponent) return "unknown"
  if (namesLikelySamePerson(opponent, nameB)) {
    if (isWin) return "a"
    if (isLoss) return "b"
  }
  if (namesLikelySamePerson(opponent, nameA)) {
    if (isWin) return "b"
    if (isLoss) return "a"
  }
  return "unknown"
}

export function findHeadToHeadMatches(
  bouts: MatchBout[],
  nameA: string,
  nameB: string,
): TocHeadToHeadMatch[] {
  const out: TocHeadToHeadMatch[] = []
  for (const bout of bouts) {
    const opponent = String(bout.opponent_name ?? bout.opponent ?? "").trim()
    if (!opponent) continue
    if (!namesLikelySamePerson(opponent, nameA) && !namesLikelySamePerson(opponent, nameB)) continue
    const winnerSide = boutWinnerSide(bout, nameA, nameB)
    if (winnerSide === "unknown") continue
    out.push({
      date: bout.date ?? null,
      tournament: bout.tournament ?? null,
      weight: bout.weight != null ? String(bout.weight) : null,
      result: bout.win_loss ?? bout.result ?? null,
      method: bout.method ?? null,
      winnerSide,
    })
  }
  return out
}

async function loadMatchBouts(
  supabase: SupabaseClient,
  athlete: Record<string, unknown>,
): Promise<MatchBout[]> {
  const athleteId = String(athlete.id ?? "")
  if (!athleteId) return []

  const { data: linked } = await supabase
    .from("matches")
    .select("matches, first_name, last_name")
    .eq("athlete_id", athleteId)

  let rows = linked ?? []
  if (!rows.length) {
    const fullName = String(athlete.name ?? "").trim()
    const parts = fullName.split(/\s+/)
    const first = parts[0] ?? ""
    const last = parts.slice(1).join(" ")
    if (first && last) {
      const { data: byName } = await supabase
        .from("matches")
        .select("matches, first_name, last_name")
        .ilike("first_name", first)
        .ilike("last_name", last)
      rows = byName ?? []
    }
  }

  const bouts: MatchBout[] = []
  for (const row of rows) {
    bouts.push(...parseMatchesField(row.matches))
  }
  return bouts
}

async function loadAthleteRow(supabase: SupabaseClient, athleteId: string) {
  const { data, error } = await supabase.from("athletes").select("*").eq("id", athleteId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("Athlete not found")
  return data as Record<string, unknown>
}

function toSummary(athlete: Record<string, unknown>): TocCompareAthleteSummary {
  return {
    id: String(athlete.id),
    name: String(athlete.name ?? "Unknown"),
    school: athlete.highschool != null ? String(athlete.highschool) : null,
    gradYear:
      athlete.graduationyear != null && Number.isFinite(Number(athlete.graduationyear))
        ? Number(athlete.graduationyear)
        : null,
    weightClass:
      athlete.weightclass != null ? String(athlete.weightclass) : null,
  }
}

export async function compareTocAthletes(
  supabase: SupabaseClient,
  athleteIdA: string,
  athleteIdB: string,
): Promise<TocAthleteCompareResult> {
  if (athleteIdA === athleteIdB) {
    throw new Error("Choose two different athletes to compare.")
  }

  const [rowA, rowB] = await Promise.all([
    loadAthleteRow(supabase, athleteIdA),
    loadAthleteRow(supabase, athleteIdB),
  ])

  const summaryA = toSummary(rowA)
  const summaryB = toSummary(rowB)

  const [bundleA, bundleB, dualsA, dualsB, boutsA, boutsB] = await Promise.all([
    loadAthleteTournamentBundle(supabase, rowA, { nhscaAllTime: true }),
    loadAthleteTournamentBundle(supabase, rowB, { nhscaAllTime: true }),
    loadNcUnitedResultsForNameSearch(supabase, summaryA.name, {
      athleteId: summaryA.id,
      highSchool: summaryA.school,
      gradYear: summaryA.gradYear,
      athleteRow: rowA,
    }),
    loadNcUnitedResultsForNameSearch(supabase, summaryB.name, {
      athleteId: summaryB.id,
      highSchool: summaryB.school,
      gradYear: summaryB.gradYear,
      athleteRow: rowB,
    }),
    loadMatchBouts(supabase, rowA),
    loadMatchBouts(supabase, rowB),
  ])

  const h2hFromA = findHeadToHeadMatches(boutsA, summaryA.name, summaryB.name)
  const h2hFromB = findHeadToHeadMatches(boutsB, summaryA.name, summaryB.name)
  const h2hMap = new Map<string, TocHeadToHeadMatch>()
  for (const m of [...h2hFromA, ...h2hFromB]) {
    const key = `${m.date ?? ""}|${m.tournament ?? ""}|${m.weight ?? ""}|${m.result ?? ""}|${m.winnerSide}`
    if (!h2hMap.has(key)) h2hMap.set(key, m)
  }
  const h2hMatches = [...h2hMap.values()]
  const winsA = h2hMatches.filter((m) => m.winnerSide === "a").length
  const winsB = h2hMatches.filter((m) => m.winnerSide === "b").length

  const dualsCompactA = dualsA.map((r) => ({ event: r.event, year: r.year, record: r.record ?? "" }))
  const dualsCompactB = dualsB.map((r) => ({ event: r.event, year: r.year, record: r.record ?? "" }))

  const h2hPointsA = winsA * 50 - winsB * 35
  const h2hPointsB = winsB * 50 - winsA * 35
  const statePointsA = scoreStateRows(bundleA.nchsaa)
  const statePointsB = scoreStateRows(bundleB.nchsaa)
  const nhscaPointsA = scoreTournamentRows(bundleA.nhsca)
  const nhscaPointsB = scoreTournamentRows(bundleB.nhsca)
  const super32PointsA = scoreTournamentRows(bundleA.super32)
  const super32PointsB = scoreTournamentRows(bundleB.super32)
  const dualsPointsA = scoreDualsRows(dualsCompactA)
  const dualsPointsB = scoreDualsRows(dualsCompactB)

  const dimensions: TocCompareDimension[] = [
    {
      key: "head_to_head",
      label: "Direct wins (match database)",
      athleteA: winsA > 0 || winsB > 0 ? `${winsA}-${winsB} vs ${summaryB.name.split(" ").slice(-1)[0]}` : "No meetings found",
      athleteB: winsA > 0 || winsB > 0 ? `${winsB}-${winsA} vs ${summaryA.name.split(" ").slice(-1)[0]}` : "No meetings found",
      pointsA: h2hPointsA,
      pointsB: h2hPointsB,
      edge: winsA === winsB ? (winsA === 0 ? "unknown" : "even") : winsA > winsB ? "a" : "b",
    },
    {
      key: "state",
      label: "NCHSAA state",
      athleteA: formatStateLine(bundleA.nchsaa),
      athleteB: formatStateLine(bundleB.nchsaa),
      pointsA: statePointsA,
      pointsB: statePointsB,
      edge: edgeFromPoints(statePointsA, statePointsB),
    },
    {
      key: "nhsca",
      label: "NHSCA nationals",
      athleteA: formatTournamentLines(bundleA.nhsca, "NHSCA"),
      athleteB: formatTournamentLines(bundleB.nhsca, "NHSCA"),
      pointsA: nhscaPointsA,
      pointsB: nhscaPointsB,
      edge: edgeFromPoints(nhscaPointsA, nhscaPointsB),
    },
    {
      key: "duals",
      label: "NHSCA Duals / NC United",
      athleteA: formatDualsLines(dualsCompactA),
      athleteB: formatDualsLines(dualsCompactB),
      pointsA: dualsPointsA,
      pointsB: dualsPointsB,
      edge: edgeFromPoints(dualsPointsA, dualsPointsB),
    },
    {
      key: "super32",
      label: "Super32",
      athleteA: formatTournamentLines(bundleA.super32, "Super32"),
      athleteB: formatTournamentLines(bundleB.super32, "Super32"),
      pointsA: super32PointsA,
      pointsB: super32PointsB,
      edge: edgeFromPoints(super32PointsA, super32PointsB),
    },
  ]

  const scoreA = dimensions.reduce((s, d) => s + d.pointsA, 0)
  const scoreB = dimensions.reduce((s, d) => s + d.pointsB, 0)

  let recommendation: TocAthleteCompareResult["recommendation"] = "too_close"
  if (scoreA - scoreB >= 12) recommendation = "a"
  else if (scoreB - scoreA >= 12) recommendation = "b"

  const h2hSummary =
    winsA === 0 && winsB === 0
      ? "No direct meetings found in the match database."
      : winsA === winsB
        ? `Split ${winsA}-${winsB} in direct meetings.`
        : winsA > winsB
          ? `${summaryA.name} leads the direct series ${winsA}-${winsB}.`
          : `${summaryB.name} leads the direct series ${winsB}-${winsA}.`

  const winnerName =
    recommendation === "a" ? summaryA.name : recommendation === "b" ? summaryB.name : null
  const summary =
    recommendation === "too_close"
      ? `${summaryA.name} and ${summaryB.name} are close on paper (scores ${scoreA}–${scoreB}). Review head-to-head and the most recent credentials before seeding.`
      : `${winnerName} has the stronger overall résumé for TOC seeding (${scoreA}–${scoreB}). ${h2hSummary}`

  const mdLines: string[] = [
    `## TOC compare: ${summaryA.name} vs ${summaryB.name}`,
    "",
    `**Recommendation:** ${
      recommendation === "too_close"
        ? "Too close to call — use bracket context"
        : `Lean **${winnerName}**`
    }`,
    "",
    summary,
    "",
    "### Direct wins",
    h2hSummary,
  ]
  if (h2hMatches.length > 0) {
    for (const m of h2hMatches.slice(0, 8)) {
      const who = m.winnerSide === "a" ? summaryA.name : summaryB.name
      mdLines.push(
        `- ${who} — ${m.tournament ?? "Match"}${m.date ? ` (${m.date})` : ""}${m.weight ? ` @ ${m.weight}` : ""}${m.method ? ` · ${m.method}` : ""}`,
      )
    }
  }
  mdLines.push("", "### Credential breakdown")
  for (const d of dimensions) {
    mdLines.push(`**${d.label}** (${d.pointsA} vs ${d.pointsB} pts)`)
    mdLines.push(`- ${summaryA.name}: ${d.athleteA}`)
    mdLines.push(`- ${summaryB.name}: ${d.athleteB}`)
    mdLines.push("")
  }

  return {
    athleteA: summaryA,
    athleteB: summaryB,
    headToHead: {
      winsA,
      winsB,
      matches: h2hMatches,
      summary: h2hSummary,
      edge: winsA === winsB ? (winsA === 0 ? "unknown" : "even") : winsA > winsB ? "a" : "b",
    },
    stateResults: { a: bundleA.nchsaa, b: bundleB.nchsaa },
    nhscaResults: { a: bundleA.nhsca, b: bundleB.nhsca },
    super32Results: { a: bundleA.super32, b: bundleB.super32 },
    dualsResults: { a: dualsCompactA, b: dualsCompactB },
    dimensions,
    scoreA,
    scoreB,
    recommendation,
    summary,
    markdown: mdLines.join("\n").trim(),
  }
}
