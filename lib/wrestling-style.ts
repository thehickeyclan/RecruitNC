/**
 * Which style a result was wrestled in, and how far a wrestler's competition reaches.
 *
 * Matt: a coach should see at the top whether a kid wrestles in North Carolina only or nationally,
 * and in which styles - and freestyle and Greco results should sit apart from folkstyle, because a
 * Fargo bout and an NCHSAA bout are different evidence. One place decides both, so the profile and
 * the scouting report cannot disagree about a wrestler.
 *
 * Style is read from the event, which is the only place our data records it: Fargo rows and bouts
 * carry "Freestyle" or "Greco-Roman" in their names. Everything else we import - the high-school
 * season, NHSCA, Super 32, the duals, Journeymen, Beast of the East, Ironman, the TOC - is folkstyle.
 */

export type WrestlingStyle = "folkstyle" | "freestyle" | "greco"

export const STYLE_LABEL: Record<WrestlingStyle, string> = {
  folkstyle: "Folkstyle",
  freestyle: "Freestyle",
  greco: "Greco-Roman",
}

/** Events that are freestyle/Greco only, whatever their names say (Matt: "Tar Heel Classic is freestyle"). */
const OLYMPIC_ONLY_EVENTS =
  /tar\s*heel state classic|u\.?\s?s\.? open|frank e\.? rader|southeast regional championships|national duals - (16u|junior)|(16u|junior) national duals|usaw|usa wrestling/i

export function styleOfEvent(...parts: Array<string | null | undefined>): WrestlingStyle {
  // A division, where one is named, decides: "2026 NC Freestyle & Greco State Championships - 16U
  // Boys Freestyle" is freestyle, though the event's own name says both.
  const divisions = parts.filter(Boolean).map((p) => String(p)).filter((p) => p.includes(" - ")).map((p) => p.split(" - ").pop()!)
  const text = (divisions.length ? divisions : parts.filter(Boolean)).join(" ").toLowerCase()
  if (/\bgreco\b/.test(text)) return "greco"
  // A Fargo row with no style named is freestyle, the larger of its two tournaments.
  if (/\bfreestyle\b|\bfargo\b/.test(text)) return "freestyle"
  // USA Wrestling events whose names never say the style - a family-submitted win "at the Tar Heel
  // State Classic" was filed under folkstyle (Matt, Hayden Smith). Freestyle unless Greco is named.
  if (OLYMPIC_ONLY_EVENTS.test(parts.filter(Boolean).join(" "))) return "freestyle"
  return "folkstyle"
}

/** Freestyle and Greco-Roman are reported together, apart from folkstyle. */
export function isInternationalStyle(style: WrestlingStyle): boolean {
  return style !== "folkstyle"
}

/** Events outside the North Carolina season: national tournaments and out-of-state duals. */
const NATIONAL_EVENTS = [
  "NHSCA",
  "Fargo",
  "Super 32",
  "Journeymen",
  "I-64",
  "Interstate 64",
  "Beast of the East",
  "Ironman",
  "AAU Scholastic",
  "Ultimate Club",
  "National Duals",
]

export function isNationalEvent(event: string | null | undefined): boolean {
  const name = String(event ?? "").toLowerCase()
  // "Beast of the East @ Croatan" is a North Carolina tournament that borrowed the name.
  if (/croatan/.test(name)) return false
  return NATIONAL_EVENTS.some((e) => name.includes(e.toLowerCase()))
}

export type CompetitionSummary = {
  /** "national" once any national or out-of-state event is on file. */
  scope: "national" | "in-state"
  /** The national events entered, by short name, as the report and profile print them. */
  nationalEvents: string[]
  /** Styles on file, folkstyle first. */
  styles: WrestlingStyle[]
}

const SHORT_NAMES: Array<[RegExp, string]> = [
  [/junior national duals/i, "Junior National Duals"],
  [/16u national duals/i, "16U National Duals"],
  [/nhsca.*duals|national duals/i, "NHSCA Duals"],
  [/nhsca/i, "NHSCA Nationals"],
  [/early entry/i, "Super 32 Early Entry"],
  [/super 32/i, "Super 32"],
  [/fargo/i, "Fargo"],
  [/journeymen/i, "Journeymen"],
  [/i-64|interstate 64/i, "I-64 Duals"],
  [/beast of the east/i, "Beast of the East"],
  [/ironman/i, "Ironman"],
  [/aau scholastic/i, "AAU Scholastic Duals"],
  [/ultimate club/i, "Ultimate Club Duals"],
]

/**
 * A wrestler's reach and styles from the events on his record. `hasSeason` says whether he has a
 * North Carolina season on file, which is folkstyle whatever else he wrestles.
 */
export function summarizeCompetition(events: Array<string | null | undefined>, hasSeason: boolean): CompetitionSummary {
  const styles = new Set<WrestlingStyle>()
  if (hasSeason) styles.add("folkstyle")
  const national = new Set<string>()
  for (const event of events) {
    if (!event) continue
    styles.add(styleOfEvent(event))
    if (isNationalEvent(event)) {
      const short = SHORT_NAMES.find(([re]) => re.test(event))?.[1] ?? event
      national.add(short)
    }
  }
  const order: WrestlingStyle[] = ["folkstyle", "freestyle", "greco"]
  return {
    scope: national.size ? "national" : "in-state",
    nationalEvents: [...national],
    styles: order.filter((s) => styles.has(s)),
  }
}

/** "Competes nationally (NHSCA Nationals, Fargo)" or "North Carolina only". */
export function competitionLine(summary: CompetitionSummary): string {
  return summary.scope === "national"
    ? `Nationally — ${summary.nationalEvents.join(", ")}`
    : "North Carolina only"
}

export function stylesLine(summary: CompetitionSummary): string {
  return summary.styles.length ? summary.styles.map((s) => STYLE_LABEL[s]).join(", ") : "None on file"
}
