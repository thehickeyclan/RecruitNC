import { normalizeFundraisingSchoolDisplay } from "./normalize-fundraising-school-display"

export function normDirectoryToken(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ")
}

/** Last two digits of standard NCU codes: `NCU-SOMETHING-31` → 31 (for tie-breaking). */
export function ncuCodeGradYearSuffix(code: string): number {
  const m = code.trim().toUpperCase().match(/-(\d{2})$/)
  if (!m) return -1
  const n = Number.parseInt(m[1], 10)
  return Number.isFinite(n) ? n : -1
}

/**
 * Collapse duplicate playbook/directory rows that point at the same public "who" (name + school).
 * False positives: twins with the same first+last and school — very rare on this surface.
 *
 * @param fallbackUnique - e.g. athlete id; prevents merging rows with no school line.
 */
export function fundraisingDirectoryIdentityKey(
  displayName: string,
  schoolSublabel: string | null | undefined,
  fallbackUnique: string,
): string {
  const name = normDirectoryToken(displayName)
  const schoolRaw = (schoolSublabel ?? "").trim()
  const school = normDirectoryToken(
    schoolRaw ? normalizeFundraisingSchoolDisplay(schoolRaw) : "",
  )
  if (!school) return `${name}::__${fallbackUnique}`
  return `${name}::${school}`
}
