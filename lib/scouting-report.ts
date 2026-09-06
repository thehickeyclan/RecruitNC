/**
 * Scouting report for college coaches — the printable one-pager behind "Export scouting report".
 *
 * What a recruiter actually reads: who the wrestler is, what they have done, who they have
 * beaten, and who has beaten them. Deliberately NOT the full match list — a 55-bout season
 * table tells a coach nothing they can act on. Only results against wrestlers the reader has
 * heard of make the page: the TOC field and ranked prospects.
 *
 * Everything here is assembled from data already on the profile. The AI summary is written
 * from these same facts and never introduces one of its own.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { buildTocFieldBoard } from "@/lib/toc/field-board"
import { getQualifierSignificantWinBouts } from "@/lib/other-tournaments"
import { latestSeasonMatchRows } from "@/lib/toc/ai-seeding"
import {
  findSignificantLosses,
  findSignificantWins,
  type Bout,
  type OpponentIndex,
  type RankedOpponent,
  type SignificantWin,
} from "@/lib/significant-wins"
import { isBlueTeam } from "@/lib/blue-team"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { releasesPersonalData, type ScoutingAccessTier } from "@/lib/scouting-report-access"

export type ScoutingReportIdentity = {
  name: string
  /** Portrait for the file photo. Null when the athlete has none. */
  photoUrl: string | null
  highSchool: string | null
  highSchoolLogoUrl: string | null
  club: string | null
  clubLogoUrl: string | null
  graduationYear: number | null
  weightClass: string | null
  /** Weight actually wrestled most recently, when it differs from the listed one. */
  lastCompetedWeight: string | null
  gender: string | null
  state: string | null
  city: string | null
}

export type ScoutingReportAcademics = {
  gpa: string | null
  sat: string | null
  act: string | null
  /** Intended major / field of study. */
  academicInterest: string | null
  academicSummary: string | null
}

/**
 * Contact details, on the report because a recruiter's next step is a phone call.
 *
 * This is the reason the endpoint is gated: the public profile does not put a minor's cell
 * number and email on one printable page, and this does.
 */
export type ScoutingReportContact = {
  cell: string | null
  email: string | null
  highlightVideoUrl: string | null
}

export type ScoutingReportMembership = {
  /** "Blue", "Gold", or whatever the roster calls it; null when not a member. */
  ncUnitedTeam: string | null
  isBlue: boolean
}

export type ScoutingReportResultRow = {
  event: string
  year: number
  detail: string
}

export type ScoutingReport = {
  athleteId: string
  generatedAt: string
  identity: ScoutingReportIdentity
  contact: ScoutingReportContact
  academics: ScoutingReportAcademics
  membership: ScoutingReportMembership
  careerRecord: string | null
  /** State, national and qualifier results, newest first. */
  results: ScoutingReportResultRow[]
  significantWins: SignificantWin[]
  significantLosses: SignificantWin[]
  /** Written by the model from the fields above. Null when generation is unavailable. */
  summary: string | null
  recruitingStatus: string | null
  commitment: string | null
  /** RecruitNC prospect ranking, and whether that class is published. */
  prospectRanking: number | null
  rankingPublished: boolean
  /** Which field set this copy carries. */
  accessTier: ScoutingAccessTier
  /** Names who the copy was prepared for. Null on the intelligence tier. */
  watermark: string | null
}

function text(value: unknown): string | null {
  const s = String(value ?? "").trim()
  return s ? s : null
}

/**
 * The athlete's portrait, following the same precedence the profile uses.
 *
 * The silhouette placeholder counts as no photo: a scouting report with a grey outline where
 * a face should be looks worse than one with no photo block at all.
 */
function photoUrl(athlete: Record<string, unknown>): string | null {
  const candidate = text(athlete.photourl) ?? text(athlete.photo_url) ?? text(athlete.image_url)
  if (!candidate || candidate === "/wrestler-silhouette.png") return null
  return candidate
}

function ordinal(place: number): string {
  const mod = place % 100
  if (mod >= 11 && mod <= 13) return `${place}th`
  if (place % 10 === 1) return `${place}st`
  if (place % 10 === 2) return `${place}nd`
  if (place % 10 === 3) return `${place}rd`
  return `${place}th`
}

/**
 * Every TOC-field name and every ranked athlete — the bar a result must clear to appear.
 *
 * Ranked includes classes that are not published yet: a win over the boy we privately have
 * at #3 in 2029 is no less real, and only the fact of the ranking is used, never the number.
 */
export async function loadOpponentIndex(supabase: SupabaseClient): Promise<OpponentIndex> {
  const { data: invitations } = await supabase.from("toc_invitations").select("*, athletes(id,name)")
  const tocField = buildTocFieldBoard(invitations ?? [])
    .weights.flatMap((weight) =>
      weight.athletes.filter((a) => a.status === "confirmed").map((a) => a.name),
    )
    .filter(Boolean)

  // PostgREST caps a request at 1000 rows and there are more ranked athletes than that.
  const ranked: RankedOpponent[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("athletes")
      .select("name,prospect_ranking,graduationyear")
      .not("prospect_ranking", "is", null)
      .range(from, from + 999)
    if (!data?.length) break
    for (const row of data) {
      if (row.name) {
        ranked.push({
          name: String(row.name),
          ranking: row.prospect_ranking == null ? null : Number(row.prospect_ranking),
          graduationYear: row.graduationyear == null ? null : Number(row.graduationyear),
        })
      }
    }
    if (data.length < 1000) break
  }

  return { tocField, ranked }
}

/** Tournament results flattened into printable lines, newest first. */
function buildResultRows(bundle: {
  nchsaa: Array<{ year: number; place: number | null; classification: string; weight_class: string }>
  nhsca: Array<{ year: number; placement?: string; record?: string; weight?: string }>
  super32: Array<{ year: number; placement?: string; record?: string; weight?: string }>
  fargo: Array<{ year: number; placement?: string; record?: string; weight?: string; division?: string }>
  other: Array<{ year: number; eventShortName: string; placement: number | null; record: string; weight: string; qualified: boolean }>
}): ScoutingReportResultRow[] {
  const rows: ScoutingReportResultRow[] = []

  for (const r of bundle.nchsaa ?? []) {
    const place = r.place && r.place > 0 ? (r.place === 1 ? "Champion" : ordinal(r.place)) : "Qualifier"
    rows.push({ event: "NCHSAA States", year: r.year, detail: `${r.classification} · ${r.weight_class} · ${place}` })
  }
  const national: Array<[string, typeof bundle.nhsca]> = [
    ["NHSCA Nationals", bundle.nhsca ?? []],
    ["Super 32", bundle.super32 ?? []],
    ["Fargo Nationals", bundle.fargo ?? []],
  ]
  for (const [label, list] of national) {
    for (const r of list) {
      const detail = [r.weight, r.placement, r.record ? `${r.record} record` : ""].filter(Boolean).join(" · ")
      if (detail) rows.push({ event: label, year: r.year, detail })
    }
  }
  for (const r of bundle.other ?? []) {
    const place = r.placement ? (r.placement === 1 ? "Champion" : ordinal(r.placement)) : "did not place"
    const detail = [r.weight, place, r.record ? `${r.record} record` : "", r.qualified ? "Super 32 qualifier" : ""]
      .filter(Boolean)
      .join(" · ")
    rows.push({ event: r.eventShortName, year: r.year, detail })
  }

  return rows.sort((a, b) => b.year - a.year || a.event.localeCompare(b.event))
}

/**
 * Contact details as stored on `athletes`.
 *
 * The column names differ from the field names the profile forms post, which is exactly how
 * this went wrong once: the report read `gpa` / `contact_email` / `career_record`, none of
 * which are columns, and every report rendered blank without erroring. Kept as a pure
 * function so a rename shows up as a failing test rather than an empty section.
 */
export function mapContact(athlete: Record<string, unknown>, personal: boolean): ScoutingReportContact {
  return {
    cell: personal ? text(athlete.phone ?? athlete.cell ?? athlete.cell_number) : null,
    email: personal ? text(athlete.contactEmail ?? athlete.contact_email ?? athlete.email) : null,
    // Film is promotional and the athlete publishes it themselves — not personal data.
    highlightVideoUrl: text(athlete.highlight_video_url),
  }
}

/** Academics as stored on `athletes` — the `academic_*` columns, not bare `gpa`/`sat`/`act`. */
export function mapAcademics(
  athlete: Record<string, unknown>,
  personal: boolean,
): ScoutingReportAcademics {
  return {
    gpa: personal ? text(athlete.academic_gpa) : null,
    sat: personal ? text(athlete.academic_sat) : null,
    act: personal ? text(athlete.academic_act) : null,
    // Intended major is what a wrestler puts on a recruiting profile to be found.
    academicInterest: text(athlete.academic_interest),
    academicSummary: personal ? text(athlete.academic_summary) : null,
  }
}

/** Career record — stored camelCase on `athletes`. */
export function mapCareerRecord(athlete: Record<string, unknown>): string | null {
  return text(athlete.careerRecord ?? athlete.career_record)
}

/**
 * Assemble everything the report needs. The caller supplies the opponent index so a batch
 * export builds it once rather than per athlete.
 */
export async function buildScoutingReport(
  supabase: SupabaseClient,
  athlete: Record<string, unknown>,
  opponentIndex: OpponentIndex,
  /**
   * Contact and academics are withheld here rather than hidden in the UI. A report that
   * renders them and relies on CSS still returns a minor's cell number to anyone who can
   * call the endpoint.
   */
  accessTier: ScoutingAccessTier = "intelligence",
  watermark: string | null = null,
): Promise<Omit<ScoutingReport, "summary">> {
  const personal = releasesPersonalData(accessTier)
  const athleteId = String(athlete.id)

  const [bundle, { data: matchRows }, qualifierBouts] = await Promise.all([
    loadAthleteTournamentBundle(supabase, athlete),
    supabase.from("matches").select("season,matches").eq("athlete_id", athleteId),
    getQualifierSignificantWinBouts(supabase, athleteId, "all").catch(() => [] as Bout[]),
  ])

  const seasonBouts: Bout[] = latestSeasonMatchRows((matchRows ?? []) as never).flatMap((row) => {
    try {
      const value = (row as { matches?: unknown }).matches
      return Array.isArray(value) ? value : JSON.parse(String(value ?? "[]"))
    } catch {
      return []
    }
  })
  const bouts: Bout[] = [...seasonBouts, ...qualifierBouts]

  const lastCompeted = (athlete as { profile_weight_display?: { lastCompeted?: { weight?: string } } })
    ?.profile_weight_display?.lastCompeted?.weight

  const ncUnitedTeam = text(athlete.ncUnitedTeam)
  const gradYear = athlete.graduationyear == null ? null : Number(athlete.graduationyear)
  const rawRank = athlete.prospect_ranking == null ? null : Number(athlete.prospect_ranking)
  const ranking = rawRank != null && Number.isFinite(rawRank) && rawRank >= 1 ? rawRank : null
  return {
    athleteId,
    generatedAt: new Date().toISOString(),
    identity: {
      name: String(athlete.name ?? "Athlete"),
      photoUrl: photoUrl(athlete),
      highSchool: text(athlete.highschool ?? athlete.high_school),
      highSchoolLogoUrl: text(athlete.highSchoolLogoUrl),
      club: text(athlete.wrestlingClub),
      clubLogoUrl: text(athlete.wrestlingClubLogoUrl),
      graduationYear: athlete.graduationyear == null ? null : Number(athlete.graduationyear),
      weightClass: text(athlete.weightclass ?? athlete.weight_class),
      lastCompetedWeight: text(lastCompeted),
      gender: text(athlete.gender),
      state: text(athlete.state),
      city: text(athlete.city),
    },
    contact: mapContact(athlete, personal),
    academics: mapAcademics(athlete, personal),
    membership: {
      ncUnitedTeam: ncUnitedTeam && ncUnitedTeam.toLowerCase() !== "none" ? ncUnitedTeam : null,
      isBlue: isBlueTeam(athlete),
    },
    careerRecord: mapCareerRecord(athlete),
    results: buildResultRows(bundle as never),
    significantWins: findSignificantWins(bouts, opponentIndex),
    significantLosses: findSignificantLosses(bouts, opponentIndex),
    recruitingStatus: text(athlete.recruiting_status),
    commitment: text(athlete.college),
    accessTier,
    watermark,
    prospectRanking: ranking,
    rankingPublished:
      ranking != null &&
      isPublicRankingsYearPublished(gradYear) &&
      ranking <= getPublicRankingsMax(gradYear),
  }
}

/**
 * The facts, flattened for the model. Kept separate from the prompt so what the model is
 * allowed to see is reviewable in one place — it writes from this and nothing else.
 */
export function summaryFacts(report: Omit<ScoutingReport, "summary">): string {
  const { identity, academics, membership } = report
  const lines: string[] = [
    `Name: ${identity.name}`,
    identity.graduationYear ? `Class of ${identity.graduationYear}` : "",
    identity.highSchool ? `High school: ${identity.highSchool}` : "",
    identity.club ? `Club: ${identity.club}` : "",
    identity.weightClass ? `Listed weight: ${identity.weightClass}` : "",
    identity.lastCompetedWeight ? `Last competed at: ${identity.lastCompetedWeight}` : "",
    report.careerRecord ? `Career record: ${report.careerRecord}` : "",
    membership.ncUnitedTeam ? `NC United: ${membership.ncUnitedTeam}` : "",
    report.commitment ? `Committed: ${report.commitment}` : "",
    academics.gpa ? `GPA: ${academics.gpa}` : "",
    academics.sat ? `SAT: ${academics.sat}` : "",
    academics.act ? `ACT: ${academics.act}` : "",
    academics.academicInterest ? `Intended major: ${academics.academicInterest}` : "",
    report.rankingPublished && report.prospectRanking
      ? `RecruitNC ranking: #${report.prospectRanking} in the class`
      : "",
  ].filter(Boolean)

  if (report.results.length) {
    lines.push("", "Tournament results:")
    for (const r of report.results.slice(0, 14)) lines.push(`- ${r.year} ${r.event}: ${r.detail}`)
  }
  if (report.significantWins.length) {
    lines.push("", "Wins over ranked or Tournament of Champions wrestlers:")
    for (const w of report.significantWins.slice(0, 12)) {
      lines.push(`- beat ${w.opponent}${w.result ? ` (${w.result})` : ""}${w.event ? ` at ${w.event}` : ""}`)
    }
  }
  if (report.significantLosses.length) {
    lines.push("", "Losses to ranked or Tournament of Champions wrestlers:")
    for (const l of report.significantLosses.slice(0, 12)) {
      lines.push(`- lost to ${l.opponent}${l.result ? ` (${l.result})` : ""}${l.event ? ` at ${l.event}` : ""}`)
    }
  }
  return lines.join("\n")
}

/** The instruction given to the model. Separate export so it can be reviewed and tested. */
export const SUMMARY_SYSTEM_PROMPT = `You write short scouting summaries for college wrestling coaches.

Rules:
- Use ONLY the facts provided. Never invent a result, a ranking, an opponent, or a number.
- 3 to 5 sentences, plain and direct. No hype, no cliches, no "poised to dominate".
- Lead with what the record actually shows: level of competition faced and how they did.
- Name specific opponents or placements when they are in the facts.
- If the losses are to strong opponents, say so plainly — a coach reads that as useful.
- If the facts are thin, say what is known and stop. Do not pad.
- Never mention weight cutting, injuries, or anything medical.
- Refer to the athlete by name or they/them. Do not guess their gender.`
