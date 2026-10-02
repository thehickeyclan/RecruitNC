/**
 * "2026 NC Freestyle & Greco State Championships - 16U Boys Freestyle" -> "NC Freestyle & Greco
 * States · 16U Freestyle", so the Olympic rows read like the Fargo ones ("Fargo · Freestyle").
 * Shared by the web profile and the phone's profile endpoint.
 */
export function shortOlympicEvent(event: string): string {
  const [rawName, rawDivision] = event.replace(/^\d{4}\s+/, "").split(" - ")
  if (!rawDivision) return rawName
  const name = rawName.replace(/State Championships$/i, "States")
  let division = rawDivision.replace(/\bBoys\s+/i, "").replace(/\bGreco\b(?!-)/i, "Greco-Roman").trim()
  const age = division.match(/^(16U|Junior)\s+/i)
  if (age && new RegExp(`\\b${age[1]}\\b`, "i").test(name)) division = division.slice(age[0].length)
  return `${name} · ${division}`
}
