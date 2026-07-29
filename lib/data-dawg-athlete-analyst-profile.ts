/**
 * Sports-analyst / Hall-of-Fame style copy for Data Dawg athlete dossiers.
 * Every claim is derived from verified row data — never free-form LLM invention.
 */

import { getAthleteProfileUrl } from "@/lib/athlete-profile-links"
import {
  formatCommitNarrativeClause,
} from "@/lib/data-dawg-college-commit"
import { athleteHasCompletedHighSchoolCareer } from "@/lib/data-dawg-athlete-career-status"
import { FOUR_TIME_STATE_CHAMPIONS, FOUR_TIME_STATE_CHAMPIONS_COUNT } from "@/lib/four-time-state-champions"
import { namesMatch } from "@/lib/nhsca-live/names-match"
import type { NchsaaRowForProfile } from "@/lib/nchsaa-results-json"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import type { TournamentResultForDisplay } from "@/lib/public-profile-data"

export { athleteHasCompletedHighSchoolCareer } from "@/lib/data-dawg-athlete-career-status"

export type SchoolDualTitle = {
  year: number
  division?: string | null
}

export type SeasonRecordRow = {
  /** Freshman / Sophomore / Junior / Senior when known. */
  classLabel?: string | null
  /** Tournament/grad-aligned year when known. */
  year?: number | null
  wins: number
  losses: number
}

export type NcUnitedEventRow = {
  year?: number | string | null
  event?: string | null
  record?: string | null
  isPlaceholder?: boolean
}

export type AnalystProfileStats = {
  displayName: string
  athleteId?: string | null
  highSchool?: string | null
  graduationYear?: number | null
  careerWins?: number | null
  careerLosses?: number | null
  stateTitleYears: number
  /** Chronological NCHSAA places (1–6) for narrative arc. */
  nchsaaPlacesChronological?: Array<{ year: number; place: number }>
  college?: string | null
  previousCollege?: string | null
  division?: string | null
  recruitingStatus?: string | null
  /** Wrestling club string from athlete row when present. */
  wrestlingClub?: string | null
  /** NC United Blue Team flag from athletes.ncUnitedTeam / blue membership. */
  ncUnitedBlue?: boolean
  ncUnitedEvents?: NcUnitedEventRow[]
  /** RecruitNC public prospect rank when present. */
  prospectRanking?: number | null
  /** Rank from career_winningest_wrestlers when matched. */
  careerWinsRank?: number | null
  /** Individual duals MOW count (personal). */
  dualsMowCount?: number
  /** School dual titles with years (for “helped capture” copy). */
  schoolDualTitles?: SchoolDualTitle[]
  /** @deprecated prefer schoolDualTitles */
  schoolDualTitlesInWindow?: number
  nhscaAllAmericanCount?: number
  super32AllAmericanCount?: number
  fargoAllAmericanCount?: number
  daveSchultzYears?: number[]
  triciaSaundersYears?: number[]
  seasonRecords?: SeasonRecordBag[]
  /** Datasets that contributed facts to this answer. */
  verifiedSources?: string[]
}

function hasCareerRecord(w?: number | null, l?: number | null): boolean {
  return w != null && l != null && Number.isFinite(w) && Number.isFinite(l) && (w > 0 || l > 0)
}

function isOfficialPublishedProspectRank(rank?: number | null, graduationYear?: number | null): rank is number {
  return (
    rank != null &&
    Number.isFinite(rank) &&
    rank > 0 &&
    isPublicRankingsYearPublished(graduationYear) &&
    rank <= getPublicRankingsMax(graduationYear)
  )
}

function recordStr(w: number, l: number): string {
  return `${Math.floor(w)}–${Math.floor(l)}`
}

function enDashRecord(raw: string): string {
  return raw.replace(/(\d+)\s*-\s*(\d+)/g, "$1–$2")
}

function fourTimeOrdinal(displayName: string): { index: number; total: number } | null {
  const idx = FOUR_TIME_STATE_CHAMPIONS.findIndex((c) => namesMatch(displayName, c.name))
  if (idx < 0) return null
  return { index: idx + 1, total: FOUR_TIME_STATE_CHAMPIONS_COUNT }
}

/** Title years sorted ascending (from chronological place rows when available). */
function stateTitleYearsList(stats: AnalystProfileStats): number[] {
  const fromPlaces = [...(stats.nchsaaPlacesChronological ?? [])]
    .filter((p) => p.place === 1)
    .map((p) => p.year)
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b)
  if (fromPlaces.length) return fromPlaces
  return []
}

function yearsAreConsecutive(years: number[]): boolean {
  if (years.length < 2) return false
  for (let i = 1; i < years.length; i++) {
    if (years[i] !== years[i - 1] + 1) return false
  }
  return true
}

/** True only when placement/notes explicitly mention Blood Round — never infer from W–L. */
export function explicitlyMentionsBloodRound(...parts: Array<string | null | undefined>): boolean {
  return parts.some((p) => /blood\s*round/i.test(String(p ?? "")))
}

function placeNum(placement: unknown): number | null {
  if (placement == null) return null
  if (typeof placement === "number" && Number.isFinite(placement)) return Math.floor(placement)
  const s = String(placement).trim()
  if (!s || /^participated$/i.test(s)) return null
  if (/^champion$/i.test(s) || /^1st$/i.test(s)) return 1
  if (/^finalist$/i.test(s)) return 2
  const m = s.match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

function isAllAmericanPlace(n: number | null): boolean {
  return n != null && n >= 1 && n <= 8
}

function countAa(rows: TournamentResultForDisplay[]): number {
  let n = 0
  const seen = new Set<string>()
  for (const r of rows) {
    const p = placeNum(r.placement)
    if (!isAllAmericanPlace(p)) continue
    const key = `${r.year}-${p}`
    if (seen.has(key)) continue
    seen.add(key)
    n++
  }
  return n
}

export function countNationalAllAmericans(opts: {
  nhsca?: TournamentResultForDisplay[]
  super32?: TournamentResultForDisplay[]
  fargo?: TournamentResultForDisplay[]
}): { nhsca: number; super32: number; fargo: number } {
  return {
    nhsca: countAa(opts.nhsca ?? []),
    super32: countAa(opts.super32 ?? []),
    fargo: countAa(opts.fargo ?? []),
  }
}

/**
 * Fact-driven opening — every phrase maps to verified stats (no generic hype).
 * Compact: honors + record/commit in two sentences max.
 * Alumni (“finished…”) vs current prospects (present tense) use graduation year.
 */
export function buildAnalystLeadParagraph(
  stats: AnalystProfileStats,
  asOf: Date = new Date(),
): string {
  const name = stats.displayName.trim() || "This wrestler"
  const hs = (stats.highSchool ?? "").trim()
  const gy = stats.graduationYear
  const done = athleteHasCompletedHighSchoolCareer(gy, asOf)
  const titles = stats.stateTitleYears
  const hasRec = hasCareerRecord(stats.careerWins, stats.careerLosses)
  const rec = hasRec ? recordStr(stats.careerWins!, stats.careerLosses!) : null
  const college = (stats.college ?? "").trim()
  const prev = (stats.previousCollege ?? "").trim()
  const nhscaAa = stats.nhscaAllAmericanCount ?? 0
  const s32Aa = stats.super32AllAmericanCount ?? 0
  const fargoAa = stats.fargoAllAmericanCount ?? 0
  const dave = (stats.daveSchultzYears ?? []).length > 0
  const tricia = (stats.triciaSaundersYears ?? []).length > 0
  const rank = stats.prospectRanking

  const honorBits: string[] = []
  if (titles >= 4) {
    honorBits.push("a four-time NCHSAA champion")
  } else if (titles === 3) {
    honorBits.push("a three-time NCHSAA champion")
  } else if (titles === 2) {
    honorBits.push("a two-time NCHSAA champion")
  } else if (titles === 1) {
    honorBits.push("an NCHSAA State Champion")
  }
  if (dave) honorBits.push("Dave Schultz High School Excellence Award winner")
  if (tricia) honorBits.push("Tricia Saunders High School Excellence Award winner")
  if (nhscaAa >= 1) {
    honorBits.push(
      nhscaAa === 1
        ? "NHSCA All-American"
        : nhscaAa === 2
          ? "two-time NHSCA All-American"
          : nhscaAa === 3
            ? "three-time NHSCA All-American"
            : `${nhscaAa}× NHSCA All-American`,
    )
  }
  if (s32Aa >= 1) {
    honorBits.push(s32Aa === 1 ? "Super 32 All-American" : `${s32Aa}× Super 32 All-American`)
  }
  if (fargoAa >= 1) {
    honorBits.push(fargoAa === 1 ? "Fargo All-American" : `${fargoAa}× Fargo All-American`)
  }
  if (isOfficialPublishedProspectRank(rank, gy) && gy != null) {
    honorBits.push(`RecruitNC's No. ${rank} prospect in the Class of ${Math.floor(gy)}`)
  }

  const careerWhere = hs ? ` his ${hs} career` : " his high school career"
  let open: string
  if (honorBits.length >= 1) {
    const joined =
      honorBits.length === 1
        ? honorBits[0]
        : honorBits.length === 2
          ? `${honorBits[0]} and ${honorBits[1]}`
          : `${honorBits.slice(0, -1).join(", ")}, and ${honorBits[honorBits.length - 1]}`
    if (done) {
      open = `${name} finished${careerWhere} as ${joined}.`
    } else if (hs) {
      open = `${name} is a ${hs} wrestler who is ${joined}.`
    } else {
      open = `${name} is ${joined}.`
    }
  } else if (hs || gy) {
    open = `${name} is a North Carolina high school wrestler${hs ? ` from ${hs}` : ""}${
      gy != null ? ` (Class of ${Math.floor(gy)})` : ""
    }.`
  } else {
    open = `Here's the verified RecruitNC profile for ${name}.`
  }

  let second = ""
  if (rec && college && prev && prev.toLowerCase() !== college.toLowerCase()) {
    second = done
      ? `He compiled a ${rec} record${hs ? ` at ${hs}` : ""} before continuing his collegiate career at ${prev} and ${college}.`
      : `He is ${rec}${hs ? ` at ${hs}` : ""} and has competed collegiately at ${prev} and ${college}.`
  } else if (rec && college) {
    second = done
      ? `He went ${rec} and committed to ${college}.`
      : `He is ${rec}${hs ? ` at ${hs}` : ""} and committed to ${college}.`
  } else if (rec) {
    second = done
      ? `He went ${rec}${hs ? ` at ${hs}` : ""}.`
      : `He is ${rec}${hs ? ` at ${hs}` : ""} so far.`
  } else if (college && prev && prev.toLowerCase() !== college.toLowerCase()) {
    second = done
      ? `He continued his collegiate career at ${prev} and then ${college}.`
      : `He has competed at ${prev} and ${college}.`
  } else if (college) {
    second = `He committed to ${college}.`
  }

  if (!second) return open
  return `${open} ${second}`
}

/** Compact headline stats under the lead — identity details live in the opening / Development path. */
export function buildCareerSnapshotMarkdown(stats: AnalystProfileStats): string {
  const lines: string[] = ["Career snapshot:", ""]
  let added = false

  if (hasCareerRecord(stats.careerWins, stats.careerLosses)) {
    lines.push(recordStr(stats.careerWins!, stats.careerLosses!))
    added = true
  }

  const titleYears = stateTitleYearsList(stats)
  const titles = stats.stateTitleYears
  if (titles >= 4 && yearsAreConsecutive(titleYears) && titleYears.length >= 4) {
    lines.push("Four consecutive NCHSAA state titles")
    added = true
  } else if (titles >= 1) {
    lines.push(
      titles === 1 ? "NCHSAA State Champion" : `${titles}× NCHSAA State Champion`,
    )
    added = true
  }

  const nhscaAa = stats.nhscaAllAmericanCount ?? 0
  if (nhscaAa > 0) {
    lines.push(nhscaAa === 1 ? "NHSCA All-American" : `${nhscaAa}× NHSCA All-American`)
    added = true
  }

  const s32Aa = stats.super32AllAmericanCount ?? 0
  if (s32Aa > 0) {
    lines.push(s32Aa === 1 ? "Super 32 All-American" : `${s32Aa}× Super 32 All-American`)
    added = true
  }

  const fargoAa = stats.fargoAllAmericanCount ?? 0
  if (fargoAa > 0) {
    lines.push(fargoAa === 1 ? "Fargo All-American" : `${fargoAa}× Fargo All-American`)
    added = true
  }

  if ((stats.daveSchultzYears ?? []).length > 0) {
    lines.push("Dave Schultz Award Winner")
    added = true
  }
  if ((stats.triciaSaundersYears ?? []).length > 0) {
    lines.push("Tricia Saunders Award Winner")
    added = true
  }

  const college = (stats.college ?? "").trim()
  const prev = (stats.previousCollege ?? "").trim()
  if (college) {
    if (prev && prev.toLowerCase() !== college.toLowerCase()) {
      lines.push(`${prev} → ${college}`)
    } else {
      lines.push(college)
    }
    added = true
  }

  if (!added) return ""
  return lines.join("\n")
}

function possessiveName(name: string): string {
  const n = name.trim()
  if (!n) return n
  return /s$/i.test(n) ? `${n}'` : `${n}'s`
}

function placeWord(place: number): string {
  if (place === 1) return "champion"
  if (place === 2) return "runner-up"
  if (place === 3) return "third"
  return `${place}${ordinalSuffix(place)}`
}

/**
 * Connected historical narrative — media-guide style analysis, not a bullet dump.
 */
export function buildHistoricalContextNarrative(stats: AnalystProfileStats): string {
  const name = stats.displayName.trim() || "This wrestler"
  const last = name.includes(" ") ? name.split(/\s+/).slice(-1)[0]! : name
  const hs = (stats.highSchool ?? "").trim()
  const places = [...(stats.nchsaaPlacesChronological ?? [])].sort((a, b) => a.year - b.year)
  const earlyPlacers = places.filter((p) => p.place >= 2 && p.place <= 6)
  const titles = places.filter((p) => p.place === 1)
  const seniorUndefeated = (stats.seasonRecords ?? []).find(
    (s) => (s.classLabel ?? "").toLowerCase() === "senior" && s.losses === 0 && s.wins > 0,
  )
  const dave = (stats.daveSchultzYears ?? []).length > 0
  const dual = stats.schoolDualTitles?.[0]
  const college = (stats.college ?? "").trim()
  const prev = (stats.previousCollege ?? "").trim()

  if (earlyPlacers.length >= 2 && titles.length >= 1) {
    const samePlace = earlyPlacers.every((p) => p.place === earlyPlacers[0].place)
    const placeLabel = placeWord(earlyPlacers[0].place)
    const opener = samePlace
      ? `After two ${placeLabel}-place finishes to begin his career, ${last}`
      : `After early state podium finishes, ${last}`

    const titleClause =
      titles.length >= 2 ? "won consecutive state championships" : "broke through for a state championship"

    const climaxBits: string[] = []
    if (seniorUndefeated) {
      climaxBits.push(
        `a perfect ${recordStr(seniorUndefeated.wins, seniorUndefeated.losses)} record`,
      )
    }
    if (dave) climaxBits.push("a Dave Schultz Award")
    else if ((stats.triciaSaundersYears ?? []).length) climaxBits.push("a Tricia Saunders Award")
    if (dual && hs) {
      const div = dual.division ? ` ${String(dual.division).trim()}` : ""
      climaxBits.push(
        `a key role in ${possessiveName(hs)} ${dual.year} NCHSAA${div} Dual Team State Championship`,
      )
    }

    let body: string
    if (climaxBits.length === 0) {
      body = titleClause
    } else {
      const climax =
        climaxBits.length === 1
          ? climaxBits[0]
          : climaxBits.length === 2
            ? `${climaxBits[0]} and ${climaxBits[1]}`
            : `${climaxBits.slice(0, -1).join(", ")}, and ${climaxBits[climaxBits.length - 1]}`
      body = seniorUndefeated
        ? `${titleClause} and capped his senior season with ${climax}`
        : `${titleClause}, earning ${climax}`
    }

    const collegeBit =
      college && prev && prev.toLowerCase() !== college.toLowerCase()
        ? ` He continued his collegiate career at ${prev} and ${college}.`
        : college
          ? ` He continued his collegiate career at ${college}.`
          : ""

    return ["Historical context:", "", `${opener} ${body}.${collegeBit}`].join("\n")
  }

  const sentences: string[] = []
  const gy = stats.graduationYear
  const titleYears = titles.map((t) => t.year)
  const consecutive = yearsAreConsecutive(titleYears)
  const everyHsSeason =
    gy != null &&
    titles.length >= 4 &&
    consecutive &&
    titleYears[0] === Math.floor(gy) - 3 &&
    titleYears[titleYears.length - 1] === Math.floor(gy)

  if (titles.length >= 4 && consecutive) {
    const y0 = titleYears[0]
    const y1 = titleYears[titleYears.length - 1]
    sentences.push(
      everyHsSeason
        ? `${name} won four consecutive NCHSAA state championships from ${y0} through ${y1}, capturing a state title in every season of his high school career.`
        : `${name} became a four-time state champion with titles from ${y0}–${y1}.`,
    )
    const ft = fourTimeOrdinal(name)
    if (ft) {
      sentences.push(
        `He is one of ${ft.total} four-time NCHSAA state champions in North Carolina history (the ${ft.index}${ordinalSuffix(ft.index)} chronologically to join that group).`,
      )
    }
  } else if (titles.length >= 2 && consecutive) {
    sentences.push(
      `${name} won consecutive NCHSAA state championships from ${titleYears[0]} through ${titleYears[titleYears.length - 1]}.`,
    )
  } else if (titles.length >= 2) {
    sentences.push(`${name} finished as a ${titles.length}× NCHSAA State Champion.`)
  } else if (titles.length === 1) {
    sentences.push(`${name} claimed an NCHSAA state title${hs ? ` for ${hs}` : ""}.`)
  } else {
    sentences.push(`${name} compiled a verified RecruitNC career profile${hs ? ` at ${hs}` : ""}.`)
  }

  // Prefer one analytical addition beyond titles — avoid re-listing snapshot honors.
  const juniorUndefeated = (stats.seasonRecords ?? []).find(
    (s) => (s.classLabel ?? "").toLowerCase() === "junior" && s.losses === 0 && s.wins > 0,
  )
  if (seniorUndefeated && juniorUndefeated) {
    sentences.push(
      `His résumé includes undefeated ${juniorUndefeated.classLabel?.toLowerCase() ?? "junior"} (${recordStr(juniorUndefeated.wins, juniorUndefeated.losses)}) and senior (${recordStr(seniorUndefeated.wins, seniorUndefeated.losses)}) seasons.`,
    )
  } else if (seniorUndefeated) {
    sentences.push(
      `He capped his senior season with a perfect ${recordStr(seniorUndefeated.wins, seniorUndefeated.losses)} record.`,
    )
  } else if (hasCareerRecord(stats.careerWins, stats.careerLosses) && titles.length < 4) {
    sentences.push(`His high school record stands at ${recordStr(stats.careerWins!, stats.careerLosses!)}.`)
  }
  if (dave && titles.length < 4) {
    sentences.push("He won the Dave Schultz High School Excellence Award.")
  }
  if (dual && hs) {
    const div = dual.division ? ` ${String(dual.division).trim()}` : ""
    sentences.push(
      `He played a key role in ${possessiveName(hs)} ${dual.year} NCHSAA${div} Dual Team State Championship.`,
    )
  }
  if (college && prev && prev.toLowerCase() !== college.toLowerCase() && titles.length < 4) {
    sentences.push(`He continued his collegiate career at ${prev} and ${college}.`)
  } else if (college && titles.length < 4 && !hasCareerRecord(stats.careerWins, stats.careerLosses)) {
    sentences.push(`He committed to ${college}.`)
  }
  if (sentences.length <= 1 && !hasCareerRecord(stats.careerWins, stats.careerLosses) && !titles.length) {
    return ""
  }
  return ["Historical context:", "", sentences.join(" ")].join("\n")
}

/** @deprecated use buildHistoricalContextNarrative */
export function buildHistoricalContextBullets(stats: AnalystProfileStats): string {
  return buildHistoricalContextNarrative(stats)
}

export function buildNotableAchievementsMarkdown(stats: AnalystProfileStats): string {
  // Kept for callers; dossier no longer emits this section (duplicates snapshot/timeline).
  const bullets: string[] = []
  const titles = [...(stats.nchsaaPlacesChronological ?? [])]
    .filter((p) => p.place === 1)
    .sort((a, b) => a.year - b.year)
  const years = titles.map((t) => t.year)
  if (titles.length >= 4 && yearsAreConsecutive(years)) {
    bullets.push(
      `Won four consecutive NCHSAA state championships from ${years[0]} through ${years[years.length - 1]}.`,
    )
    const gy = stats.graduationYear
    if (
      gy != null &&
      years[0] === Math.floor(gy) - 3 &&
      years[years.length - 1] === Math.floor(gy)
    ) {
      bullets.push("Captured a state title in every season of his high school career.")
    }
  } else if (titles.length >= 2 && yearsAreConsecutive(years)) {
    bullets.push(
      titles.length === 2
        ? `Won consecutive NCHSAA state championships (${years[0]}–${years[1]}).`
        : `Won ${titles.length} consecutive NCHSAA state championships from ${years[0]} through ${years[years.length - 1]}.`,
    )
  } else if (titles.length >= 1) {
    bullets.push(
      titles.length === 1 ? "NCHSAA State Champion." : `${titles.length}× NCHSAA State Champion.`,
    )
  }

  if (hasCareerRecord(stats.careerWins, stats.careerLosses)) {
    const undefeated = (stats.seasonRecords ?? []).filter((s) => s.losses === 0 && s.wins > 0)
    const undBits = undefeated
      .map((s) => {
        const cls = (s.classLabel ?? "").toLowerCase()
        return cls ? `a ${recordStr(s.wins, s.losses)} ${cls} season` : recordStr(s.wins, s.losses)
      })
      .slice(0, 2)
    if (undBits.length) {
      bullets.push(
        `Finished ${recordStr(stats.careerWins!, stats.careerLosses!)}, including ${undBits.join(" and ")}.`,
      )
    } else {
      bullets.push(`Finished ${recordStr(stats.careerWins!, stats.careerLosses!)}.`)
    }
  }

  const nhscaAa = stats.nhscaAllAmericanCount ?? 0
  const s32Aa = stats.super32AllAmericanCount ?? 0
  const nationalBits: string[] = []
  if (nhscaAa >= 1) {
    nationalBits.push(
      nhscaAa === 1 ? "one NHSCA All-American finish" : `${nhscaAa} NHSCA All-American finishes`,
    )
  }
  if (s32Aa >= 1) {
    nationalBits.push(
      s32Aa === 1 ? "a Super 32 All-American finish" : `${s32Aa} Super 32 All-American finishes`,
    )
  }
  if (nationalBits.length) {
    bullets.push(
      nationalBits.length === 1
        ? `Earned ${nationalBits[0]}.`
        : `Earned ${nationalBits.slice(0, -1).join(", ")} and ${nationalBits[nationalBits.length - 1]}.`,
    )
  }

  if ((stats.daveSchultzYears ?? []).length > 0) {
    bullets.push("Dave Schultz High School Excellence Award winner.")
  }

  if (!bullets.length) return ""
  return ["Notable achievements:", ...bullets.map((b) => `• ${b}`)].join("\n")
}

export function buildDevelopmentPathMarkdown(stats: AnalystProfileStats): string {
  const lines: string[] = ["Development path:"]
  const hs = (stats.highSchool ?? "").trim()
  if (hs) {
    lines.push("🏫 High School")
    lines.push(hs)
    lines.push("")
  }
  const club = (stats.wrestlingClub ?? "").trim()
  if (club) {
    lines.push("🤼 Club")
    lines.push(club)
    lines.push("")
  }

  const ncu = (stats.ncUnitedEvents ?? []).filter((e) => !e.isPlaceholder && String(e.event ?? "").trim())
  if (stats.ncUnitedBlue || ncu.length) {
    lines.push("NC United")
    if (stats.ncUnitedBlue) {
      const gy = stats.graduationYear
      const years =
        gy != null ? ` (${Math.floor(gy) - 1}–${Math.floor(gy)})` : ""
      lines.push(`🔵 Blue Team${years}`)
    }
    if (ncu.length) {
      const countLabel =
        ncu.length === 1
          ? "1 national-team event"
          : `${ncu.length} national-team events`
      lines.push(`🇺🇸 National Team — ${countLabel}`)
      for (const e of ncu.sort((a, b) => Number(a.year || 0) - Number(b.year || 0))) {
        const rec = String(e.record ?? "").trim()
        lines.push(
          `• ${String(e.event).trim()}${e.year != null ? ` (${e.year})` : ""}${
            rec ? ` — ${enDashRecord(rec)}` : ""
          }`,
        )
      }
    }
    lines.push("")
  }

  const college = (stats.college ?? "").trim()
  const prev = (stats.previousCollege ?? "").trim()
  if (college) {
    lines.push("🎓 College")
    if (prev && prev.toLowerCase() !== college.toLowerCase()) {
      lines.push(`${prev} → ${college}`)
    } else {
      lines.push(college)
    }
    lines.push("")
  }
  while (lines.length > 1 && lines[lines.length - 1] === "") lines.pop()
  if (lines.length <= 1) return ""
  return lines.join("\n")
}

export function buildRepresentedNorthCarolinaMarkdown(stats: AnalystProfileStats): string {
  const ncu = (stats.ncUnitedEvents ?? []).filter((e) => !e.isPlaceholder && String(e.event ?? "").trim())
  if (!ncu.length && !stats.ncUnitedBlue) return ""
  const lines: string[] = ["Represented North Carolina:"]
  if (stats.ncUnitedBlue) {
    lines.push("🔵 NC United Blue Team member")
  }
  let totalW = 0
  let totalL = 0
  for (const e of ncu.sort((a, b) => Number(a.year || 0) - Number(b.year || 0))) {
    const rec = String(e.record ?? "").trim()
    const wl = rec ? parseWl(rec) : null
    if (wl) {
      totalW += wl.wins
      totalL += wl.losses
    }
    lines.push(
      `🇺🇸 ${String(e.event).trim()}${e.year != null ? ` (${e.year})` : ""}${rec ? ` — ${enDashRecord(rec)}` : ""}`,
    )
  }
  if (totalW + totalL > 0) {
    lines.push(`Combined NC United record: ${recordStr(totalW, totalL)}`)
  }
  return lines.join("\n")
}

export function buildVerifiedSourcesFooter(stats: AnalystProfileStats): string {
  const sources = new Set<string>(stats.verifiedSources ?? [])
  if ((stats.nchsaaPlacesChronological ?? []).length || stats.stateTitleYears > 0) sources.add("NCHSAA")
  if ((stats.nhscaAllAmericanCount ?? 0) > 0) sources.add("NHSCA")
  if ((stats.super32AllAmericanCount ?? 0) > 0) sources.add("Super32")
  if ((stats.fargoAllAmericanCount ?? 0) > 0) sources.add("Fargo")
  if ((stats.ncUnitedEvents ?? []).length || stats.ncUnitedBlue) sources.add("NC United")
  if (stats.prospectRanking != null || stats.careerWinsRank != null || hasCareerRecord(stats.careerWins, stats.careerLosses)) {
    sources.add("RecruitNC")
  }
  if ((stats.daveSchultzYears ?? []).length) sources.add("Dave Schultz Award")
  if ((stats.triciaSaundersYears ?? []).length) sources.add("Tricia Saunders Award")
  if (!sources.size) sources.add("RecruitNC")

  const ordered = ["NCHSAA", "NHSCA", "Super32", "Fargo", "NC United", "RecruitNC", "Dave Schultz Award", "Tricia Saunders Award"].filter(
    (s) => sources.has(s),
  )
  for (const s of sources) {
    if (!ordered.includes(s)) ordered.push(s)
  }

  return [
    "---",
    "Verified sources:",
    ...ordered.map((s) => `✓ ${s}`),
    "",
    "Confidence: high",
  ].join("\n")
}

/**
 * Verified rankings only — career win rank and RecruitNC class rank when present.
 * Four-time group membership is stated as a count (not a competitive “ranking”).
 */
export function buildHistoricalRankingsMarkdown(stats: AnalystProfileStats): string {
  const rows: string[] = []
  if (stats.careerWinsRank != null && stats.careerWinsRank > 0 && hasCareerRecord(stats.careerWins, stats.careerLosses)) {
    rows.push(
      `Career Wins\n${Math.floor(stats.careerWins!)} (#${stats.careerWinsRank} in NC history)`,
    )
  }
  if (
    isOfficialPublishedProspectRank(stats.prospectRanking, stats.graduationYear) &&
    stats.graduationYear != null
  ) {
    rows.push(
      `Class of ${Math.floor(stats.graduationYear)}\nRecruitNC #${stats.prospectRanking}`,
    )
  }
  const ft = fourTimeOrdinal(stats.displayName)
  if (ft || stats.stateTitleYears >= 4) {
    const total = ft?.total ?? FOUR_TIME_STATE_CHAMPIONS_COUNT
    if (ft) {
      rows.push(
        `Four-time champions\nOne of ${total} in NC history (chronologically the ${ft.index}${ordinalSuffix(ft.index)} to join that group)`,
      )
    } else {
      rows.push(`Four-time champions\nOne of ${total} in NC history`)
    }
  }
  if (!rows.length) return ""
  return ["Historical rankings:", "", rows.join("\n\n")].join("\n")
}

function ordinalSuffix(n: number): string {
  const v = n % 100
  if (v >= 11 && v <= 13) return "th"
  switch (n % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}

export function buildAnalystClosingSentence(stats: AnalystProfileStats): string {
  const name = stats.displayName.trim() || "He"
  const first = name.split(/\s+/)[0] || name
  const parts: string[] = []
  if (stats.stateTitleYears >= 4) {
    parts.push("a four-time NCHSAA State Champion")
  } else if (stats.stateTitleYears >= 2) {
    parts.push(`a ${stats.stateTitleYears}× NCHSAA State Champion`)
  } else if (stats.stateTitleYears === 1) {
    parts.push("an NCHSAA State Champion")
  }
  if (hasCareerRecord(stats.careerWins, stats.careerLosses)) {
    parts.push(`compiled a ${recordStr(stats.careerWins!, stats.careerLosses!)} record`)
  }
  const aa =
    (stats.nhscaAllAmericanCount ?? 0) +
    (stats.super32AllAmericanCount ?? 0) +
    (stats.fargoAllAmericanCount ?? 0)
  if (aa >= 2) parts.push("earned multiple national All-American honors")
  else if (aa === 1) parts.push("earned national All-American honors")
  const college = (stats.college ?? "").trim()
  if (college) {
    parts.push(formatCommitNarrativeClause(college, stats.previousCollege, stats.division))
  }
  if (parts.length === 0) return ""

  let body: string
  if (parts.length === 1) body = parts[0]
  else if (parts.length === 2) body = `${parts[0]} and ${parts[1]}`
  else body = `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`

  const tense = athleteHasCompletedHighSchoolCareer(stats.graduationYear)
    ? "completed his career as"
    : "has built a résumé as"

  return `${first} ${tense} ${body}.`
}

/** Linked name + analyst lead (keeps Data Dawg profile-link convention). */
export function formatAnalystAthleteOpening(
  displayName: string,
  athleteId: string | null | undefined,
  stats: AnalystProfileStats,
): string[] {
  const name = displayName?.trim() || "this athlete"
  const url = athleteId ? getAthleteProfileUrl(athleteId) : null
  const nameLink = url ? `[${name}](${url})` : name
  const lead = buildAnalystLeadParagraph({ ...stats, displayName: name })
  return [`Here's what I found about ${nameLink}:`, "", lead, ""]
}

function medalForPlace(place: number): string {
  if (place === 1) return "🥇"
  if (place === 2) return "🥈"
  if (place === 3) return "🥉"
  return "🏅"
}

function nhscaResumeLine(r: TournamentResultForDisplay): string | null {
  const p = placeNum(r.placement)
  const rec = (r.record ?? "").trim()
  const div = (r.division ?? "").trim()
  const year = r.year
  if (isAllAmericanPlace(p)) {
    if (p === 1) return `${medalForPlace(1)} ${year} Champion`
    if (p === 2) return `${medalForPlace(2)} ${year} Runner-up`
    if (p === 3) return `${medalForPlace(3)} ${year} 3rd`
    return `${medalForPlace(p!)} ${year} ${p}${ordinalSuffix(p!)}`
  }
  if (rec) return `${year} — ${enDashRecord(rec)}${div ? ` (${div})` : ""}`
  return null
}

function super32ResumeLine(r: TournamentResultForDisplay | Record<string, unknown>): string | null {
  const year = Number((r as { year?: unknown }).year) || 0
  const placementRaw = (r as { placement?: unknown; place?: unknown }).placement ?? (r as { place?: unknown }).place
  const p = placeNum(placementRaw)
  const record =
    String((r as { record?: unknown }).record ?? "").trim() ||
    ((r as { wins?: unknown }).wins != null && (r as { losses?: unknown }).losses != null
      ? `${(r as { wins: unknown }).wins}-${(r as { losses: unknown }).losses}`
      : "")
  if (isAllAmericanPlace(p)) {
    if (p === 1) return `${medalForPlace(1)} ${year} Champion`
    if (p === 2) return `${medalForPlace(2)} ${year} Runner-up`
    return `${medalForPlace(p!)} ${year} ${p}${ordinalSuffix(p!)}`
  }
  if (record) return `${year} — ${enDashRecord(record)}`
  return null
}

function parseWl(record: string): { wins: number; losses: number } | null {
  const m = record.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (!m) return null
  return { wins: parseInt(m[1], 10), losses: parseInt(m[2], 10) }
}

function fargoResumeLine(r: TournamentResultForDisplay, graduationYear?: number | null): string | null {
  const p = placeNum(r.placement)
  const rec = (r.record ?? "").trim()
  const year = r.year
  const division = String(r.division ?? "").trim()
  const divisionPart = division ? ` ${division}` : ""
  const classLabel =
    graduationYear != null
      ? (() => {
          const o = graduationYear - year
          if (o === 0) return "Senior"
          if (o === 1) return "Junior"
          if (o === 2) return "Sophomore"
          if (o === 3) return "Freshman"
          return null
        })()
      : null
  if (isAllAmericanPlace(p)) {
    const label =
      p === 1 ? "Champion" : p === 2 ? "Runner-up" : `${p}${ordinalSuffix(p!)}`
    return `${medalForPlace(p!)} ${year}${classLabel ? ` ${classLabel}` : ""}${divisionPart} ${label} All-American${rec ? ` (${enDashRecord(rec)})` : ""}`
  }
  if (rec) {
    const blood = explicitlyMentionsBloodRound(r.placement, rec)
      ? " — reached Blood Round"
      : ""
    return `${year}${classLabel ? ` ${classLabel}` : ""}${divisionPart} — ${enDashRecord(rec)}${blood}`
  }
  return null
}

/** Compact national résumé — headline summary first, then year lines. */
export function buildNationalResumeMarkdown(opts: {
  nhsca?: TournamentResultForDisplay[]
  super32?: Array<TournamentResultForDisplay | Record<string, unknown>>
  fargo?: TournamentResultForDisplay[]
  ncUnited?: Array<{
    year?: number | string | null
    event?: string | null
    record?: string | null
    isPlaceholder?: boolean
  }>
  graduationYear?: number | null
}): string {
  const blocks: string[] = []

  const nhscaAa = (opts.nhsca ?? [])
    .map((r) => ({ r, p: placeNum(r.placement) }))
    .filter((x) => isAllAmericanPlace(x.p))
    .sort((a, b) => a.r.year - b.r.year)
  const nhscaLines = [...(opts.nhsca ?? [])]
    .sort((a, b) => a.year - b.year)
    .map(nhscaResumeLine)
    .filter(Boolean) as string[]
  if (nhscaLines.length || nhscaAa.length) {
    const head: string[] = ["NHSCA"]
    if (nhscaAa.length) {
      head.push(`🏅 ${nhscaAa.length}× NHSCA All-American`)
      const best = [...nhscaAa].sort((a, b) => (a.p! - b.p!) || b.r.year - a.r.year)[0]
      const bestLabel =
        best.p === 1 ? "Champion" : best.p === 2 ? "Runner-up" : `${best.p}${ordinalSuffix(best.p!)}`
      head.push(`Best finish: ${bestLabel} (${best.r.year})`)
    }
    head.push(...nhscaLines)
    blocks.push(head.join("\n"))
  }

  const s32Aa = (opts.super32 ?? [])
    .map((r) => {
      const placementRaw = (r as { placement?: unknown; place?: unknown }).placement ?? (r as { place?: unknown }).place
      return { r, p: placeNum(placementRaw), year: Number((r as { year?: number }).year) || 0 }
    })
    .filter((x) => isAllAmericanPlace(x.p))
  const s32Lines = [...(opts.super32 ?? [])]
    .sort((a, b) => Number((a as { year?: number }).year || 0) - Number((b as { year?: number }).year || 0))
    .map(super32ResumeLine)
    .filter(Boolean) as string[]
  if (s32Lines.length) {
    const head: string[] = ["Super32"]
    if (s32Aa.length) {
      head.push(`🏅 ${s32Aa.length}× Super32 All-American`)
      const best = [...s32Aa].sort((a, b) => (a.p! - b.p!) || b.year - a.year)[0]
      head.push(`Best finish: ${best.p}${ordinalSuffix(best.p!)} (${best.year})`)
    } else {
      // Prefer best W-L (most wins, then fewest losses) — never the first chronological row.
      let bestRec: { wins: number; losses: number } | null = null
      for (const r of opts.super32 ?? []) {
        const record =
          String((r as { record?: unknown }).record ?? "").trim() ||
          ((r as { wins?: unknown }).wins != null && (r as { losses?: unknown }).losses != null
            ? `${(r as { wins: unknown }).wins}-${(r as { losses: unknown }).losses}`
            : "")
        const wl = record ? parseWl(record) : null
        if (!wl) continue
        if (
          !bestRec ||
          wl.wins > bestRec.wins ||
          (wl.wins === bestRec.wins && wl.losses < bestRec.losses)
        ) {
          bestRec = wl
        }
      }
      if (bestRec) {
        head.push(`Best listed result: ${recordStr(bestRec.wins, bestRec.losses)}`)
      }
    }
    head.push(...s32Lines)
    blocks.push(head.join("\n"))
  }

  const fargoAa = (opts.fargo ?? [])
    .map((r) => ({ r, p: placeNum(r.placement) }))
    .filter((x) => isAllAmericanPlace(x.p))
  const fargoLines = [...(opts.fargo ?? [])]
    .sort((a, b) => a.year - b.year)
    .map((r) => fargoResumeLine(r, opts.graduationYear))
    .filter(Boolean) as string[]
  if (fargoLines.length) {
    const head: string[] = ["Fargo"]
    if (fargoAa.length) {
      head.push(`🏅 ${fargoAa.length}× Fargo All-American`)
    }
    head.push(...fargoLines)
    blocks.push(head.join("\n"))
  }

  // NC United shown in Development / Represented sections — skip detailed dump here unless no other nationals.
  const ncu = (opts.ncUnited ?? []).filter((r) => !r.isPlaceholder)
  if (ncu.length && !blocks.length) {
    const lines = ncu
      .slice()
      .sort((a, b) => Number(a.year || 0) - Number(b.year || 0))
      .map((r) => {
        const rec = String(r.record ?? "").trim()
        return `${r.year} — ${String(r.event ?? "NC United").trim()}${rec ? ` (${enDashRecord(rec)})` : ""}`
      })
    blocks.push(["NC United", ...lines].join("\n"))
  }

  if (!blocks.length) return ""
  return ["National résumé:", "", blocks.join("\n\n")].join("\n")
}

/** Helper for state title detail list (chronological). */
export function formatStateResultsSection(nchsaa: NchsaaRowForProfile[]): string {
  const sorted = [...nchsaa].sort((a, b) => a.year - b.year)
  if (!sorted.length) return "State results:\nNone"
  const lines = sorted.map((r) => {
    const weight = (r.weight_class || "").toString().replace(/lbs?$/i, "").trim()
    const w = weight ? `${weight}lbs` : ""
    const cls = (r.classification || "").toString()
    const bits = [cls, w].filter(Boolean).join(", ")
    if (r.place === 1) return `- ${r.year}: State Champion${bits ? ` (${bits})` : ""}`
    if (r.place != null && r.place > 1 && r.place <= 6) {
      const placeText = r.place === 2 ? "2nd" : r.place === 3 ? "3rd" : `${r.place}th`
      return `- ${r.year}: ${placeText} place${bits ? ` (${bits})` : ""}`
    }
    // A row in the canonical state-results table without a podium place still
    // represents a verified state-tournament appearance (SQ), not a blank result.
    if (r.place === 0 || r.place == null) return `- ${r.year}: State qualifier${bits ? ` (${bits})` : ""}`
    return `- ${r.year}: State appearance${bits ? ` (${bits})` : ""}`
  })
  return ["State results:", ...lines].join("\n")
}
