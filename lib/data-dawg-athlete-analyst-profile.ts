/**
 * Sports-analyst / Hall-of-Fame style copy for Data Dawg athlete dossiers.
 * Every claim is derived from verified row data — never free-form LLM invention.
 */

import { getAthleteProfileUrl } from "@/lib/athlete-profile-links"
import {
  formatCommitChronologyLine,
  formatCommitNarrativeClause,
} from "@/lib/data-dawg-college-commit"
import { FOUR_TIME_STATE_CHAMPIONS, FOUR_TIME_STATE_CHAMPIONS_COUNT } from "@/lib/four-time-state-champions"
import { namesMatch } from "@/lib/nhsca-live/names-match"
import type { NchsaaRowForProfile } from "@/lib/nchsaa-results-json"
import type { TournamentResultForDisplay } from "@/lib/public-profile-data"

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
 * Opening analyst paragraph — significance first, then facts.
 */
export function buildAnalystLeadParagraph(stats: AnalystProfileStats): string {
  const name = stats.displayName.trim() || "This wrestler"
  const first = name.split(/\s+/)[0] || name
  const hs = (stats.highSchool ?? "").trim()
  const gy = stats.graduationYear
  const titles = stats.stateTitleYears
  const hasRec = hasCareerRecord(stats.careerWins, stats.careerLosses)
  const rec = hasRec ? recordStr(stats.careerWins!, stats.careerLosses!) : null
  const college = (stats.college ?? "").trim()

  const classBit =
    gy != null && Number.isFinite(gy) ? ` in the Class of ${Math.floor(gy)}` : ""

  let open: string
  if (titles >= 4) {
    open = `${name} is one of North Carolina's most accomplished wrestlers${classBit}.`
  } else if (titles === 3) {
    open = `${name} ranks among North Carolina's elite high school wrestlers${classBit}.`
  } else if (titles === 2) {
    open = `${name} established himself as one of the top wrestlers${classBit} in North Carolina.`
  } else if (titles === 1) {
    open = `${name} is a NCHSAA State Champion${hs ? ` from ${hs}` : ""}${classBit}.`
  } else if (stats.nhscaAllAmericanCount || stats.super32AllAmericanCount || stats.fargoAllAmericanCount) {
    open = `${name} is a nationally honored North Carolina wrestler${classBit}.`
  } else if (hs || gy) {
    open = `${name} is a North Carolina high school wrestler${hs ? ` from ${hs}` : ""}${classBit}.`
  } else {
    open = `Here's the verified RecruitNC profile for ${name}.`
  }

  const midParts: string[] = []
  if (titles >= 4 && hs) {
    midParts.push(`A four-time NCHSAA State Champion at ${hs}`)
  } else if (titles >= 2 && hs) {
    midParts.push(`A ${titles}× NCHSAA State Champion at ${hs}`)
  } else if (titles >= 2) {
    midParts.push(`A ${titles}× NCHSAA State Champion`)
  } else if (titles === 1 && !open.includes("State Champion")) {
    midParts.push(`A NCHSAA State Champion${hs ? ` at ${hs}` : ""}`)
  }

  if (rec) {
    const who = titles >= 1 || midParts.length > 0 ? "he" : first
    if (midParts.length > 0) {
      midParts[midParts.length - 1] = `${midParts[midParts.length - 1]}, ${who} finished ${
        gy != null && gy <= new Date().getFullYear() ? "his high school career" : "so far"
      } with a ${rec} record`
    } else {
      midParts.push(
        `${first} carries a ${rec} high school record${hs ? ` at ${hs}` : ""}`,
      )
    }
  }

  if (college) {
    const clause = formatCommitNarrativeClause(college, stats.previousCollege, stats.division)
    if (midParts.length > 0) {
      midParts[midParts.length - 1] = `${midParts[midParts.length - 1]} and ${clause}`
    } else {
      midParts.push(`${first} ${clause}`)
    }
  } else if ((stats.recruitingStatus ?? "").trim() && !college) {
    midParts.push(`Recruiting status: ${stats.recruitingStatus!.trim()}`)
  }

  if (midParts.length === 0) return open
  let mid = midParts.join(". ")
  if (!/[.!?]$/.test(mid)) mid += "."
  // Capitalize after open sentence
  return `${open} ${mid.charAt(0).toUpperCase()}${mid.slice(1)}`
}

/** Compact identity + headline stats under the lead. */
export function buildCareerSnapshotMarkdown(stats: AnalystProfileStats): string {
  const lines: string[] = ["Career snapshot:"]
  if (hasCareerRecord(stats.careerWins, stats.careerLosses)) {
    lines.push(recordStr(stats.careerWins!, stats.careerLosses!))
  }
  if (stats.stateTitleYears >= 1) {
    lines.push(
      stats.stateTitleYears === 1
        ? "State Champion"
        : `${stats.stateTitleYears}× NCHSAA State Champion`,
    )
  }
  const aa =
    (stats.nhscaAllAmericanCount ?? 0) +
    (stats.super32AllAmericanCount ?? 0) +
    (stats.fargoAllAmericanCount ?? 0)
  if (aa > 0) {
    lines.push(`${aa} national All-American honor${aa === 1 ? "" : "s"}`)
  }
  const hs = (stats.highSchool ?? "").trim()
  const gy = stats.graduationYear
  if (hs || gy != null) {
    lines.push([hs || null, gy != null ? `Class of ${Math.floor(gy)}` : null].filter(Boolean).join(" · "))
  }
  const college = (stats.college ?? "").trim()
  if (college) {
    lines.push(formatCommitChronologyLine(college, stats.previousCollege, stats.division))
  }
  if (lines.length <= 1) return ""
  return lines.join("\n")
}

function placeWord(place: number): string {
  if (place === 1) return "champion"
  if (place === 2) return "runner-up"
  if (place === 3) return "third"
  return `${place}${ordinalSuffix(place)}`
}

function formatDualHelpSentence(hs: string, titles: SchoolDualTitle[]): string | null {
  if (!hs || !titles.length) return null
  if (titles.length === 1) {
    const t = titles[0]
    const div = t.division ? ` ${String(t.division).trim()}` : ""
    return `Helped ${hs} capture the ${t.year} NCHSAA${div} Dual Team State Championship`
  }
  const years = titles.map((t) => t.year).sort((a, b) => a - b)
  return `Helped ${hs} capture NCHSAA Dual Team State Championships in ${years.join(", ")}`
}

/**
 * Connected historical narrative (analysis, not a bullet dump).
 */
export function buildHistoricalContextNarrative(stats: AnalystProfileStats): string {
  const name = stats.displayName.trim() || "This wrestler"
  const first = name.split(/\s+/)[0] || name
  const gy = stats.graduationYear
  const hs = (stats.highSchool ?? "").trim()
  const places = [...(stats.nchsaaPlacesChronological ?? [])].sort((a, b) => a.year - b.year)
  const earlyPlacers = places.filter((p) => p.place >= 2 && p.place <= 6)
  const titles = places.filter((p) => p.place === 1)
  const sentences: string[] = []

  const classBit = gy != null ? ` in North Carolina's Class of ${Math.floor(gy)}` : " in North Carolina"
  if (stats.stateTitleYears >= 2 || (stats.prospectRanking != null && stats.prospectRanking <= 10)) {
    sentences.push(
      `${name} emerged as one of the premier wrestlers${classBit}.`,
    )
  } else if (stats.stateTitleYears === 1 || (stats.nhscaAllAmericanCount ?? 0) > 0) {
    sentences.push(`${name} built a standout high school career${classBit}.`)
  } else {
    sentences.push(`${name} compiled a verified RecruitNC career profile${hs ? ` at ${hs}` : ""}.`)
  }

  const arcBits: string[] = []
  if (earlyPlacers.length >= 2 && titles.length >= 1) {
    const samePlace = earlyPlacers.every((p) => p.place === earlyPlacers[0].place)
    const placeLabel = placeWord(earlyPlacers[0].place)
    if (samePlace && earlyPlacers.length >= 2) {
      arcBits.push(
        `After placing ${placeLabel} as both a freshman and sophomore`,
      )
    } else {
      arcBits.push(`After early state podium finishes`)
    }
    if (titles.length >= 2) {
      arcBits.push(`he finished his career with back-to-back state championships`)
    } else {
      arcBits.push(`he broke through for a state championship`)
    }
  } else if (titles.length >= 2) {
    arcBits.push(`He finished his high school career as a ${titles.length}× NCHSAA State Champion`)
  } else if (titles.length === 1) {
    arcBits.push(`He claimed an NCHSAA state title`)
  }

  const seniorUndefeated = (stats.seasonRecords ?? []).find(
    (s) =>
      (s.classLabel ?? "").toLowerCase() === "senior" &&
      s.losses === 0 &&
      s.wins > 0,
  )
  if (seniorUndefeated) {
    arcBits.push(
      `a perfect ${recordStr(seniorUndefeated.wins, seniorUndefeated.losses)} senior season`,
    )
  } else if (hasCareerRecord(stats.careerWins, stats.careerLosses)) {
    arcBits.push(`a ${recordStr(stats.careerWins!, stats.careerLosses!)} career record`)
  }

  const aa =
    (stats.nhscaAllAmericanCount ?? 0) +
    (stats.super32AllAmericanCount ?? 0) +
    (stats.fargoAllAmericanCount ?? 0)
  if ((stats.nhscaAllAmericanCount ?? 0) >= 2) {
    arcBits.push(`multiple NHSCA All-American finishes`)
  } else if (aa >= 1) {
    arcBits.push(`national All-American honors`)
  }

  if ((stats.daveSchultzYears ?? []).length > 0) {
    arcBits.push(`the Dave Schultz High School Excellence Award`)
  } else if ((stats.triciaSaundersYears ?? []).length > 0) {
    arcBits.push(`the Tricia Saunders High School Excellence Award`)
  }

  if (arcBits.length >= 2) {
    const head = arcBits[0]
    const rest = arcBits.slice(1)
    let clause: string
    if (rest.length === 1) clause = `${head}, ${rest[0]}`
    else clause = `${head}, ${rest.slice(0, -1).join(", ")}, and ${rest[rest.length - 1]}`
    if (!/^[A-Z]/.test(clause) && !clause.startsWith("After") && !clause.startsWith("He ")) {
      clause = clause.charAt(0).toUpperCase() + clause.slice(1)
    }
    if (!clause.endsWith(".")) clause += "."
    sentences.push(clause.startsWith("After") || clause.startsWith("He ") ? clause : `${first} ${clause.charAt(0).toLowerCase()}${clause.slice(1)}`)
  } else if (arcBits.length === 1) {
    const s = arcBits[0]
    sentences.push(s.endsWith(".") ? s : `${s}.`)
  }

  const dual = formatDualHelpSentence(hs, stats.schoolDualTitles ?? [])
  if (dual) sentences.push(`${dual}.`)

  const college = (stats.college ?? "").trim()
  const prev = (stats.previousCollege ?? "").trim()
  if (college && prev && prev.toLowerCase() !== college.toLowerCase()) {
    sentences.push(`He continued his career collegiately at both ${prev} and ${college}.`)
  } else if (college) {
    sentences.push(`He continued his career at ${college}.`)
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
  const bullets: string[] = []
  const titles = [...(stats.nchsaaPlacesChronological ?? [])]
    .filter((p) => p.place === 1)
    .sort((a, b) => a.year - b.year)
  if (titles.length >= 2) {
    const consecutive = titles.length >= 2 && titles[titles.length - 1].year - titles[titles.length - 2].year === 1
    bullets.push(
      consecutive
        ? "Back-to-back NCHSAA state championships."
        : `${titles.length}× NCHSAA State Champion.`,
    )
  } else if (titles.length === 1) {
    bullets.push("NCHSAA State Champion.")
  }

  const undefeatedTitles = (stats.seasonRecords ?? []).filter(
    (s) => s.losses === 0 && s.wins > 0 && (s.classLabel === "Senior" || s.classLabel === "Junior"),
  )
  if (undefeatedTitles.length && titles.length >= 2) {
    bullets.push(
      `Undefeated championship season${undefeatedTitles.length > 1 ? "s" : ""} (${undefeatedTitles
        .map((s) => recordStr(s.wins, s.losses))
        .join(", ")}).`,
    )
  } else if (undefeatedTitles.some((s) => s.classLabel === "Senior")) {
    const s = undefeatedTitles.find((x) => x.classLabel === "Senior")!
    bullets.push(`Undefeated senior season (${recordStr(s.wins, s.losses)}).`)
  }

  if ((stats.daveSchultzYears ?? []).length > 0) {
    bullets.push("Dave Schultz High School Excellence Award winner.")
  }
  if ((stats.triciaSaundersYears ?? []).length > 0) {
    bullets.push("Tricia Saunders High School Excellence Award winner.")
  }

  if (hasCareerRecord(stats.careerWins, stats.careerLosses)) {
    const l = Math.floor(stats.careerLosses!)
    if (l <= 10 && Math.floor(stats.careerWins!) >= 100) {
      bullets.push(
        l === 0
          ? `Undefeated high school career (${recordStr(stats.careerWins!, stats.careerLosses!)}).`
          : `Finished with only ${l} career loss${l === 1 ? "" : "es"} (${recordStr(stats.careerWins!, stats.careerLosses!)}).`,
      )
    }
  }

  if ((stats.nhscaAllAmericanCount ?? 0) >= 2) {
    bullets.push(`${stats.nhscaAllAmericanCount}× NHSCA All-American.`)
  } else if ((stats.nhscaAllAmericanCount ?? 0) === 1) {
    bullets.push("NHSCA All-American.")
  }

  const college = (stats.college ?? "").trim()
  const prev = (stats.previousCollege ?? "").trim()
  if (college && prev && prev.toLowerCase() !== college.toLowerCase()) {
    bullets.push(`Competed collegiately for both ${prev} and ${college}.`)
  }

  if (stats.ncUnitedBlue) {
    bullets.push("NC United Blue Team member.")
  }
  const ncuEvents = (stats.ncUnitedEvents ?? []).filter((e) => !e.isPlaceholder)
  if (ncuEvents.length > 0) {
    bullets.push(`NC United National Team competitor (${ncuEvents.length} event${ncuEvents.length === 1 ? "" : "s"}).`)
  }

  if ((stats.dualsMowCount ?? 0) > 0) {
    bullets.push("State Duals Most Outstanding Wrestler.")
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
  if (stats.ncUnitedBlue) {
    lines.push("🔵 NC United Blue Team")
    const gy = stats.graduationYear
    if (gy != null) {
      lines.push(`${Math.floor(gy) - 1}–${Math.floor(gy)}`)
    } else {
      lines.push("Member")
    }
    lines.push("")
  }
  const ncu = (stats.ncUnitedEvents ?? []).filter((e) => !e.isPlaceholder && String(e.event ?? "").trim())
  if (ncu.length) {
    lines.push("🇺🇸 NC United National Team")
    for (const e of ncu.sort((a, b) => Number(a.year || 0) - Number(b.year || 0))) {
      const rec = String(e.record ?? "").trim()
      lines.push(
        `${String(e.event).trim()}${e.year != null ? ` (${e.year})` : ""}${rec ? ` — ${enDashRecord(rec)}` : ""}`,
      )
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
  // Trim trailing blank
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

export function buildHistoricalRankingsMarkdown(stats: AnalystProfileStats): string {
  const rows: string[] = []
  if (stats.careerWinsRank != null && stats.careerWinsRank > 0) {
    rows.push(`Career wins — #${stats.careerWinsRank} in NC history`)
  } else if (hasCareerRecord(stats.careerWins, stats.careerLosses) && Math.floor(stats.careerWins!) >= 150) {
    rows.push(`Career wins — ${Math.floor(stats.careerWins!)} (elite NC total)`)
  }
  if (hasCareerRecord(stats.careerWins, stats.careerLosses)) {
    const w = Math.floor(stats.careerWins!)
    const l = Math.floor(stats.careerLosses!)
    const total = w + l
    if (total > 0) {
      const pct = ((w / total) * 100).toFixed(1)
      rows.push(`Career win % — ${pct}%`)
    }
  }
  const ft = fourTimeOrdinal(stats.displayName)
  if (ft || stats.stateTitleYears >= 4) {
    if (ft) rows.push(`4× champions — ${ft.index}${ordinalSuffix(ft.index)} in NC history (${ft.total} total)`)
    else rows.push(`4× champions — among NC's ${FOUR_TIME_STATE_CHAMPIONS_COUNT}`)
  }
  if (stats.stateTitleYears >= 1) {
    rows.push(
      stats.stateTitleYears >= 4
        ? "State titles — T-1 (four titles)"
        : `State titles — ${stats.stateTitleYears}`,
    )
  }
  if (
    stats.prospectRanking != null &&
    stats.prospectRanking > 0 &&
    stats.graduationYear != null
  ) {
    rows.push(
      `Class of ${Math.floor(stats.graduationYear)} — #${stats.prospectRanking} RecruitNC prospect`,
    )
  }
  if (!rows.length) return ""
  return ["Historical rankings:", ...rows.map((r) => `• ${r}`)].join("\n")
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

  const tense =
    stats.graduationYear != null && stats.graduationYear <= new Date().getFullYear()
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
    return `${medalForPlace(p!)} ${year}${classLabel ? ` ${classLabel}` : ""} ${label} All-American${rec ? ` (${enDashRecord(rec)})` : ""}`
  }
  if (rec) {
    const wl = parseWl(rec)
    const blood =
      wl && wl.wins >= 5 && !isAllAmericanPlace(p) ? " — reached Blood Round" : ""
    return `${year}${classLabel ? ` ${classLabel}` : ""} — ${enDashRecord(rec)}${blood}`
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
      const withRec = s32Lines.find((l) => /\d+–\d+/.test(l) || /\d+-\d+/.test(l))
      if (withRec) head.push(`Best listed result: ${withRec.replace(/^\d{4}\s*—\s*/, "")}`)
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
    if (r.place === 0) return `- ${r.year}: State qualifier${bits ? ` (${bits})` : ""}`
    return `- ${r.year}:${bits ? ` (${bits})` : ""}`
  })
  return ["State results:", ...lines].join("\n")
}
