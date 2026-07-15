/**
 * Canonical Fargo Nationals division fields.
 * Freestyle (FS) and Greco-Roman (GR) are independent competitions / careers.
 */

export type FargoStyle = "FS" | "GR"
export type FargoGender = "M" | "F"
export type FargoAgeDivision = "16U" | "Junior" | "Unknown"

export type ParsedFargoDivision = {
  style: FargoStyle
  gender: FargoGender
  age_division: FargoAgeDivision
  /** Display label kept on fargo_results.division for legacy readers */
  division: string
}

export function parseFargoStyle(raw: unknown): FargoStyle {
  const s = String(raw ?? "").trim().toUpperCase()
  if (s === "GR" || s === "GRECO" || /greco/.test(String(raw ?? "").toLowerCase())) return "GR"
  return "FS"
}

export function parseFargoGender(raw: unknown): FargoGender {
  const s = String(raw ?? "").trim().toLowerCase()
  if (s === "f" || s === "female" || s === "women" || s === "woman" || s === "girls" || s === "girl") {
    return "F"
  }
  if (/girl|women|female/.test(s)) return "F"
  return "M"
}

export function parseFargoAgeDivision(raw: unknown): FargoAgeDivision {
  const s = String(raw ?? "").trim().toLowerCase()
  if (/16[\s-]?u|cadet/.test(s)) return "16U"
  if (/junior|jr\b/.test(s)) return "Junior"
  return "Unknown"
}

/** Parse a legacy/full division string such as "Junior Boys Freestyle". */
export function parseFargoDivisionString(division: string | null | undefined): ParsedFargoDivision {
  const d = String(division ?? "").trim()
  const style = parseFargoStyle(d)
  const gender = parseFargoGender(d)
  const age_division = parseFargoAgeDivision(d)
  return {
    style,
    gender,
    age_division,
    division: d || buildFargoDivisionLabel(age_division, gender, style),
  }
}

export function buildFargoDivisionLabel(
  age: FargoAgeDivision | string,
  gender: FargoGender,
  style: FargoStyle,
): string {
  const ageLabel = age === "Unknown" ? "" : String(age)
  const genderLabel = gender === "F" ? "Girls" : "Boys"
  const styleLabel = style === "GR" ? "Greco-Roman" : "Freestyle"
  return [ageLabel, genderLabel, styleLabel].filter(Boolean).join(" ")
}

export function styleDisplayName(style: FargoStyle | string | null | undefined): string {
  return parseFargoStyle(style) === "GR" ? "Greco-Roman" : "Freestyle"
}
