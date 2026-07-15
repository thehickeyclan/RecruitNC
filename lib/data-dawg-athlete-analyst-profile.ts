/**
 * Sports-analyst / Hall-of-Fame style copy for Data Dawg athlete dossiers.
 * Every claim is derived from verified row data — never free-form LLM invention.
 */

import { getAthleteProfileUrl } from "@/lib/athlete-profile-links"
import { FOUR_TIME_STATE_CHAMPIONS, FOUR_TIME_STATE_CHAMPIONS_COUNT } from "@/lib/four-time-state-champions"
import { namesMatch } from "@/lib/nhsca-live/names-match"
import type { NchsaaRowForProfile } from "@/lib/nchsaa-results-json"
import type { TournamentResultForDisplay } from "@/lib/public-profile-data"

export type AnalystProfileStats = {
  displayName: string
  athleteId?: string | null
  highSchool?: string | null
  graduationYear?: number | null
  careerWins?: number | null
  careerLosses?: number | null
  stateTitleYears: number
  college?: string | null
  previousCollege?: string | null
  division?: string | null
  recruitingStatus?: string | null
  /** RecruitNC public prospect rank when present. */
  prospectRanking?: number | null
  /** Rank from career_winningest_wrestlers when matched. */
  careerWinsRank?: number | null
  /** Individual duals MOW count (personal). */
  dualsMowCount?: number
  /** School dual titles in the athlete's HS window (team context). */
  schoolDualTitlesInWindow?: number
  nhscaAllAmericanCount?: number
  super32AllAmericanCount?: number
  fargoAllAmericanCount?: number
  daveSchultzYears?: number[]
  triciaSaundersYears?: number[]
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
    const div = (stats.division ?? "").trim()
    const divBit = div && !college.toLowerCase().includes(div.toLowerCase()) ? ` (${div})` : ""
    if (midParts.length > 0) {
      midParts[midParts.length - 1] = `${midParts[midParts.length - 1]} and committed to ${college}${divBit}`
    } else {
      midParts.push(`${first} committed to ${college}${divBit}`)
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
    const div = (stats.division ?? "").trim()
    const divBit = div && !college.toLowerCase().includes(div.toLowerCase()) ? ` (${div})` : ""
    const prev = (stats.previousCollege ?? "").trim()
    const transfer =
      prev && prev.toLowerCase() !== college.toLowerCase() ? ` — transferred from ${prev}` : ""
    lines.push(`Committed to ${college}${divBit}${transfer}`)
  }
  if (lines.length <= 1) return ""
  return lines.join("\n")
}

/** Verified significance bullets only. */
export function buildHistoricalContextBullets(stats: AnalystProfileStats): string {
  const bullets: string[] = []
  const ft = fourTimeOrdinal(stats.displayName)
  if (stats.stateTitleYears >= 4 || ft) {
    bullets.push(
      `One of North Carolina's ${FOUR_TIME_STATE_CHAMPIONS_COUNT} four-time NCHSAA state champions.`,
    )
  } else if (stats.stateTitleYears === 3) {
    bullets.push("One of North Carolina's three-time NCHSAA state champions.")
  } else if (stats.stateTitleYears === 2) {
    bullets.push("A two-time NCHSAA state champion.")
  }

  if (hasCareerRecord(stats.careerWins, stats.careerLosses)) {
    const w = Math.floor(stats.careerWins!)
    if (w >= 200) {
      bullets.push(`Finished with over 200 career victories (${recordStr(stats.careerWins!, stats.careerLosses!)}).`)
    } else if (w >= 150) {
      bullets.push(`Compiled ${recordStr(stats.careerWins!, stats.careerLosses!)} — more than 150 high school wins.`)
    } else if (w >= 100) {
      bullets.push(`Surpassed 100 high school wins (${recordStr(stats.careerWins!, stats.careerLosses!)}).`)
    }
  }

  if (stats.careerWinsRank != null && stats.careerWinsRank > 0) {
    bullets.push(`Ranks #${stats.careerWinsRank} on North Carolina's all-time career winningest list.`)
  }

  const hs = (stats.highSchool ?? "").trim()
  if (hs && (stats.schoolDualTitlesInWindow ?? 0) > 0) {
    const n = stats.schoolDualTitlesInWindow!
    bullets.push(
      `Wrestled at ${hs} during a window that includes ${n} NCHSAA state dual team title${n === 1 ? "" : "s"}.`,
    )
  }

  if (stats.dualsMowCount && stats.dualsMowCount > 0) {
    bullets.push(
      `Named State Duals Most Outstanding Wrestler ${stats.dualsMowCount === 1 ? "once" : `${stats.dualsMowCount} times`}.`,
    )
  }

  const nhscaAa = stats.nhscaAllAmericanCount ?? 0
  if (nhscaAa >= 2) {
    bullets.push(`Multiple-time NHSCA All-American (${nhscaAa} national podium finishes).`)
  } else if (nhscaAa === 1) {
    bullets.push("NHSCA All-American.")
  }

  if (
    stats.prospectRanking != null &&
    stats.prospectRanking > 0 &&
    stats.prospectRanking <= 30 &&
    stats.graduationYear != null
  ) {
    bullets.push(
      `Among RecruitNC's top ${stats.prospectRanking <= 10 ? "10" : "30"} prospects in the Class of ${Math.floor(stats.graduationYear)} (#${stats.prospectRanking}).`,
    )
  }

  if ((stats.daveSchultzYears ?? []).length > 0) {
    bullets.push(
      `Dave Schultz High School Excellence Award winner (${stats.daveSchultzYears!.join(", ")}).`,
    )
  }
  if ((stats.triciaSaundersYears ?? []).length > 0) {
    bullets.push(
      `Tricia Saunders High School Excellence Award winner (${stats.triciaSaundersYears!.join(", ")}).`,
    )
  }

  if (!bullets.length) return ""
  return ["Historical context:", ...bullets.map((b) => `• ${b}`)].join("\n")
}

export function buildHistoricalRankingsMarkdown(stats: AnalystProfileStats): string {
  const rows: string[] = []
  if (stats.careerWinsRank != null && stats.careerWinsRank > 0) {
    rows.push(`Career wins — #${stats.careerWinsRank}`)
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
    rows.push(`Class of ${Math.floor(stats.graduationYear)} RecruitNC rank — #${stats.prospectRanking}`)
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
    const div = (stats.division ?? "").trim()
    const divBit = div && !college.toLowerCase().includes(div.toLowerCase()) ? ` (${div})` : ""
    parts.push(`signed with ${college}${divBit}`)
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

/** Compact national résumé (achievements-first, not year-by-year dumps). */
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

  const nhscaLines = [...(opts.nhsca ?? [])]
    .sort((a, b) => a.year - b.year)
    .map(nhscaResumeLine)
    .filter(Boolean) as string[]
  if (nhscaLines.length) {
    blocks.push(["NHSCA", ...nhscaLines.map((l) => l)].join("\n"))
  }

  const s32Lines = [...(opts.super32 ?? [])]
    .sort((a, b) => Number((a as { year?: number }).year || 0) - Number((b as { year?: number }).year || 0))
    .map(super32ResumeLine)
    .filter(Boolean) as string[]
  if (s32Lines.length) {
    blocks.push(["Super32", ...s32Lines].join("\n"))
  }

  const fargoLines = [...(opts.fargo ?? [])]
    .sort((a, b) => a.year - b.year)
    .map((r) => fargoResumeLine(r, opts.graduationYear))
    .filter(Boolean) as string[]
  if (fargoLines.length) {
    blocks.push(["Fargo", ...fargoLines].join("\n"))
  }

  const ncu = (opts.ncUnited ?? []).filter((r) => !r.isPlaceholder)
  if (ncu.length) {
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
