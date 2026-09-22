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
import { applyStarOverride, isRatedAthlete, rateAthlete, type StarRating } from "@/lib/athlete-star-rating"
import { nationalEventRows, starOverrideOf, statePlaces } from "@/lib/athlete-star-rating-load"
import { summarizeNationalExposure, summarizeSeasonStrength, type SeasonStrength } from "@/lib/competition-strength"
import {
  getNationalRankingsForAthlete,
  nationalRankingHistory,
  nationalRankingSummary,
  RETAINED_EDITIONS,
  type NationalRankingSeries,
} from "@/lib/national-rankings"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { buildTocFieldBoard } from "@/lib/toc/field-board"
import { getQualifierSignificantWinBouts } from "@/lib/other-tournaments"
import { latestSeasonMatchRows } from "@/lib/toc/ai-seeding"
import {
  findSignificantLosses,
  findSignificantWins,
  type Bout,
  type NationallyRankedOpponent,
  type OpponentIndex,
  type RankedOpponent,
  type SignificantWin,
} from "@/lib/significant-wins"
import { isBlueTeam } from "@/lib/blue-team"
import { sourceLabel } from "@/lib/national-rankings"
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
  /** Where and when that weight was made — the context a coach reads it in. */
  lastCompetedEvent: string | null
  lastCompetedYear: number | null
  /** Exact day when the source records one; otherwise null and the year stands alone. */
  lastCompetedDate: string | null
  /**
   * Where the athlete expects to wrestle in college — their own projection, not ours.
   *
   * Owner-editable and better filled in than anything else on a profile (295 of 404), and no
   * coach could see it. Labelled as athlete-stated wherever it is shown: it is a claim about a
   * teenager's own body and plans, and NC United asserting a number for them would be a guess
   * with our name on it.
   */
  collegeWeightClass: string | null
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
  /** Public profiles a coach would otherwise go hunting for, to check the record themselves. */
  floProfileUrl: string | null
  trackWrestlingProfileUrl: string | null
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
  /**
   * The day it was wrestled, where the source records one.
   *
   * The sort has always had this and threw it away, so a coach reading the record saw "2026"
   * against four different events and could not tell which was last week. Annual events that
   * publish only a year keep it null and still show the year.
   */
  date: string | null
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
  /**
   * How hard the season actually was, from the imported bouts.
   *
   * Computed all along to feed one line of the star rating, then discarded — while the paywall
   * in front of this page sells "strength of schedule" by name. Null when no season bouts are
   * on file.
   */
  seasonStrength: SeasonStrength | null
  /** Written by the model from the fields above. Null when generation is unavailable. */
  summary: string | null
  recruitingStatus: string | null
  commitment: string | null
  /** RecruitNC prospect ranking, and whether that class is published. */
  prospectRanking: number | null
  rankingPublished: boolean
  /**
   * What Flo, SI and MatScouts have published, one series per outlet, newest first.
   *
   * Only the retained editions — a coach is shown the window we hold, not a career arc we
   * cannot evidence.
   */
  nationalRankings: NationalRankingSeries[]
  /**
   * The RecruitNC star rating and its four components.
   *
   * Null for a class we do not rank — see `isRatedClass`. Null is not zero stars and the report
   * says nothing at all rather than showing an empty row of stars against a wrestler's name.
   */
  starRating: StarRating | null
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

  // Nationally ranked wrestlers, including out-of-state ones — most opponents worth naming
  // will never appear in our own athlete table.
  const nationallyRanked: NationallyRankedOpponent[] = []
  const { data: nationalRows } = await supabase
    .from("national_rankings")
    .select("athlete_name, rank, source, state")
    .order("rank", { ascending: true })
  const seenNational = new Set<string>()
  for (const row of nationalRows ?? []) {
    const name = String(row.athlete_name ?? "").trim()
    if (!name) continue
    // Best rank across outlets wins; rows arrive sorted so the first is the best.
    const key = name.toLowerCase()
    if (seenNational.has(key)) continue
    seenNational.add(key)
    nationallyRanked.push({
      name,
      rank: Number(row.rank ?? 0),
      source: sourceLabel(String(row.source ?? "")),
      state: (row.state as string) ?? null,
    })
  }

  return { tocField, ranked, nationallyRanked }
}

/**
 * When each fixed-calendar event is wrestled, so the list can be ordered by when it happened.
 *
 * Only the year is stored for these, and sorting on the year alone left a February state
 * tournament above a Tournament of Champions wrestled in September of the same year — the
 * opposite of what a coach wants at the top. Events that carry a real date use it instead.
 */
const EVENT_MONTH: Record<string, number> = {
  "NCHSAA States": 2,
  "NHSCA Nationals": 3,
  Fargo: 7,
  "Super 32": 10,
}

/** Tournament results flattened into printable lines, newest first. */
function buildResultRows(bundle: {
  nchsaa: Array<{ year: number; place: number | null; classification: string; weight_class: string }>
  nhsca: Array<{ year: number; placement?: string; record?: string; weight?: string }>
  super32: Array<{ year: number; placement?: string; record?: string; weight?: string }>
  fargo: Array<{ year: number; placement?: string; record?: string; weight?: string; division?: string }>
  other: Array<{ year: number; eventShortName: string; placement: number | null; record: string; weight: string; qualified: boolean; eventDate?: string | null }>
}): ScoutingReportResultRow[] {
  const rows: Array<ScoutingReportResultRow & { when: string }> = []
  const when = (event: string, year: number) =>
    `${year}-${String(EVENT_MONTH[event] ?? 6).padStart(2, "0")}-01`

  for (const r of bundle.nchsaa ?? []) {
    const place = r.place && r.place > 0 ? (r.place === 1 ? "Champion" : ordinal(r.place)) : "Qualifier"
    // The state tournament publishes a year, not a day: `when` is a sort key, never a date.
    rows.push({ event: "NCHSAA States", year: r.year, when: when("NCHSAA States", r.year), date: null, detail: `${r.classification} · ${r.weight_class} · ${place}` })
  }
  const national: Array<[string, typeof bundle.fargo]> = [
    ["NHSCA Nationals", bundle.nhsca ?? []],
    ["Super 32", bundle.super32 ?? []],
    ["Fargo", bundle.fargo ?? []],
  ]
  for (const [label, list] of national) {
    for (const r of list) {
      // Fargo runs freestyle and Greco as separate tournaments; the division says which.
      const division = label === "Fargo" ? String(r.division ?? "").trim() : ""
      const detail = [division, r.weight, r.placement, r.record ? `${r.record} record` : ""]
        .filter(Boolean)
        .join(" · ")
      if (detail) rows.push({ event: label, year: r.year, when: when(label, r.year), date: null, detail })
    }
  }
  for (const r of bundle.other ?? []) {
    const place = r.placement ? (r.placement === 1 ? "Champion" : ordinal(r.placement)) : "did not place"
    const detail = [r.weight, place, r.record ? `${r.record} record` : "", r.qualified ? "Super 32 qualifier" : ""]
      .filter(Boolean)
      .join(" · ")
    rows.push({
      event: r.eventShortName,
      year: r.year,
      // These carry the date they were actually wrestled.
      when: r.eventDate ?? when(r.eventShortName, r.year),
      date: r.eventDate ?? null,
      detail,
    })
  }

  // Newest first, so the most recent tournament is the first line a coach reads.
  return rows
    .sort((a, b) => b.when.localeCompare(a.when) || a.event.localeCompare(b.event))
    .map(({ when: _when, ...row }) => row)
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
    /*
     * Released at both tiers for the same reason as film: these are pages the athlete has
     * already made public, and a coach who cannot reach them from here simply searches the
     * name and finds them anyway, less reliably.
     */
    floProfileUrl: text(athlete.flo_profile_url),
    trackWrestlingProfileUrl: text(athlete.track_wrestling_profile_url),
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

  const [bundle, { data: matchRows }, qualifierBouts, rankings] = await Promise.all([
    loadAthleteTournamentBundle(supabase, athlete),
    supabase.from("matches").select("season,matches").eq("athlete_id", athleteId),
    getQualifierSignificantWinBouts(supabase, athleteId, "all").catch(() => [] as Bout[]),
    getNationalRankingsForAthlete(supabase, athleteId).catch(() => []),
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

  const lastCompeted = (
    athlete as {
      profile_weight_display?: {
        lastCompeted?: { weight?: string; event?: string; year?: number; date?: string | null }
      }
    }
  )?.profile_weight_display?.lastCompeted

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
      lastCompetedWeight: text(lastCompeted?.weight),
      lastCompetedEvent: text(lastCompeted?.event),
      lastCompetedYear:
        lastCompeted?.year != null && Number.isFinite(Number(lastCompeted.year))
          ? Number(lastCompeted.year)
          : null,
      lastCompetedDate: text(lastCompeted?.date),
      gender: text(athlete.gender),
      collegeWeightClass: text(athlete.college_weight_class),
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
    seasonStrength: seasonBouts.length > 0 ? summarizeSeasonStrength(seasonBouts as never) : null,
    prospectRanking: ranking,
    nationalRankings: nationalRankingHistory(rankings),
    // Built from data already in hand — the bundle, the season's bouts and the rankings just
    // loaded — so the star costs the report no extra queries.
    starRating: isRatedAthlete({ gender: athlete.gender as string, graduationYear: gradYear })
      ? applyStarOverride(
          rateAthlete({
          exposure: summarizeNationalExposure(nationalEventRows(bundle as never)),
          strength: summarizeSeasonStrength(seasonBouts as never),
          prospectRanking: ranking,
          rankingPublished:
            ranking != null &&
            isPublicRankingsYearPublished(gradYear) &&
            ranking <= getPublicRankingsMax(gradYear),
          statePlaces: statePlaces(bundle as never),
            nationallyRanked: rankings.length > 0,
          }),
          starOverrideOf(athlete),
        )
      : null,
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
/**
 * How an opponent's standing is stated to the model.
 *
 * Spelled out per bout rather than left to a section heading, because the heading covers three
 * different standings at once and the model was free to call any of them "ranked". A win over
 * a nationally ranked wrestler and a win over a state-ranked one are not the same claim, and a
 * summary that blurs them oversells the first kind of athlete and undersells the second.
 */
function standingPhrase(bout: SignificantWin): string {
  if (bout.reason === "national-ranked") {
    return bout.nationalRankLabel ? `nationally ranked, ${bout.nationalRankLabel}` : "nationally ranked"
  }
  return bout.reason === "toc-field" ? "in the Tournament of Champions field" : "ranked in North Carolina"
}

function boutFact(bout: SignificantWin): string {
  return (
    `${bout.opponent} (${standingPhrase(bout)})` +
    `${bout.result ? ` ${bout.result}` : ""}${bout.event ? ` at ${bout.event}` : ""}` +
    `${bout.date ? `, ${bout.date}` : ""}`
  )
}

export function summaryFacts(report: Omit<ScoutingReport, "summary">): string {
  const { identity, academics, membership } = report
  const lines: string[] = [
    `Name: ${identity.name}`,
    identity.graduationYear ? `Class of ${identity.graduationYear}` : "",
    identity.highSchool ? `High school: ${identity.highSchool}` : "",
    identity.club ? `Club: ${identity.club}` : "",
    identity.weightClass ? `Listed weight: ${identity.weightClass}` : "",
    identity.lastCompetedWeight
      ? `Last competed at: ${identity.lastCompetedWeight}` +
        (identity.lastCompetedEvent ? ` — ${identity.lastCompetedEvent}` : "") +
        (identity.lastCompetedDate
          ? ` (${identity.lastCompetedDate})`
          : identity.lastCompetedYear
            ? ` (${identity.lastCompetedYear})`
            : "")
      : "",
    report.careerRecord ? `Career record: ${report.careerRecord}` : "",
    membership.ncUnitedTeam ? `NC United: ${membership.ncUnitedTeam}` : "",
    report.commitment ? `Committed: ${report.commitment}` : "",
    report.rankingPublished && report.prospectRanking
      ? `RecruitNC ranking (North Carolina class ranking, not national): #${report.prospectRanking} in the Class of ${identity.graduationYear ?? ""}`.trim()
      : /*
         * The absence, stated.
         *
         * "If no ranking is listed, say nothing about rankings" is in the prompt and the model
         * ignored it: given a 2029 with no published class it wrote "RecruitNC #13 in the Class
         * of 2029" twice in a row, and the guard threw both away, so the wrestler had no summary
         * at all. A fact it can read beats an instruction it can skip.
         */
        "RecruitNC ranking: none published for this class. Do not state a ranking.",
  ].filter(Boolean)

  /*
   * Academics go last, after the results, because that is the order the summary states them in.
   * The model reads this list top to bottom, and a GPA sitting above the tournament record was
   * turning up in the second sentence of a scouting summary.
   */
  const academicLines = [
    academics.gpa ? `GPA: ${academics.gpa}` : "GPA: not on file. Do not state one.",
    academics.sat ? `SAT: ${academics.sat}` : "",
    academics.act ? `ACT: ${academics.act}` : "",
    academics.academicInterest ? `Intended major: ${academics.academicInterest}` : "",
  ].filter(Boolean)

  // Given to the model because a national ranking is the strongest single fact on the page,
  // and a summary that omits it while the table shows it reads as though we missed it.
  if (report.nationalRankings.length) {
    lines.push("", "National rankings (only the retained months, newest first):")
    for (const series of report.nationalRankings) {
      const run = series.editions.map((e) => `#${e.rank} in ${e.rankingMonth.slice(0, 7)}`).join(", ")
      const move =
        series.movement == null
          ? ""
          : series.movement > 0
            ? ` — up ${series.movement} place${series.movement === 1 ? "" : "s"}`
            : series.movement < 0
              ? ` — down ${Math.abs(series.movement)} place${series.movement === -1 ? "" : "s"}`
              : " — unchanged"
      lines.push(`- ${series.sourceLabel}: ${run}${move}`)
    }
  }

  if (report.results.length) {
    lines.push("", "Tournament results:")
    for (const r of report.results.slice(0, 14)) lines.push(`- ${r.year} ${r.event}: ${r.detail}`)
  }
  if (report.significantWins.length) {
    lines.push("", "Wins over nationally ranked, NC state-ranked or Tournament of Champions wrestlers:")
    for (const w of report.significantWins.slice(0, 12)) lines.push(`- beat ${boutFact(w)}`)
  }
  if (report.significantLosses.length) {
    lines.push("", "Losses to nationally ranked, NC state-ranked or Tournament of Champions wrestlers:")
    for (const l of report.significantLosses.slice(0, 12)) lines.push(`- lost to ${boutFact(l)}`)
  }
  if (academicLines.length) lines.push("", "Academics:", ...academicLines.map((line) => `- ${line}`))
  return lines.join("\n")
}

/**
 * What the summary claims that the facts do not support.
 *
 * The model is told to use only the facts and mostly does, but on a wrestler with no published
 * ranking and no GPA on file it wrote "RecruitNC #13 in the Class of 2029 and has a GPA of 3.8" —
 * two numbers that exist nowhere in his record. A scouting report a coach pays for cannot carry
 * that, so every number the summary states is checked back against the facts and a summary that
 * fails is thrown away rather than shown.
 *
 * Only claims of the kind the model has actually invented are checked: rankings, GPA and test
 * scores. Returns the offending claims, empty when the summary is clean.
 */
export function unsupportedSummaryClaims(summary: string, facts: string): string[] {
  const problems: string[] = []
  const factText = facts.toLowerCase()

  for (const match of summary.matchAll(/#\s?(\d+)/g)) {
    if (!factText.includes(`#${match[1]}`)) problems.push(`ranking ${match[0]}`)
  }
  for (const [, label, value] of summary.matchAll(/\b(GPA|SAT|ACT)\b[^0-9]{0,12}(\d+(?:\.\d+)?)/gi)) {
    const stated = String(value)
    if (!factText.includes(`${label.toLowerCase()}: ${stated}`)) problems.push(`${label.toUpperCase()} ${stated}`)
  }
  // A ranking claimed in words with no number at all — "ranked in his class" over a record that
  // has no ranking in it. Skipped when a numeric ranking was already caught, so one invented
  // ranking is reported once.
  const claimsNumberedRank = /#\s?\d/.test(summary)
  if (!claimsNumberedRank && /\branked\b/i.test(summary) && !/ranking/i.test(factText) && !/#\d/.test(facts)) {
    problems.push("a ranking the facts do not contain")
  }
  return [...new Set(problems)]
}


/**
 * The summary with its unsupported sentences removed.
 *
 * Throwing the whole paragraph away for one invented number left wrestlers with no summary at
 * all — the model would append "Walker is ranked RecruitNC #13" to four sentences that were
 * true, twice, and the report rendered blank. The true sentences are worth keeping, so the
 * offending ones are cut and the rest stands, provided enough of it survives to read as a
 * scouting summary rather than a fragment.
 */
export function stripUnsupportedSentences(summary: string, facts: string): string | null {
  const sentences = summary.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0)
  const kept = sentences.filter((sentence) => unsupportedSummaryClaims(sentence, facts).length === 0)
  if (kept.length < 2 || kept.length === sentences.length) return null
  return kept.join(" ").trim()
}

/** The instruction given to the model. Separate export so it can be reviewed and tested. */
export const SUMMARY_SYSTEM_PROMPT = `You write short scouting summaries for college wrestling coaches.

Say things in this order, skipping anything the facts do not contain:
1. Who they are: name, class year, high school and club, in one clause.
2. National results first — NHSCA, Fargo, Super 32, Journeymen and other out-of-state events.
   Give the placement, the weight and the record.
3. Then this season's results, including the Tournament of Champions and the state tournament.
4. Then the wins and losses that carry a credential, naming the opponents.
5. Then the ranking: a national ranking with its outlet, otherwise the RecruitNC class ranking.
6. Then GPA and test scores, last, in one short sentence.

Rules:
- Use ONLY the facts provided. Never invent a result, a ranking, an opponent, or a number.
- 3 to 5 sentences, plain and direct. No hype, no cliches, no "poised to dominate".
- Never open with filler like "has shown strong performance", "has had a solid career", or
  "competed at various competitions". Open with the strongest result on the page.
- Write "a win over X" for one opponent and "wins over X and Y" for two. Never "a victory over"
  two people.
- Use the surname after the first mention rather than a pronoun. Do not guess their gender; where
  a pronoun is unavoidable use they/them.
- Never write "ranked" on its own about an opponent. Say "nationally ranked", "ranked in North
  Carolina", or "in the Tournament of Champions field", matching exactly what the facts state.
- A RecruitNC ranking is a North Carolina class ranking, not a national one. Write it as
  "RecruitNC #13 in the Class of 2027".
- Fargo freestyle and Fargo Greco-Roman are separate tournaments. Name the style when the facts do.
- If the losses are to strong opponents, say so plainly — a coach reads that as useful.
- If the facts are thin, say what is known and stop. Do not pad.
- Name the outlet for any national ranking you cite. Do not call a ranking a trend unless two
  or more months are shown, and never describe movement outside the months listed.
- Never mention weight cutting, injuries, or anything medical.
- State a ranking or a GPA only if it appears in the facts. If no ranking is listed, say nothing
  about rankings; if no GPA is listed, say nothing about academics.
- Name at least one loss when the facts list losses, with what the opponent's credential is.`
