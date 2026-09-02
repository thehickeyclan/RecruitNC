/**
 * Full athlete dossier for Data Dawg v2 — sports-analyst / Hall-of-Fame style.
 * Facts stay SQL-grounded; presentation emphasizes significance and progression.
 */

import { getSupabaseAdmin } from "@/lib/server-supabase"
import { getAthleteProfileUrl } from "@/lib/athlete-profile-links"
import { getSchoolPageUrl } from "@/lib/school-links"
import { athleteHasCompletedHighSchoolCareer } from "@/lib/data-dawg-athlete-career-status"
import { formatCommitChronologyLine } from "@/lib/data-dawg-college-commit"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { resolveAthleteCollegeCommit } from "@/lib/data-dawg-college-commit"
import { escapeForIlike } from "@/lib/nchsaa-results"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { type NchsaaRowForProfile } from "@/lib/profile-tournament-data"
import { type TournamentResultForDisplay } from "@/lib/public-profile-data"
import { countDistinctStateTitleYears } from "@/lib/nchsaa-state-display"
import { namesMatch } from "@/lib/nhsca-live/names-match"
import { loadNcUnitedResultsForNameSearch } from "@/lib/national-team-live-profile-results"
import { isBlueTeam } from "@/lib/blue-team"
import { buildAthleteTimelineMarkdown } from "@/lib/data-dawg-athlete-timeline"
import { formatAthleteProfileDetailsMarkdown } from "@/lib/data-dawg-athlete-profile-details"
import {
  athleteGenderWritingNote,
  athletePronouns,
  normalizeAthleteGender,
  type AthleteGender,
} from "@/lib/data-dawg-athlete-gender"
import {
  buildCareerSnapshotMarkdown,
  buildDevelopmentPathMarkdown,
  buildHistoricalContextNarrative,
  buildNationalResumeMarkdown,
  buildVerifiedSourcesFooter,
  countNationalAllAmericans,
  formatAnalystAthleteOpening,
  formatStateResultsSection,
  type AnalystProfileStats,
  type SeasonRecordRow,
  type SchoolDualTitle,
} from "@/lib/data-dawg-athlete-analyst-profile"

function athleteDisplayName(row: Record<string, unknown>): string {
  const n = String(row.name ?? "").trim()
  if (n) return n
  const f = String(row.first_name ?? row.firstName ?? "").trim()
  const l = String(row.last_name ?? row.lastName ?? "").trim()
  return `${f} ${l}`.trim() || "Unknown"
}

function extractWrestlingClub(row: Record<string, unknown>): string | null {
  for (const key of [
    "wrestlingClub",
    "wrestling_club",
    "wrestlingclub",
    "club",
    "team_affiliation",
    "team",
  ]) {
    const v = String(row[key] ?? "").trim()
    if (v && !/^(none|n\/a|na|-)$/i.test(v)) return v
  }
  return null
}

/**
 * Which school year a season belongs to.
 *
 * The `grade` column on `matches` is hand-entered free text and is wrong often enough not to be
 * trusted: an audit on 1 September 2026 found 91 of 850 rows disagreed with the athlete's
 * graduation year, including typos ("Sophmore"), placeholders ("Unknown", "8th Grade") and, most
 * damagingly, stale labels that never moved when the athlete advanced a year. That last kind made
 * Data Dawg describe a class-of-2027 junior's 2025-26 season as his *senior* year — a season he
 * has not wrestled yet.
 *
 * Graduation year is one authoritative number per athlete and is what every other surface already
 * keys off, so it wins wherever the season is dateable. The stored text is only a fallback for
 * rows we cannot place — a season string we cannot parse, or an athlete with no graduation year.
 */
function classLabelFromMatchRow(
  mr: Record<string, unknown>,
  graduationYear: number | null,
): { classLabel: string | null; year: number | null } {
  const season = String(mr.season ?? "")
  const endYear = season.match(/(20\d{2})\s*[-–]\s*(20\d{2})/)
  const shortEndYear = season.match(/(20\d{2})\s*[-–]\s*(\d{2})\b/)
  const y = endYear
    ? parseInt(endYear[2], 10)
    : shortEndYear
      ? parseInt(shortEndYear[1].slice(0, 2) + shortEndYear[2], 10)
      : (() => {
          const m = season.match(/\b(20\d{2})\b/)
          return m ? parseInt(m[1], 10) : null
        })()

  if (y != null && graduationYear != null) {
    const offset = graduationYear - y
    if (offset === 0) return { classLabel: "Senior", year: y }
    if (offset === 1) return { classLabel: "Junior", year: y }
    if (offset === 2) return { classLabel: "Sophomore", year: y }
    if (offset === 3) return { classLabel: "Freshman", year: y }
    /** Middle school or a fifth year — say nothing rather than guess a grade. */
    return { classLabel: null, year: y }
  }

  const grade = String(mr.grade ?? mr.season ?? "").toLowerCase()
  for (const label of ["freshman", "sophomore", "junior", "senior"] as const) {
    if (grade.includes(label)) {
      const capitalized = label.charAt(0).toUpperCase() + label.slice(1)
      const year =
        graduationYear != null
          ? graduationYear -
            (label === "senior" ? 0 : label === "junior" ? 1 : label === "sophomore" ? 2 : 3)
          : null
      return { classLabel: capitalized, year }
    }
  }
  return { classLabel: null, year: y }
}

/** Directory name vs tournament row (handles "Last, First" in DB). */
function dossierNamesMatch(directoryFullName: string, rowName: string): boolean {
  const dtrim = directoryFullName.trim()
  const rtrim = rowName.trim()
  if (!dtrim || !rtrim) return false
  if (namesMatch(dtrim, rtrim)) return true
  const comma = rtrim.indexOf(",")
  if (comma > 0) {
    const last = rtrim.slice(0, comma).trim()
    const rest = rtrim.slice(comma + 1).trim()
    if (last && rest) {
      const flipped = `${rest} ${last}`
      if (namesMatch(dtrim, flipped)) return true
    }
  }
  return false
}

/**
 * One pass over every store that has something to say about this athlete.
 *
 * Both consumers build on this: `buildAthleteFacts` (what Data Dawg answers from, in its own
 * words) and `buildAthleteDossierMarkdown` (the long-form report). Keeping the gather in one
 * place is the point — the two must never disagree about what the record actually says.
 */
async function gatherAthleteDossierData(athleteId: string) {
  const id = (athleteId ?? "").trim()
  if (!id || id.length < 8) {
    return { error: "Invalid athlete id.", data: null }
  }

  const supabase = getSupabaseAdmin()
  const { data: row, error: fetchErr } = await supabase.from("athletes").select("*").eq("id", id).maybeSingle()

  if (fetchErr) {
    return { error: fetchErr.message, data: null }
  }
  if (!row) {
    return { error: "Athlete not found.", data: null }
  }

  const athlete = row as Record<string, unknown>
  const displayName = athleteDisplayName(athlete)
  const nameForQueries = displayName
  const highSchool = String(athlete.highschool ?? athlete.high_school ?? "").trim()
  const rawGrad = athlete.graduationyear ?? athlete.grad_year
  const hasValidGrad =
    rawGrad != null &&
    String(rawGrad).trim() !== "" &&
    Number.isFinite(Number(rawGrad)) &&
    Number(rawGrad) >= 1990 &&
    Number(rawGrad) <= 2050
  const gradYear = hasValidGrad ? Math.floor(Number(rawGrad)) : new Date().getFullYear()

  const yearMin = hasValidGrad ? gradYear - 4 : 1990
  const yearMax = hasValidGrad ? gradYear + 1 : 2035

  const [{ nchsaa: nchsaaMerged, nhsca: nhscaDisplay, super32, fargo }, ncUnited] = await Promise.all([
    loadAthleteTournamentBundle(supabase, athlete, { nhscaAllTime: true }),
    loadNcUnitedResultsForNameSearch(supabase, nameForQueries, {
      highSchool: highSchool || undefined,
      athleteId: id,
      athleteRow: athlete,
      gradYear: hasValidGrad ? gradYear : undefined,
    }),
  ])

  const nchsaaSorted = [...nchsaaMerged].sort((a, b) => b.year - a.year)
  const super32Rows = [...super32].sort((a: { year?: number }, b: { year?: number }) => (b.year || 0) - (a.year || 0))
  const fargoRows = [...fargo].sort((a: { year?: number }, b: { year?: number }) => (b.year || 0) - (a.year || 0))

  const recruitingStatus = String(athlete.recruiting_status ?? "").trim()
  const prospectRanking =
    athlete.prospect_ranking != null && Number.isFinite(Number(athlete.prospect_ranking))
      ? Math.floor(Number(athlete.prospect_ranking))
      : null

  const commit = await resolveAthleteCollegeCommit(supabase, {
    displayName,
    college: String(athlete.college ?? "").trim() || null,
    division: String(athlete.division ?? "").trim() || null,
    previousCollege: String(athlete.previous_college ?? "").trim() || null,
  })

  const { data: matchRows } = await supabase.from("matches").select("*").eq("athlete_id", id)
  const seasons = new Map<string, { wins: number; losses: number; classLabel: string | null; year: number | null }>()
  for (const m of matchRows ?? []) {
    const mr = m as Record<string, unknown>
    const seasonKey = String(mr.season ?? mr.grade ?? "").toLowerCase()
    if (!seasonKey || seasonKey.includes("career")) continue
    const meta = classLabelFromMatchRow(mr, hasValidGrad ? gradYear : null)
    if (!seasons.has(seasonKey)) {
      seasons.set(seasonKey, {
        wins: 0,
        losses: 0,
        classLabel: meta.classLabel,
        year: meta.year,
      })
    }
    const rec = seasons.get(seasonKey)!
    rec.wins += Number(mr.wins ?? 0) || 0
    rec.losses += Number(mr.losses ?? 0) || 0
    if (!rec.classLabel && meta.classLabel) rec.classLabel = meta.classLabel
    if (rec.year == null && meta.year != null) rec.year = meta.year
  }
  let careerWins = 0
  let careerLosses = 0
  for (const rec of seasons.values()) {
    careerWins += rec.wins
    careerLosses += rec.losses
  }
  const hasCareerRecord = seasons.size > 0
  const seasonRecordRows: SeasonRecordRow[] = Array.from(seasons.values()).map((s) => ({
    classLabel: s.classLabel,
    year: s.year,
    wins: s.wins,
    losses: s.losses,
  }))
  const champCount = countDistinctStateTitleYears(nchsaaSorted)
  const aaCounts = countNationalAllAmericans({
    nhsca: nhscaDisplay,
    super32: super32Rows as TournamentResultForDisplay[],
    fargo: fargoRows as TournamentResultForDisplay[],
  })

  const schoolDualTitles: SchoolDualTitle[] = []
  let stateDualLines: string[] = []
  if (highSchool) {
    const { data: dualRows } = await supabase
      .from("dual_team_champions")
      .select("year, division, champion_school, is_vacated")
      .gte("year", yearMin)
      .lte("year", yearMax)
      .eq("is_vacated", false)
      .order("year", { ascending: false })

    const hsLower = highSchool.toLowerCase()
    const filtered = (dualRows ?? []).filter((d: Record<string, unknown>) => {
      const ch = String(d.champion_school ?? "").toLowerCase().trim()
      return ch === hsLower || ch.includes(hsLower) || hsLower.includes(ch)
    })
    for (const d of filtered) {
      const y = Number(d.year)
      if (Number.isFinite(y)) {
        schoolDualTitles.push({ year: y, division: d.division != null ? String(d.division) : null })
      }
    }
    stateDualLines = filtered.map(
      (d: Record<string, unknown>) => `- ${d.year}: State Dual Team Champion (${d.division})`,
    )
  }

  const { data: mowRows } = await supabase
    .from("dual_team_champions")
    .select("year, division, mow_name, mow_school, mow_weight_lb")
    .not("mow_name", "is", null)
    .gte("year", yearMin)
    .lte("year", yearMax)
    .order("year", { ascending: false })
    .limit(200)

  const mowFiltered = (mowRows ?? []).filter((m: Record<string, unknown>) => {
    const mn = String(m.mow_name ?? "").trim()
    return mn.length > 0 && dossierNamesMatch(nameForQueries, mn)
  })

  const daveLast = nameForQueries.toLowerCase().split(/\s+/).filter(Boolean).pop() ?? ""
  const namePat = `%${escapeForIlike(daveLast)}%`
  const [{ data: daveRows }, { data: triciaRows }, { data: careerWinRows }, { data: seasonWinRows }] =
    await Promise.all([
      supabase
        .from("dave_schultz_award")
        .select("year, name, high_school")
        .ilike("name", namePat)
        .order("year", { ascending: false })
        .limit(40),
      supabase
        .from("tricia_saunders_award")
        .select("year, name, high_school")
        .ilike("name", namePat)
        .order("year", { ascending: false })
        .limit(40),
      supabase
        .from("career_winningest_wrestlers")
        .select("rank, name, school, record, wins, losses, years")
        .ilike("name", namePat)
        .order("rank", { ascending: true })
        .limit(10),
      supabase
        .from("winningest_wrestlers")
        .select("rank_position, rank_numeric, is_tied, wrestler_name, school, record, wins, losses, year")
        .ilike("wrestler_name", namePat)
        .order("wins", { ascending: false })
        .limit(10),
    ])

  const daveFiltered = (daveRows ?? []).filter((d: Record<string, unknown>) =>
    dossierNamesMatch(nameForQueries, String(d.name ?? "").trim()),
  )
  const triciaFiltered = (triciaRows ?? []).filter((d: Record<string, unknown>) =>
    dossierNamesMatch(nameForQueries, String(d.name ?? "").trim()),
  )
  const careerFiltered = (careerWinRows ?? []).filter((d: Record<string, unknown>) =>
    dossierNamesMatch(nameForQueries, String(d.name ?? "").trim()),
  )
  const seasonFiltered = (seasonWinRows ?? []).filter((d: Record<string, unknown>) =>
    dossierNamesMatch(nameForQueries, String(d.wrestler_name ?? "").trim()),
  )

  const careerWinsRank =
    careerFiltered[0]?.rank != null && Number.isFinite(Number(careerFiltered[0].rank))
      ? Math.floor(Number(careerFiltered[0].rank))
      : null

  const wrestlingClub = extractWrestlingClub(athlete)
  const ncUnitedBlue = isBlueTeam(athlete)
  const nchsaaPlacesChronological = nchsaaSorted
    .filter((r) => r.place != null && r.place >= 1 && r.place <= 6)
    .map((r) => ({ year: r.year, place: r.place as number }))
    .sort((a, b) => a.year - b.year)

  const stats: AnalystProfileStats = {
    displayName,
    athleteId: id,
    highSchool: highSchool || null,
    graduationYear: hasValidGrad ? gradYear : null,
    careerWins: hasCareerRecord ? careerWins : null,
    careerLosses: hasCareerRecord ? careerLosses : null,
    stateTitleYears: champCount,
    nchsaaPlacesChronological,
    college: commit?.college ?? null,
    previousCollege: commit?.previousCollege ?? null,
    division: commit?.division ?? null,
    recruitingStatus: recruitingStatus || null,
    wrestlingClub,
    ncUnitedBlue,
    ncUnitedEvents: ncUnited,
    prospectRanking,
    careerWinsRank,
    dualsMowCount: mowFiltered.length,
    schoolDualTitles,
    schoolDualTitlesInWindow: schoolDualTitles.length,
    nhscaAllAmericanCount: aaCounts.nhsca,
    super32AllAmericanCount: aaCounts.super32,
    fargoAllAmericanCount: aaCounts.fargo,
    daveSchultzYears: daveFiltered
      .map((d) => Number(d.year))
      .filter((y) => Number.isFinite(y)),
    triciaSaundersYears: triciaFiltered
      .map((d) => Number(d.year))
      .filter((y) => Number.isFinite(y)),
    seasonRecords: seasonRecordRows,
    verifiedSources: ["RecruitNC"],
  }

  return {
    error: null,
    data: {
      id,
      athlete,
      displayName,
      stats,
      commit,
      hasValidGrad,
      gradYear,
      nchsaaSorted,
      nhscaDisplay,
      super32Rows,
      fargoRows,
      ncUnited,
      stateDualLines,
      mowFiltered,
      daveFiltered,
      triciaFiltered,
      careerFiltered,
      seasonFiltered,
      seasonRecordRows,
    },
  }
}

/**
 * Build analyst-style Markdown dossier for one athlete id (RecruitNC DB).
 *
 * Long-form report only. Data Dawg does not answer with this — see `buildAthleteFacts`.
 */
export async function buildAthleteDossierMarkdown(athleteId: string): Promise<{ markdown: string; error?: string }> {
  const gathered = await gatherAthleteDossierData(athleteId)
  if (!gathered.data) {
    return { markdown: "", error: gathered.error }
  }
  const {
    id,
    athlete,
    displayName,
    stats,
    commit,
    hasValidGrad,
    gradYear,
    nchsaaSorted,
    nhscaDisplay,
    super32Rows,
    fargoRows,
    ncUnited,
    stateDualLines,
    mowFiltered,
    daveFiltered,
    triciaFiltered,
    careerFiltered,
    seasonFiltered,
    seasonRecordRows,
  } = gathered.data

  const lines: string[] = []
  lines.push(...formatAnalystAthleteOpening(displayName, id, stats))

  const snapshot = buildCareerSnapshotMarkdown(stats)
  if (snapshot) {
    lines.push(snapshot)
    lines.push("")
  }

  const development = buildDevelopmentPathMarkdown(stats)
  if (development) {
    lines.push(development)
    lines.push("")
  }

  const profileDetails = formatAthleteProfileDetailsMarkdown(athlete)
  if (profileDetails) {
    lines.push(profileDetails)
    lines.push("")
  }

  const timelineMd = buildAthleteTimelineMarkdown({
    graduationYear: hasValidGrad ? gradYear : null,
    nchsaa: nchsaaSorted,
    nhsca: nhscaDisplay,
    super32: super32Rows as TournamentResultForDisplay[],
    fargo: fargoRows as TournamentResultForDisplay[],
    ncUnited,
    dualsMow: mowFiltered.map((m: Record<string, unknown>) => ({
      year: m.year as number | string | null,
      division: m.division != null ? String(m.division) : null,
      mow_weight_lb: m.mow_weight_lb as string | number | null,
    })),
    awards: [
      ...daveFiltered.map((d: Record<string, unknown>) => ({
        year: d.year as number | string | null,
        label: "Dave Schultz High School Excellence Award",
      })),
      ...triciaFiltered.map((d: Record<string, unknown>) => ({
        year: d.year as number | string | null,
        label: "Tricia Saunders High School Excellence Award",
      })),
    ],
    commit: commit?.college
      ? {
          college: commit.college,
          division: commit.division,
          previousCollege: commit.previousCollege,
          year: hasValidGrad ? gradYear : null,
        }
      : null,
    seasonRecords: seasonRecordRows.map((s) => ({
      year: s.year,
      wins: s.wins,
      losses: s.losses,
      classLabel: s.classLabel,
      record: `${s.wins}-${s.losses}`,
    })),
  })
  if (timelineMd) {
    lines.push(timelineMd)
    lines.push("")
  }

  const context = buildHistoricalContextNarrative(stats)
  if (context) {
    lines.push(context)
    lines.push("")
  }

  lines.push("Detailed results:")
  lines.push("")
  lines.push(formatStateResultsSection(nchsaaSorted as NchsaaRowForProfile[]))

  if (stateDualLines.length > 0) {
    lines.push("")
    lines.push("State dual team championships:")
    stateDualLines.forEach((l) => lines.push(l))
  }

  if (mowFiltered.length > 0) {
    lines.push("")
    lines.push("State Duals Most Outstanding Wrestler (MOW):")
    for (const m of mowFiltered) {
      const w = m.mow_weight_lb ? ` (${m.mow_weight_lb}lbs)` : ""
      const who = String(m.mow_name ?? "").trim()
      lines.push(`- ${m.year}: ${m.division} Dual Meet MOW — ${who}${w} (${m.mow_school})`)
    }
  }

  const national = buildNationalResumeMarkdown({
    nhsca: nhscaDisplay,
    super32: super32Rows as TournamentResultForDisplay[],
    fargo: fargoRows as TournamentResultForDisplay[],
    ncUnited,
    graduationYear: hasValidGrad ? gradYear : null,
  })
  if (national) {
    lines.push("")
    lines.push(national)
  }

  if (daveFiltered.length > 0) {
    lines.push("")
    lines.push("Dave Schultz High School Excellence Award:")
    for (const d of daveFiltered) {
      lines.push(`- ${d.year}: Winner (${d.high_school})`)
    }
  }

  if (triciaFiltered.length > 0) {
    lines.push("")
    lines.push("Tricia Saunders High School Excellence Award:")
    for (const d of triciaFiltered) {
      lines.push(`- ${d.year}: Winner (${d.high_school})`)
    }
  }

  // Record-book rows only (verified ranks) — season W–L already lives in Career progression.
  if (careerFiltered.length > 0 || seasonFiltered.length > 0) {
    lines.push("")
    lines.push("Season records:")
    if (careerFiltered.length > 0) {
      for (const d of careerFiltered) {
        const rank = d.rank != null ? `#${d.rank} ` : ""
        lines.push(
          `- ${rank}All-time career: ${d.record}${d.years ? ` (${d.years})` : ""}${d.school ? ` — ${d.school}` : ""}`,
        )
      }
    }
    if (seasonFiltered.length > 0) {
      for (const d of seasonFiltered) {
        lines.push(`- ${d.year ?? "?"}: ${d.record}${d.school ? ` — ${d.school}` : ""}`)
      }
    }
  }

  lines.push("")
  lines.push(buildVerifiedSourcesFooter(stats))

  return { markdown: lines.join("\n") }
}

/**
 * What Data Dawg actually answers from.
 *
 * Plain verified values — no markdown, no emoji, no section headings — so the reply can be
 * written as conversation rather than read back as a printout. Everything here came out of a
 * table; nothing here is narrative. The one exception is `state_results[].result`, which is a
 * label ("State Champion", "3rd place") derived from the stored place, because "place: 1" and
 * "place: 0" mean quite different things and the distinction is easy to get wrong downstream.
 */
export type AthleteFacts = {
  name: string
  /** Recorded profile value. Null means unknown; never infer gender from the athlete's name. */
  gender: AthleteGender
  profile_url: string
  high_school: string | null
  high_school_url: string | null
  class_of: number | null
  club: string | null
  nc_united_blue: boolean
  career_record: string | null
  career_wins_rank: number | null
  prospect_rank: number | null
  recruiting_status: string | null
  college: string | null
  previous_college: string | null
  college_division: string | null
  /** Ready-made college line, so a transfer never gets described as a fresh commit. */
  college_path: string | null
  /** True once high school is behind them — decides past vs present tense in the reply. */
  career_complete: boolean
  state_titles: number
  all_american_counts: { nhsca: number; super32: number; fargo: number }
  season_records: Array<{ year: number | null; grade: string | null; record: string }>
  state_results: Array<{ year: number; result: string; classification: string | null; weight: string | null }>
  dual_team_titles: Array<{ year: number; division: string | null }>
  duals_mow: Array<{ year: number; division: string | null; weight: string | null }>
  nhsca: Array<{ year: number; placement: string | null; record: string | null; division: string | null }>
  super32: Array<{ year: number; placement: string | null; record: string | null; division: string | null }>
  fargo: Array<{ year: number; placement: string | null; record: string | null; division: string | null }>
  nc_united: Array<{ year: number | null; event: string | null; record: string | null }>
  awards: Array<{ year: number; award: string }>
  record_book: Array<{ scope: string; rank: number | null; record: string | null; years: string | null; school: string | null }>
  /**
   * Per-athlete writing directives, computed here rather than left to the model to infer.
   * Tense and transfer-vs-commit are the two things it gets wrong most often, and a rule
   * sitting 40 lines up in a 12KB system prompt loses to a line sitting next to the data.
   */
  writing_notes: string[]
}

/** Stored place → the label a person would use for it. */
function stateResultLabel(place: number | null | undefined): string {
  if (place === 1) return "State Champion"
  if (place === 2) return "2nd place"
  if (place === 3) return "3rd place"
  if (place != null && place > 3 && place <= 6) return `${place}th place`
  // A row in the canonical state-results table without a podium place is still a verified
  // appearance, not a blank result.
  return "State qualifier"
}

function tidy(v: unknown): string | null {
  const s = String(v ?? "").trim()
  return s || null
}

function tournamentRows(
  rows: Array<TournamentResultForDisplay | Record<string, unknown>>,
): Array<{ year: number; placement: string | null; record: string | null; division: string | null }> {
  return rows
    .map((r) => {
      const row = r as Record<string, unknown>
      const year = Number(row.year)
      if (!Number.isFinite(year)) return null
      const placement = tidy(row.placement ?? row.place)
      const record =
        tidy(row.record) ??
        (row.wins != null && row.losses != null ? `${row.wins}-${row.losses}` : null)
      if (!placement && !record) return null
      return { year, placement, record, division: tidy(row.division) }
    })
    .filter((r): r is { year: number; placement: string | null; record: string | null; division: string | null } => r != null)
    .sort((a, b) => a.year - b.year)
}

/** Directives the model gets wrong when left to infer them. Computed, never guessed. */
function buildWritingNotes(f: AthleteFacts): string[] {
  const notes: string[] = []
  const cls = f.class_of ? ` (class of ${f.class_of})` : ""
  const pronouns = athletePronouns(f.gender)
  const subject = pronouns.subject.charAt(0).toUpperCase() + pronouns.subject.slice(1)

  notes.push(athleteGenderWritingNote(f.name, f.gender))

  notes.push(
    f.career_complete
      ? `${f.name} has finished high school${cls}. Write in the PAST tense throughout — "was", "went ${f.career_record ?? "…"}", "finished ${pronouns.possessive} career". Never describe ${pronouns.object} as a current prospect.`
      : `${f.name} is still in high school${cls}. Write in the PRESENT tense throughout.`,
  )

  if (f.college_path && f.previous_college) {
    notes.push(
      `College: ${f.college_path}. This is a TRANSFER, not a commitment — say ${subject} wrestled at ${f.previous_college} before ${f.college}, never that ${pronouns.subject} "committed to ${f.college}".`,
    )
  } else if (f.college_path) {
    notes.push(`College: ${f.college_path}.`)
  }

  if (f.high_school && f.high_school_url) {
    notes.push(
      `First mention of ${f.high_school} is a link to ${f.high_school_url} — link the school name itself, once.`,
    )
  }

  if (f.prospect_rank == null) {
    notes.push("We publish no prospect ranking for this athlete — do not mention rankings.")
  }

  if (f.state_results.length > 2) {
    notes.push(
      "Summarise the state results as an arc in one clause — do not list each year, place and weight.",
    )
  }

  return notes
}

/**
 * Verified facts for one athlete, for Data Dawg to answer in its own words.
 * Same gather as the long-form dossier, so the two can never drift apart.
 */
export async function buildAthleteFacts(
  athleteId: string,
): Promise<{ facts: AthleteFacts | null; error?: string }> {
  const gathered = await gatherAthleteDossierData(athleteId)
  if (!gathered.data) {
    return { facts: null, error: gathered.error }
  }
  const {
    id,
    athlete,
    stats,
    hasValidGrad,
    gradYear,
    nchsaaSorted,
    nhscaDisplay,
    super32Rows,
    fargoRows,
    ncUnited,
    mowFiltered,
    daveFiltered,
    triciaFiltered,
    careerFiltered,
    seasonFiltered,
    seasonRecordRows,
  } = gathered.data

  const awards: AthleteFacts["awards"] = [
    ...daveFiltered.map((d: Record<string, unknown>) => ({
      year: Number(d.year),
      award: "Dave Schultz High School Excellence Award",
    })),
    ...triciaFiltered.map((d: Record<string, unknown>) => ({
      year: Number(d.year),
      award: "Tricia Saunders High School Excellence Award",
    })),
  ]
    .filter((a) => Number.isFinite(a.year))
    .sort((a, b) => a.year - b.year)

  const recordBook: AthleteFacts["record_book"] = [
    ...careerFiltered.map((d: Record<string, unknown>) => ({
      scope: "all-time career wins",
      rank: Number.isFinite(Number(d.rank)) ? Math.floor(Number(d.rank)) : null,
      record: tidy(d.record),
      years: tidy(d.years),
      school: tidy(d.school),
    })),
    ...seasonFiltered.map((d: Record<string, unknown>) => ({
      scope: `single-season wins${d.year ? ` (${d.year})` : ""}`,
      rank: Number.isFinite(Number(d.rank_numeric)) ? Math.floor(Number(d.rank_numeric)) : null,
      record: tidy(d.record),
      years: tidy(d.year),
      school: tidy(d.school),
    })),
  ]

  const facts: AthleteFacts = {
    name: stats.displayName,
    gender: normalizeAthleteGender(athlete.gender),
    profile_url: getAthleteProfileUrl(id),
    high_school: stats.highSchool ?? null,
    high_school_url: stats.highSchool ? getSchoolPageUrl(stats.highSchool) : null,
    class_of: stats.graduationYear ?? null,
    club: stats.wrestlingClub ?? null,
    nc_united_blue: Boolean(stats.ncUnitedBlue),
    career_record:
      stats.careerWins != null && stats.careerLosses != null
        ? `${stats.careerWins}-${stats.careerLosses}`
        : null,
    career_wins_rank: stats.careerWinsRank ?? null,
    // Only surface a rank from a class we actually publish, and only inside the published
    // top N — otherwise an old internal number reads as a current public ranking.
    prospect_rank:
      stats.prospectRanking != null &&
      isPublicRankingsYearPublished(stats.graduationYear) &&
      stats.prospectRanking <= getPublicRankingsMax(stats.graduationYear)
        ? stats.prospectRanking
        : null,
    recruiting_status: stats.recruitingStatus ?? null,
    college: stats.college ?? null,
    previous_college: stats.previousCollege ?? null,
    college_division: stats.division ?? null,
    college_path: stats.college
      ? formatCommitChronologyLine(stats.college, stats.previousCollege, stats.division).replace(
          /^College(?: career)?:\s*/,
          "",
        )
      : null,
    career_complete: athleteHasCompletedHighSchoolCareer(
      hasValidGrad ? gradYear : null,
      new Date(),
    ),
    state_titles: stats.stateTitleYears,
    all_american_counts: {
      nhsca: stats.nhscaAllAmericanCount ?? 0,
      super32: stats.super32AllAmericanCount ?? 0,
      fargo: stats.fargoAllAmericanCount ?? 0,
    },
    season_records: [...seasonRecordRows]
      .sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
      .map((s) => ({ year: s.year ?? null, grade: s.classLabel ?? null, record: `${s.wins}-${s.losses}` })),
    state_results: [...nchsaaSorted]
      .sort((a, b) => a.year - b.year)
      .map((r) => ({
        year: r.year,
        result: stateResultLabel(r.place),
        classification: tidy(r.classification),
        weight: tidy(String(r.weight_class ?? "").replace(/lbs?$/i, "")),
      })),
    dual_team_titles: (stats.schoolDualTitles ?? [])
      .map((d) => ({ year: d.year, division: d.division ?? null }))
      .sort((a, b) => a.year - b.year),
    duals_mow: mowFiltered
      .map((m: Record<string, unknown>) => ({
        year: Number(m.year),
        division: tidy(m.division),
        weight: tidy(m.mow_weight_lb),
      }))
      .filter((m) => Number.isFinite(m.year)),
    nhsca: tournamentRows(nhscaDisplay),
    super32: tournamentRows(super32Rows),
    fargo: tournamentRows(fargoRows),
    nc_united: ncUnited
      .filter((e) => !e.isPlaceholder)
      .map((e) => ({
        year: Number.isFinite(Number(e.year)) ? Math.floor(Number(e.year)) : null,
        event: tidy(e.event),
        record: tidy(e.record),
      })),
    awards,
    record_book: recordBook,
    writing_notes: [],
  }

  facts.writing_notes = buildWritingNotes(facts)

  // `gradYear` defaults to the current year when the row has none — only report a real one.
  if (!hasValidGrad) facts.class_of = null
  else facts.class_of = gradYear

  return { facts }
}
