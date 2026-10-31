import { US_STATES } from "@/lib/athlete-state"

/**
 * The high school state tournament's group on a profile's Results tab, named by the wrestler's own
 * association (Matt, 28 Oct 2026: a South Carolina kid's results sat under "NCHSAA State"). Rows
 * arrive as "SCHSL 5A State Championships" or "Ohio Girls State Championships"
 * (lib/profile/tournament-rows.ts, named by stateChampionshipName). The group keeps the body - the
 * association's acronym, or the state's name where we hold no association - and whether it is the
 * girls' tournament, never the classification, which every state writes differently.
 */
const STATE_NAMES = [...US_STATES].map((s) => s.name).sort((a, b) => b.length - a.length)

export function stateHsGroupName(event: string): string {
  const e = event.replace(/^\d{4}\s+/, "").trim()
  const acronym = e.match(/^([A-Z]{3,})\b/)?.[1]
  const body = acronym ?? STATE_NAMES.find((n) => e.toLowerCase().startsWith(n.toLowerCase())) ?? "High School"
  return `${body}${/\bgirls\b/i.test(e) ? " Girls" : ""} State Championships`
}

/** The folkstyle high school state tournament; freestyle and Greco state events are not it. */
export const isStateHs = (event: string) => /nchsaa|state championships?$/i.test(event) && !/freestyle|greco|usa wrestling|usaw/i.test(event)

/**
 * A state's classification as printed beside its body. Some sources put the whole event in it
 * ("FHSAA Girls State Championships", "2025 CIAC State Championships"): the year and the trailing
 * "State Championship(s)" go, so a row never reads "... State Championships State Championships".
 */
export const cleanClassification = (cls: string | null | undefined) =>
  String(cls ?? "")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\s*State Championships?$/i, "")
    .replace(/\s+/g, " ")
    .trim()
