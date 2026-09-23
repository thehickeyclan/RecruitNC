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
import { summarizeNationalExposure, summarizeSeasonStrength, type SeasonStrength, seasonStrengthLine } from "@/lib/competition-strength"
import {
  buildStrengthOfCompetition,
  strengthOfCompetitionFacts,
  type StrengthOfCompetition,
} from "@/lib/strength-of-competition"
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
  /** The weight actually wrestled, for the progression line. Null when the source omits it. */
  weight: string | null
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
  /** Which season that strength describes, e.g. "2025-26". Null when no bouts are on file. */
  seasonStrengthSeason: string | null
  /** Who they have actually faced, counted — never scored. */
  strengthOfCompetition: StrengthOfCompetition
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
  // The North Carolina wrestling calendar, as Matt gives it. Every event in
  // `other_tournament_results` carries a real date and sorts on that; these months are the
  // fallback for the table-backed results (NHSCA, Fargo, Super 32) which publish a year only,
  // and the safety net for any event added later without a date.
  "NCHSAA States": 2, // mid-February — this is what closes a season
  "NHSCA Nationals": 3, // mid-March
  Fargo: 7, // July
  "Super 32 Early Entry": 9, // early September, the qualifier
  "Tournament of Champions": 9, // mid-September
  Journeymen: 10, // early October
  "Super 32": 10, // late October
  // Ironman, Beast of the East and Powerade all sit in December and January — inside the North
  // Carolina season, which is why NC wrestlers historically could not enter them and why we
  // hold no results for any of the three. Everything above is off-season, which is exactly the
  // set an NC athlete can travel to.
}

/**
 * A sortable key for a result: its real date where one exists, otherwise the month the event
 * runs in. Annual events publish only a year, and guessing mid-year reorders a season.
 */
export function eventSortKey(event: string, year: number, date: string | null): string {
  if (date) return date
  const month = EVENT_MONTH[event]
  if (month) return `${year}-${String(month).padStart(2, "0")}-01`
  // An event we do not have in the calendar: sort it within its year, after the dated ones.
  return `${year}-12-31`
}

/**
 * What weight they have actually been wrestling, in order.
 *
 * A listed weight is where somebody is entered; this is where they have competed. For a young
 * wrestler it is often the most telling line on the page — Adam Walker, Class of 2029, went
 * 113 at States in February and 125-126 by September, which tells a college coach more about
 * his frame than any single placement does.
 *
 * Oldest first, because the direction is the point. Only events that record a weight count,
 * and consecutive repeats collapse so a wrestler who sat at 138 all year reads as "138"
 * rather than "138 → 138 → 138".
 */
export function weightProgression(
  rows: ReadonlyArray<{ event: string; year: number; date: string | null; weight: string | null }>,
): string | null {
  const numeric = rows
    .map((r) => ({ ...r, value: Number(String(r.weight ?? "").replace(/[^0-9.]/g, "")) }))
    .filter((r) => Number.isFinite(r.value) && r.value > 0 && Number.isFinite(r.year))
  if (numeric.length < 2) return null

  /*
   * A range per season, not every weight in order.
   *
   * Listing each result produced ten steps of noise for Tobin McNair — 132, 157, 144, 152, 157,
   * 160, 165, 160, 175, 174 — because a wrestler moves around inside a season and the table
   * already prints every one of those. What the table cannot show is the trajectory.
   *
   * And the first-to-last delta had to go. Gavin Lopez wrestles 215-220 and bumped to 285 once
   * at the Tournament of Champions; the arithmetic said "up 115 lbs", which is true and tells a
   * college coach something false about what he weighs.
   */
  const byYear = new Map<number, number[]>()
  for (const r of numeric) {
    if (!byYear.has(r.year)) byYear.set(r.year, [])
    byYear.get(r.year)!.push(r.value)
  }
  if (byYear.size === 0) return null

  const parts: string[] = []
  for (const year of [...byYear.keys()].sort((a, b) => a - b)) {
    const weights = byYear.get(year)!
    const low = Math.min(...weights)
    const high = Math.max(...weights)
    parts.push(`${year}: ${low === high ? low : `${low}\u2013${high}`}`)
  }
  if (parts.length === 1 && byYear.get([...byYear.keys()][0])!.length < 2) return null
  return parts.join(" \u00b7 ")
}

/**
 * What today is, and whether the high school season is running.
 *
 * The prompt used to say "then this season's results" to a model with no idea what day it was,
 * so a report written in September 2026 called Adam Walker's February 2026 state runner-up
 * finish "this season" — a season that had not started and was still two months away. The
 * facts have to carry the clock, and the summary has to speak in years.
 *
 * North Carolina wrestles November to February; NCHSAA States is mid-February, which is what
 * closes a season.
 */
export function seasonContext(now: Date = new Date()): string {
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const today = now.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })

  // States is mid-February, so late February is already an off-season date: a report written
  // on 25 February should not call the season "under way" when it finished the week before.
  const inSeason = month >= 11 || month === 1 || (month === 2 && now.getDate() <= 20)
  if (inSeason) {
    const start = month >= 11 ? year : year - 1
    return `Today is ${today}. The ${start}-${String(start + 1).slice(2)} North Carolina high school season is under way.`
  }
  // Off-season: States in February of this year closed the most recent one.
  const ended = `${year - 1}-${String(year).slice(2)}`
  return (
    `Today is ${today}. The North Carolina high school season is not running: the ${ended} season` +
    ` closed at NCHSAA States in February ${year}, and the next one begins in November ${year}.` +
    ` Do not call any result "this season" or "last season" — name the year the facts give it.`
  )
}

/**
 * The events we hold structured results for that are not North Carolina in-season wrestling.
 *
 * Deliberately not a list of every national tournament that exists: Beast of the East, Ironman
 * and Powerade are real and are not ingested anywhere, so a wrestler can place at one and leave
 * no trace here. This names what our data can actually speak to.
 */
const NATIONAL_EVENTS = [
  "NHSCA",
  "Fargo",
  "Super 32",
  "Journeymen",
  "I-64",
]

export function isNationalEvent(event: string): boolean {
  const name = String(event ?? "").toLowerCase()
  return NATIONAL_EVENTS.some((e) => name.includes(e.toLowerCase()))
}

/** Tournament results flattened into printable lines, newest first. */
export function buildResultRows(bundle: {
  nchsaa: Array<{ year: number; place: number | null; classification: string; weight_class: string }>
  nhsca: Array<{ year: number; placement?: string; record?: string; weight?: string }>
  super32: Array<{ year: number; placement?: string; record?: string; weight?: string }>
  fargo: Array<{ year: number; placement?: string; record?: string; weight?: string; division?: string }>
  other: Array<{ year: number; eventShortName: string; placement: number | null; record: string; weight: string; qualified: boolean; eventDate?: string | null }>
}): ScoutingReportResultRow[] {
  const rows: Array<ScoutingReportResultRow & { when: string }> = []
  const when = (event: string, year: number) => eventSortKey(event, year, null)

  for (const r of bundle.nchsaa ?? []) {
    const place = r.place && r.place > 0 ? (r.place === 1 ? "Champion" : ordinal(r.place)) : "Qualifier"
    // The state tournament publishes a year, not a day: `when` is a sort key, never a date.
    rows.push({ event: "NCHSAA States", year: r.year, when: when("NCHSAA States", r.year), date: null, weight: String(r.weight_class ?? "") || null, detail: `${r.classification} · ${r.weight_class} · ${place}` })
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
      // Say "did not place" rather than leaving the placement out.
      //
      // Abdul-Jamil Zaggout went 4-2 at NHSCA 2026 and placed nowhere. His row read
      // "152 · 4-2 record", the prompt below says "give the placement", and the model duly
      // supplied one: a 6th-place finish that never happened. An absent fact reads to a model
      // as a gap to fill, so the absence has to be a fact of its own — the same reason the
      // ranking and GPA lines say "none published" and "not on file".
      const placement = String(r.placement ?? "").trim() || "did not place"
      const detail = [division, r.weight, placement, r.record ? `${r.record} record` : ""]
        .filter(Boolean)
        .join(" · ")
      if (detail) rows.push({ event: label, year: r.year, when: when(label, r.year), date: null, weight: String(r.weight ?? "") || null, detail })
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
      weight: String(r.weight ?? "") || null,
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

  const seasonsOnFile = new Set(
    (matchRows ?? []).map((r) => String((r as { season?: unknown }).season ?? "").trim()).filter(Boolean),
  ).size
  const latestSeasonRows = latestSeasonMatchRows((matchRows ?? []) as never)
  const seasonStrengthSeason =
    String((latestSeasonRows[0] as { season?: unknown } | undefined)?.season ?? "").trim() || null

  const seasonBouts: Bout[] = latestSeasonRows.flatMap((row) => {
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
  // Built once: the panel counts the same rows the table prints, so the two cannot disagree.
  const resultRows = buildResultRows(bundle as never)
  const rankedWins = findSignificantWins(bouts, opponentIndex)
  const rankedLosses = findSignificantLosses(bouts, opponentIndex)
  const seasonStrength = seasonBouts.length > 0 ? summarizeSeasonStrength(seasonBouts as never) : null

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
    results: resultRows,
    significantWins: rankedWins,
    significantLosses: rankedLosses,
    recruitingStatus: text(athlete.recruiting_status),
    commitment: text(athlete.college),
    accessTier,
    watermark,
    seasonStrength: seasonStrength,
    seasonStrengthSeason,
    strengthOfCompetition: buildStrengthOfCompetition({
      significantWins: rankedWins,
      significantLosses: rankedLosses,
      results: resultRows,
      season: seasonStrength,
      seasonLabel: seasonStrengthSeason,
      seasonsOnFile,
    }),
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
    seasonContext(),
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

    /*
     * The absence, stated — and stated carefully.
     *
     * A record showing only NCHSAA is the single most useful signal a college coach can get
     * from this page, so it should not go unsaid. But it is a fact about our records, not
     * about the wrestler: we ingest NHSCA, Fargo, Super 32, Journeymen and I-64, and we do
     * not ingest Beast of the East, Ironman or Powerade. Writing "does not compete
     * nationally" would invent an absence the same way the NHSCA line once invented a
     * placement.
     */
    const progression = weightProgression(report.results)
    if (progression) lines.push("", `Competed at: ${progression}`)

    /*
     * Strength of schedule was computed, rendered in the report table, and never given to the
     * model — so a wrestler who went 21-7 against top-5% opposition had a summary that could
     * only say 50-8. The record without the schedule is the half that misleads.
     */
    // The panel: counted, traceable, and never a score.
    const socLines = strengthOfCompetitionFacts(report.strengthOfCompetition)
    if (socLines.length) {
      lines.push("", "Strength of competition:")
      for (const l of socLines) lines.push(`- ${l}`)
    }

    const strengthLine = report.seasonStrength ? seasonStrengthLine(report.seasonStrength) : null
    if (strengthLine) {
      // Named, because "strength of schedule" with no season attached is read as "now" — and
      // in September the most recent season ended seven months ago.
      const label = report.seasonStrengthSeason ? `${report.seasonStrengthSeason} ` : ""
      lines.push("", `${label}high school season strength of schedule: ${strengthLine}.`)
    }

    if (!report.results.some((r) => isNationalEvent(r.event))) {
      lines.push(
        "",
        "National results: none on file. Say that no national results are on file and that the" +
          " record here is North Carolina in-season competition. Do NOT write that they do not" +
          " compete nationally — our records do not cover every national event.",
      )
    }
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

  // A placement is the other number a model will supply when the facts omit one. An ordinal in
  // the summary — "placed 6th", "finished 3rd" — has to appear in the facts to survive.
  for (const match of summary.matchAll(/\b(\d{1,2}(?:st|nd|rd|th))\b/gi)) {
    const ordinalText = match[1].toLowerCase()
    if (!factText.includes(ordinalText)) problems.push(`placement ${match[1]}`)
  }
  for (const word of ["all-american", "runner-up"]) {
    if (new RegExp(`\\b${word}\\b`, "i").test(summary) && !factText.includes(word)) {
      problems.push(`a ${word} claim the facts do not contain`)
    }
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


/**
 * Remove season-relative framing the facts cannot support.
 *
 * The prompt forbids it, but "This season, Walker finished 2nd at the 2026 NCHSAA States" is
 * one phrase away from being a true sentence, so it is cut rather than the whole sentence
 * thrown away — the year is already there and does the work.
 */
export function stripSeasonFraming(summary: string): string {
  return summary
    .replace(/\b(this|last|the current)\s+season,\s*/gi, "")
    .replace(/,?\s*\b(this|last|the current)\s+season\b/gi, "")
    .replace(/\bso far this year\b,?\s*/gi, "")
    // A cut at the start of a sentence leaves it lower-case.
    .replace(/(^|[.!?]\s+)([a-z])/g, (_m, lead: string, letter: string) => lead + letter.toUpperCase())
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim()
}

/** The instruction given to the model. Separate export so it can be reviewed and tested. */
export const SUMMARY_SYSTEM_PROMPT = `You write short scouting summaries for college wrestling coaches.

Say things in this order, skipping anything the facts do not contain:
1. Who they are: name, class year, high school and club, in one clause.
2. National and out-of-state results first — NHSCA Nationals, Fargo, Super 32 (and Super 32
   Early Entry), Journeymen and I-64 Spring Duals — then North Carolina events, NCHSAA States
   and the Tournament of Champions. Name the tournament exactly as the facts name it.
   Give the weight, the record, and the placement ONLY when the facts state one. A line reading
   "did not place" means exactly that: report the record and say they did not place. Never
   supply a placement, an All-American finish or a podium the facts do not contain.
3. Refer to every result by the year the facts give it. NEVER write "this season", "last
   season", "currently" or "so far this year" — you are not told where in the calendar you are
   beyond the clock line at the top of the facts, and a February result is a different season
   from a September one.
4. Then the wins and losses that carry a credential, naming the opponents.
5. Then the ranking: a national ranking with its outlet, otherwise the RecruitNC class ranking.
6. Then GPA and test scores, last, in one short sentence.

Two lines are worth a sentence of their own when the facts carry them:
- "Competed at:" is the weight progression. For a young wrestler still filling out, where they
  have actually competed says more than a listed weight. Report the direction.
- "Strength of competition" is who they wrestled and beat. A record without it is the half
  that misleads: 50-8 reads very differently once you know 28 of those bouts were against
  opponents rated 95+ and eight wins came over Tournament of Champions field opponents. Quote
  the figures as given, never call a schedule "weak", and if the coverage line says one season
  is on file, do not treat a short record as a limit on the wrestler.

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
