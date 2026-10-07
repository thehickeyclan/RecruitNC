/**
 * Two scouting reports, lined up row by row, with the edge on each row decided here.
 *
 * Every edge is a rule a coach could check by hand — a lower state place, more nationally ranked
 * wins, a higher GPA — and every row says why it went the way it did, or why it went nowhere.
 * There is no overall score: "better for our program" depends on the program, so the page
 * tallies edges by category and leaves the weighing to the coach.
 *
 * Absences are stated, never left blank. A row with nothing on file says so, because an empty
 * cell reads as zero and a missing fact gets filled in by whoever reads it.
 */
import type { ScoutingReport, ScoutingReportResultRow } from "@/lib/scouting-report"
import { competitionLine, stylesLine } from "@/lib/wrestling-style"
import { accoladeLineWithRank } from "@/lib/significant-wins"
import { isTeamBlindEvent } from "@/lib/strength-of-competition"

export type ComparisonReport = Omit<ScoutingReport, "summary">

export type RowGroup = "competition" | "tournaments" | "rankings" | "academics" | "profile"
export type RowEdge = "left" | "right" | null

export type ComparisonCell = {
  /** The one line shown in the table. */
  value: string
  /** The evidence behind it, shown when the row is opened. */
  lines?: string[]
}

export type ComparisonRow = {
  key: string
  group: RowGroup
  label: string
  left: ComparisonCell
  right: ComparisonCell
  edge: RowEdge
  /** Why the edge went that way, or why there is none. */
  basis: string | null
  /** Shown before the coach changes anything. Tournament rows start off and are picked. */
  defaultOn: boolean
}

const NOT_ON_FILE = "Nothing on file"

function surname(report: ComparisonReport): string {
  const parts = report.identity.name.trim().split(/\s+/)
  return parts[parts.length - 1] ?? report.identity.name
}

function ordinal(place: number): string {
  if (place === 1) return "Champion"
  const mod = place % 100
  if (mod >= 11 && mod <= 13) return `${place}th`
  const last = place % 10
  return `${place}${last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th"}`
}

/** Higher is better; equal or missing on either side is no edge. */
function higher(a: number | null, b: number | null): RowEdge {
  if (a == null || b == null || a === b) return null
  return a > b ? "left" : "right"
}

/** Lower is better (places, ranks). */
function lower(a: number | null, b: number | null): RowEdge {
  if (a == null || b == null || a === b) return null
  return a < b ? "left" : "right"
}

function num(raw: string | null | undefined): number | null {
  const n = Number(String(raw ?? "").replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}

function addRecords(records: Array<string | null | undefined>): { wins: number; losses: number } | null {
  let wins = 0
  let losses = 0
  let any = false
  for (const r of records) {
    const m = String(r ?? "").match(/(\d+)\s*-\s*(\d+)/)
    if (!m) continue
    any = true
    wins += Number(m[1])
    losses += Number(m[2])
  }
  return any ? { wins, losses } : null
}

/* ------------------------------------------------------------------ competition */

function footprintRow(l: ComparisonReport, r: ComparisonReport): ComparisonRow {
  // Individual events only: team duals are ingested for NC United squads and nobody else, so
  // counting them would rank our own wrestlers above identical ones from another club.
  const individual = (report: ComparisonReport) =>
    report.competition.nationalEvents.filter((e) => isTeamBlindEvent(e) && !/tournament of champions/i.test(e))
  const ln = individual(l).length
  const rn = individual(r).length
  const edge = higher(ln, rn)
  return {
    key: "footprint",
    group: "competition",
    label: "National or NC only",
    left: { value: competitionLine(l.competition), lines: [`Styles: ${stylesLine(l.competition)}`] },
    right: { value: competitionLine(r.competition), lines: [`Styles: ${stylesLine(r.competition)}`] },
    edge,
    basis: edge
      ? `More individual national events (${Math.max(ln, rn)} to ${Math.min(ln, rn)}); team duals not counted`
      : ln === 0
        ? "Neither has an individual national event on file"
        : `Same number of individual national events (${ln})`,
    defaultOn: true,
  }
}

/** Per-season weight ranges, oldest first. */
function weightRanges(results: ScoutingReportResultRow[]): string[] {
  const byYear = new Map<number, number[]>()
  for (const row of results) {
    const w = num(row.weight)
    if (w == null || !Number.isFinite(row.year)) continue
    byYear.set(row.year, [...(byYear.get(row.year) ?? []), w])
  }
  return [...byYear.keys()]
    .sort((a, b) => a - b)
    .map((year) => {
      const ws = byYear.get(year)!
      const lo = Math.min(...ws)
      const hi = Math.max(...ws)
      return `${year}: ${lo === hi ? lo : `${lo}–${hi}`}`
    })
}

function weightCell(report: ComparisonReport): ComparisonCell {
  const ranges = weightRanges(report.results)
  const listed = report.identity.weightClass ? `${report.identity.weightClass} listed` : null
  const latest = ranges[ranges.length - 1] ?? null
  const lines = [...ranges].reverse()
  if (report.identity.collegeWeightClass) lines.push(`Projects ${report.identity.collegeWeightClass} in college (athlete-stated)`)
  return {
    value: [latest, listed].filter(Boolean).join(" · ") || "No weights on file",
    lines,
  }
}

function weightRow(l: ComparisonReport, r: ComparisonReport): ComparisonRow {
  return {
    key: "weight",
    group: "competition",
    label: "Weight by season",
    left: weightCell(l),
    right: weightCell(r),
    edge: null,
    basis: "Information only — weight is a fit question, not a better-or-worse one",
    defaultOn: true,
  }
}

function stateRows(report: ComparisonReport): ScoutingReportResultRow[] {
  return report.results.filter((row) => row.event === "NCHSAA State Championships")
}

function stateRow(l: ComparisonReport, r: ComparisonReport): ComparisonRow {
  const cell = (report: ComparisonReport): ComparisonCell => {
    const rows = stateRows(report)
    if (!rows.length) return { value: "No state tournament on file" }
    const placed = rows.filter((row) => row.place != null)
    const best = [...placed].sort((a, b) => a.place! - b.place! || b.year - a.year)[0]
    return {
      value: best ? `${best.year} ${best.detail}` : `Qualified ${rows.length}×, did not place`,
      lines: rows.map((row) => `${row.year} · ${row.detail}`),
    }
  }
  const bestOf = (report: ComparisonReport) => {
    const places = stateRows(report).map((row) => row.place).filter((p): p is number => p != null)
    return places.length ? Math.min(...places) : null
  }
  const lb = bestOf(l)
  const rb = bestOf(r)
  let edge: RowEdge = lower(lb, rb)
  let basis: string
  if (lb != null && rb == null) {
    edge = "left"
    basis = `Only ${surname(l)} has placed at states`
  } else if (rb != null && lb == null) {
    edge = "right"
    basis = `Only ${surname(r)} has placed at states`
  } else if (edge) {
    basis = `Best finish: ${ordinal(Math.min(lb!, rb!))} against ${ordinal(Math.max(lb!, rb!))}`
  } else {
    basis = lb == null ? "Neither has placed at states" : `Same best finish (${ordinal(lb)})`
  }
  // A 1A title and a 4A title are different things; the coach should see that next to the edge.
  const classOf = (report: ComparisonReport) => {
    const best = stateRows(report).filter((row) => row.place != null).sort((a, b) => a.place! - b.place!)[0]
    return best ? best.detail.split(" · ")[0] : null
  }
  const lc = classOf(l)
  const rc = classOf(r)
  if (lc && rc && lc !== rc) basis += ` (different classifications: ${lc} and ${rc})`
  return { key: "state", group: "competition", label: "NC state placement", left: cell(l), right: cell(r), edge, basis, defaultOn: true }
}

function winLine(win: ComparisonReport["significantWins"][number]): string {
  const accolade = accoladeLineWithRank(win)
  return [
    `${win.opponent}${accolade ? ` (${accolade})` : ""}`,
    win.result,
    [win.event, win.date].filter(Boolean).join(", ") || null,
  ]
    .filter(Boolean)
    .join(" — ")
}

function strengthRow(l: ComparisonReport, r: ComparisonReport): ComparisonRow {
  const cell = (report: ComparisonReport): ComparisonCell => {
    const s = report.strengthOfCompetition
    const w = s.rankedWins
    const value = w.total
      ? `${w.total} ranked ${w.total === 1 ? "win" : "wins"}${w.national ? ` · ${w.national} over nationally ranked` : ""}`
      : "No wins over ranked opponents on file"
    const lines = [
      `Grade: ${s.grade.label}`,
      ...report.significantWins.slice(0, 10).map((win) => `Beat ${winLine(win)}`),
      ...report.significantLosses.slice(0, 5).map((loss) => `Lost to ${winLine(loss)}`),
    ]
    if (s.season) {
      lines.push(
        `${s.seasonLabel ?? "Latest season"}: ${s.season.wins}-${s.season.losses}` +
          (s.season.vsElite ? `, ${s.season.eliteWins}-${s.season.eliteLosses} against elite opponents` : ""),
      )
    }
    if (s.recordsBeginYear) lines.push(`Records on file from ${s.recordsBeginYear}`)
    return { value, lines }
  }
  const lw = l.strengthOfCompetition.rankedWins
  const rw = r.strengthOfCompetition.rankedWins
  let edge = higher(lw.national, rw.national)
  let basis: string
  if (edge) {
    basis = `More wins over nationally ranked opponents (${Math.max(lw.national, rw.national)} to ${Math.min(lw.national, rw.national)})`
  } else if ((edge = higher(lw.total, rw.total))) {
    basis = `More wins over ranked opponents (${Math.max(lw.total, rw.total)} to ${Math.min(lw.total, rw.total)})`
  } else if ((edge = higher(l.strengthOfCompetition.grade.score, r.strengthOfCompetition.grade.score))) {
    basis = "Same ranked wins; tougher competitive footprint (grade)"
  } else {
    basis = lw.total ? `Same ranked wins (${lw.total})` : "Neither has a win over a ranked opponent on file"
  }
  return { key: "strength", group: "competition", label: "Strength of opponents", left: cell(l), right: cell(r), edge, basis, defaultOn: true }
}

function recordRow(l: ComparisonReport, r: ComparisonReport): ComparisonRow {
  const cell = (report: ComparisonReport): ComparisonCell => {
    const s = report.strengthOfCompetition.season
    return {
      value: report.careerRecord ? `${report.careerRecord} career` : s ? `${s.wins}-${s.losses} (${report.strengthOfCompetition.seasonLabel ?? "latest season"})` : NOT_ON_FILE,
      lines: s ? [`${report.strengthOfCompetition.seasonLabel ?? "Latest season"}: ${s.wins}-${s.losses}${s.bonusRate != null ? `, ${s.bonusRate}% of wins with bonus points` : ""}`] : [],
    }
  }
  return {
    key: "record",
    group: "competition",
    label: "Win-loss record",
    left: cell(l),
    right: cell(r),
    edge: null,
    basis: "Information only — records depend on the schedule, which strength of opponents measures",
    defaultOn: false,
  }
}

/* ------------------------------------------------------------------ tournaments */

/** National events a coach can switch on, in the order they are offered. */
export const TOURNAMENT_FAMILIES: Array<{ key: string; label: string; match: RegExp; duals?: boolean }> = [
  { key: "nhsca", label: "NHSCA Nationals", match: /nhsca(?!.*duals)/i },
  { key: "super32", label: "Super 32", match: /^super 32$/i },
  { key: "earlyentry", label: "Super 32 Early Entry", match: /early entry/i },
  { key: "journeymen", label: "Journeymen", match: /journeymen/i },
  { key: "fargo", label: "Fargo", match: /fargo/i },
  { key: "i64", label: "I-64 Duals", match: /i-64|interstate 64/i, duals: true },
  { key: "toc", label: "Tournament of Champions", match: /tournament of champions|\btoc\b/i },
]

function familyRows(report: ComparisonReport, match: RegExp): ScoutingReportResultRow[] {
  return report.results.filter((row) => match.test(row.event))
}

function tournamentRow(
  family: (typeof TOURNAMENT_FAMILIES)[number],
  l: ComparisonReport,
  r: ComparisonReport,
): ComparisonRow | null {
  const lr = familyRows(l, family.match)
  const rr = familyRows(r, family.match)
  if (!lr.length && !rr.length) return null
  const cell = (rows: ScoutingReportResultRow[]): ComparisonCell => {
    if (!rows.length) return { value: "Did not enter" }
    if (family.duals) {
      // A dual has no placings; the record is the result.
      const total = addRecords(rows.map((row) => row.record))
      return {
        value: total ? `${total.wins}-${total.losses} across ${rows.length} ${rows.length === 1 ? "event" : "events"}` : `Entered ${rows.length}×, no record on file`,
        lines: rows.map((row) => `${row.year} ${row.event}${row.record ? ` · ${row.record}` : ""}`),
      }
    }
    const best = rows.filter((row) => row.place != null).sort((a, b) => a.place! - b.place! || b.year - a.year)[0]
    const total = addRecords(rows.map((row) => row.record))
    return {
      value: [
        best ? `Best: ${ordinal(best.place!)} (${best.year})` : `Entered ${rows.length}×, did not place`,
        total ? `${total.wins}-${total.losses} overall` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      lines: rows.map((row) => `${row.year} ${row.event} · ${row.detail}`),
    }
  }
  const best = (rows: ScoutingReportResultRow[]) => {
    const places = rows.map((row) => row.place).filter((p): p is number => p != null)
    return places.length ? Math.min(...places) : null
  }
  let edge: RowEdge = null
  let basis: string
  if (!lr.length || !rr.length) {
    // Entering is covered by "National or NC only"; not entering one event is not a loss at it.
    basis = `Only ${surname(lr.length ? l : r)} entered — no comparison`
  } else if (family.duals) {
    const lt = addRecords(lr.map((row) => row.record))
    const rt = addRecords(rr.map((row) => row.record))
    const pct = (t: { wins: number; losses: number } | null) => (t && t.wins + t.losses ? t.wins / (t.wins + t.losses) : null)
    edge = higher(pct(lt), pct(rt))
    basis = edge ? "Better win rate" : "Same win rate, or no record on file"
  } else {
    const lb = best(lr)
    const rb = best(rr)
    if (lb != null && rb == null) {
      edge = "left"
      basis = `Only ${surname(l)} placed`
    } else if (rb != null && lb == null) {
      edge = "right"
      basis = `Only ${surname(r)} placed`
    } else if ((edge = lower(lb, rb))) {
      basis = `Best finish: ${ordinal(Math.min(lb!, rb!))} against ${ordinal(Math.max(lb!, rb!))}`
    } else {
      const lt = addRecords(lr.map((row) => row.record))
      const rt = addRecords(rr.map((row) => row.record))
      const pct = (t: { wins: number; losses: number } | null) => (t && t.wins + t.losses ? t.wins / (t.wins + t.losses) : null)
      edge = higher(pct(lt), pct(rt))
      basis = edge
        ? `${lb != null ? `Same best finish (${ordinal(lb)}); ` : "Neither placed; "}better win rate there`
        : lb != null
          ? `Same best finish (${ordinal(lb)})`
          : "Neither placed"
    }
  }
  return { key: family.key, group: "tournaments", label: family.label, left: cell(lr), right: cell(rr), edge, basis, defaultOn: false }
}

/* ------------------------------------------------------------------ rankings */

function nationalRankRow(l: ComparisonReport, r: ComparisonReport): ComparisonRow {
  const cell = (report: ComparisonReport): ComparisonCell => {
    const series = report.nationalRankings
    if (!series.length) return { value: "Not nationally ranked" }
    const best = [...series].sort((a, b) => a.current - b.current)[0]!
    return {
      value: `#${best.current} ${best.sourceLabel}`,
      lines: series.map((s) => {
        const e = s.editions[0]
        return `#${s.current} ${s.sourceLabel}${e ? ` · ${e.rankingMonth}${e.weightClass ? ` · ${e.weightClass}` : ""}${e.rankBasis === "weight" ? " (by weight)" : ""}` : ""}`
      }),
    }
  }
  const ls = l.nationalRankings
  const rs = r.nationalRankings
  let edge: RowEdge = null
  let basis: string
  if (ls.length && !rs.length) {
    edge = "left"
    basis = `Only ${surname(l)} is nationally ranked`
  } else if (rs.length && !ls.length) {
    edge = "right"
    basis = `Only ${surname(r)} is nationally ranked`
  } else if (!ls.length) {
    basis = "Neither is nationally ranked"
  } else {
    // Ranks only compare on one list ranked across the board; two weight lists are two boards.
    const shared = ls.find(
      (s) => s.editions[0]?.rankBasis === "overall" && rs.some((t) => t.source === s.source && t.editions[0]?.rankBasis === "overall"),
    )
    const other = shared ? rs.find((t) => t.source === shared.source) : undefined
    edge = shared && other ? lower(shared.current, other.current) : null
    basis = edge
      ? `${shared!.sourceLabel}: #${Math.min(shared!.current, other!.current)} against #${Math.max(shared!.current, other!.current)}`
      : "Both nationally ranked, on lists that don't compare directly"
  }
  return { key: "national-rank", group: "rankings", label: "National ranking", left: cell(l), right: cell(r), edge, basis, defaultOn: true }
}

function stateRankRow(l: ComparisonReport, r: ComparisonReport): ComparisonRow {
  // Only the published cut is a ranking; past it is an unranked pool (rankings stop at 30).
  const rank = (report: ComparisonReport) => (report.rankingPublished ? report.prospectRanking : null)
  const cell = (report: ComparisonReport): ComparisonCell => {
    const n = rank(report)
    return { value: n != null ? `#${n} in the Class of ${report.identity.graduationYear}` : "Not ranked" }
  }
  const lr = rank(l)
  const rr = rank(r)
  const sameClass = l.identity.graduationYear != null && l.identity.graduationYear === r.identity.graduationYear
  let edge: RowEdge = null
  let basis: string
  if (lr == null && rr == null) basis = "Neither is ranked"
  else if (!sameClass) basis = "Different classes are ranked on different boards"
  else if (rr == null) {
    edge = "left"
    basis = `Only ${surname(l)} is ranked`
  } else if (lr == null) {
    edge = "right"
    basis = `Only ${surname(r)} is ranked`
  } else {
    edge = lower(lr, rr)
    basis = `#${Math.min(lr, rr)} against #${Math.max(lr, rr)} on the same board`
  }
  return { key: "state-rank", group: "rankings", label: "RecruitNC ranking", left: cell(l), right: cell(r), edge, basis, defaultOn: true }
}

function starRow(l: ComparisonReport, r: ComparisonReport, personal: boolean): ComparisonRow {
  const cell = (report: ComparisonReport): ComparisonCell => {
    if (!personal) return { value: "Verified college coaches only" }
    const s = report.starRating
    if (!s) {
      // No star is not a low star: say which rule left the row empty.
      const female = String(report.identity.gender ?? "").trim().toLowerCase() === "female"
      return {
        value: female
          ? "Not rated (girls are not rated yet)"
          : `Not rated (Class of ${report.identity.graduationYear ?? "?"} not rated yet)`,
      }
    }
    return {
      value: `${"★".repeat(s.stars)}${"☆".repeat(5 - s.stars)}${s.provisional ? " (provisional)" : ""}`,
      lines: [s.floor, ...s.components.map((c) => `${c.label} ${c.points}/${c.max}: ${c.detail}`)].filter(
        (line): line is string => Boolean(line && line.trim()),
      ),
    }
  }
  const ls = personal ? l.starRating?.stars ?? null : null
  const rs = personal ? r.starRating?.stars ?? null : null
  const edge = higher(ls, rs)
  return {
    key: "stars",
    group: "rankings",
    label: "Star rating",
    left: cell(l),
    right: cell(r),
    edge,
    basis: edge ? `${Math.max(ls!, rs!)} stars against ${Math.min(ls!, rs!)}` : ls != null && ls === rs ? `Both ${ls} stars` : null,
    defaultOn: personal,
  }
}

/* ------------------------------------------------------------------ academics */

function academicRow(
  key: "gpa" | "sat" | "act" | "interest",
  label: string,
  l: ComparisonReport,
  r: ComparisonReport,
  personal: boolean,
): ComparisonRow {
  const pick = (report: ComparisonReport) =>
    key === "gpa" ? report.academics.gpa : key === "sat" ? report.academics.sat : key === "act" ? report.academics.act : report.academics.academicInterest
  const cell = (report: ComparisonReport): ComparisonCell => ({
    value: personal ? pick(report) ?? "Not on file" : "Verified college coaches only",
  })
  let edge: RowEdge = null
  let basis: string | null = null
  if (personal && key !== "interest") {
    const ln = num(pick(l))
    const rn = num(pick(r))
    edge = higher(ln, rn)
    basis = edge
      ? `${Math.max(ln!, rn!)} against ${Math.min(ln!, rn!)}`
      : ln == null && rn == null
        ? "Not on file for either"
        : ln == null || rn == null
          ? `Only ${surname(ln == null ? r : l)} has one on file`
          : "Even"
  } else if (key === "interest") {
    basis = "Information only — match it against the majors you offer"
  }
  return { key, group: "academics", label, left: cell(l), right: cell(r), edge, basis, defaultOn: key !== "act" }
}

/* ------------------------------------------------------------------ profile */

function profileRow(key: string, label: string, pick: (report: ComparisonReport) => string | null, l: ComparisonReport, r: ComparisonReport): ComparisonRow {
  return {
    key,
    group: "profile",
    label,
    left: { value: pick(l) ?? NOT_ON_FILE },
    right: { value: pick(r) ?? NOT_ON_FILE },
    edge: null,
    basis: null,
    defaultOn: true,
  }
}

export function buildComparisonRows(
  left: ComparisonReport,
  right: ComparisonReport,
  options: { personal: boolean },
): ComparisonRow[] {
  const { personal } = options
  return [
    profileRow("class", "Class", (x) => (x.identity.graduationYear ? String(x.identity.graduationYear) : null), left, right),
    profileRow("school", "School", (x) => x.identity.highSchool, left, right),
    profileRow("club", "Club", (x) => x.identity.club, left, right),
    profileRow("status", "Recruiting status", (x) => (x.commitment ? `Committed: ${x.commitment}` : x.recruitingStatus), left, right),

    footprintRow(left, right),
    strengthRow(left, right),
    stateRow(left, right),
    weightRow(left, right),
    recordRow(left, right),

    ...TOURNAMENT_FAMILIES.map((family) => tournamentRow(family, left, right)).filter((row): row is ComparisonRow => row != null),

    nationalRankRow(left, right),
    stateRankRow(left, right),
    starRow(left, right, personal),

    academicRow("gpa", "GPA", left, right, personal),
    academicRow("sat", "SAT", left, right, personal),
    academicRow("act", "ACT", left, right, personal),
    academicRow("interest", "Academic interest", left, right, personal),
  ]
}
