/**
 * Full athlete dossier for Data Dawg v2 — sports-analyst / Hall-of-Fame style.
 * Facts stay SQL-grounded; presentation emphasizes significance and progression.
 */

import { getSupabaseAdmin } from "@/lib/server-supabase"
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
import {
  buildAnalystClosingSentence,
  buildCareerSnapshotMarkdown,
  buildDevelopmentPathMarkdown,
  buildHistoricalContextNarrative,
  buildHistoricalRankingsMarkdown,
  buildNationalResumeMarkdown,
  buildNotableAchievementsMarkdown,
  buildRepresentedNorthCarolinaMarkdown,
  buildVerifiedSourcesFooter,
  countNationalAllAmericans,
  formatAnalystAthleteOpening,
  formatStateResultsSection,
  type AnalystProfileStats,
  type SeasonRecordBag,
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

function classLabelFromMatchRow(
  mr: Record<string, unknown>,
  graduationYear: number | null,
): { classLabel: string | null; year: number | null } {
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
  const season = String(mr.season ?? "")
  const endYear = season.match(/(20\d{2})\s*[-–]\s*(20\d{2})/)
  const y = endYear
    ? parseInt(endYear[2], 10)
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
 * Build analyst-style Markdown dossier for one athlete id (RecruitNC DB).
 */
export async function buildAthleteDossierMarkdown(athleteId: string): Promise<{ markdown: string; error?: string }> {
  const id = (athleteId ?? "").trim()
  if (!id || id.length < 8) {
    return { markdown: "", error: "Invalid athlete id." }
  }

  const supabase = getSupabaseAdmin()
  const { data: row, error: fetchErr } = await supabase.from("athletes").select("*").eq("id", id).maybeSingle()

  if (fetchErr) {
    return { markdown: "", error: fetchErr.message }
  }
  if (!row) {
    return { markdown: "", error: "Athlete not found." }
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
  const seasonRecordRows: SeasonRecordBag[] = Array.from(seasons.values()).map((s) => ({
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

  const undefeatedForTimeline = seasonRecordRows.filter((s) => s.losses === 0 && s.wins > 0)
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
    seasonRecords: undefeatedForTimeline.map((s) => ({
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

  const notable = buildNotableAchievementsMarkdown(stats)
  if (notable) {
    lines.push(notable)
    lines.push("")
  }

  const rankings = buildHistoricalRankingsMarkdown(stats)
  if (rankings) {
    lines.push(rankings)
    lines.push("")
  }

  const represented = buildRepresentedNorthCarolinaMarkdown(stats)
  if (represented) {
    lines.push(represented)
    lines.push("")
  }

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

  if (careerFiltered.length > 0 || seasonFiltered.length > 0 || hasCareerRecord) {
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
    if (hasCareerRecord) {
      const sortedSeasons = Array.from(seasons.entries()).sort((a, b) => {
        const ya = a[1].year ?? parseInt(a[0].match(/(\d{4})/)?.[1] ?? "0", 10)
        const yb = b[1].year ?? parseInt(b[0].match(/(\d{4})/)?.[1] ?? "0", 10)
        return yb - ya
      })
      for (const [, rec] of sortedSeasons) {
        const label = rec.classLabel || "Season"
        lines.push(`- ${label}: ${rec.wins}-${rec.losses}`)
      }
    }
  }

  const closer = buildAnalystClosingSentence(stats)
  if (closer) {
    lines.push("")
    lines.push(closer)
  }

  lines.push("")
  lines.push(buildVerifiedSourcesFooter(stats))

  return { markdown: lines.join("\n") }
}
