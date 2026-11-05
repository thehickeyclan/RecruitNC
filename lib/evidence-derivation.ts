/**
 * Whether an export row's own evidence soundly derives the class year it claims.
 *
 * Lives in lib/ rather than beside the script that uses it so it can be tested without the script's
 * module-level work - reading .env, opening a Supabase client, and refusing to load without
 * --state and --file.
 */
const GRADE_OFFSET: Record<string, number> = {
  sr: 0, senior: 0,
  jr: 1, junior: 1,
  so: 2, sophomore: 2,
  fr: 3, freshman: 3,
}
/**
 * The shapes the evidence strings use to state a derivation. All of them must be read, or the
 * check reports silence as cleanliness: the reconciliation exports write "2024: HS Junior -> 2025
 * (IHSAA 11731425)", the discovery passes write "'106 - Luke Houchins (Benedictine), Jr.' in 2024
 * -> class of 2026", and a correction writes "Jr. in 2024 derives class of 2025, not 2026".
 */
const DERIVATIONS: Array<{ re: RegExp; gradeFirst: boolean }> = [
  { re: /(Sr|Jr|So|Fr)\.'\s*in\s*(\d{4})\s*->\s*class of\s*(\d{4})/g, gradeFirst: true },
  { re: /(Sr|Jr|So|Fr)\.?\s*in\s*(?:the season ending\s*)?(\d{4})\s*derives\s*class of\s*(\d{4})/gi, gradeFirst: true },
  { re: /(?:^|[^\d])(\d{4}):\s*(?:HS\s+)?(Freshman|Sophomore|Junior|Senior|Fr|So|Jr|Sr)\b[^>]*?->\s*(\d{4})/gi, gradeFirst: false },
]

/**
 * Whether the row's own evidence soundly derives the year it claims.
 *
 * A wrestler printed a grade in the season ENDING in a given year graduates on a fixed offset, so
 * every derivation an evidence string states can be checked against itself. Virginia's first
 * discovery pass derived 17 of its 45 champions from USA Wrestling's 2023-24 champions list while
 * treating it as the 2024-25 season, so each of those years was a year late; five contradicted
 * years we already held, correctly, and twelve more would have gone into blank rows unchallenged.
 *
 * The rule is "at least one sound derivation supports the claim", NOT "every derivation is sound",
 * and that distinction is the whole difficulty. A correction row quotes the mistake it is
 * correcting - "Jr. in 2024 derives class of 2025, not 2026. Original evidence: ... 'Jr.' in 2024
 * -> class of 2026" - so demanding that every derivation be sound refuses all 17 corrected rows
 * for containing a record of what was wrong with them. A row is refused only when it states
 * derivations and none of them both computes correctly and lands on the claimed year.
 */
export function evidenceContradictsItself(evidence: string, claimed: number): string | null {
  const text = String(evidence ?? "")
  const seen: Array<{ sound: boolean; stated: number; detail: string }> = []
  for (const { re, gradeFirst } of DERIVATIONS) {
    for (const m of text.matchAll(re)) {
      const grade = gradeFirst ? m[1]! : m[2]!
      const season = gradeFirst ? m[2]! : m[1]!
      const stated = Number(m[3]!)
      const off = GRADE_OFFSET[grade.toLowerCase()]
      if (off === undefined) continue
      const expected = Number(season) + off
      seen.push({
        sound: stated === expected,
        stated,
        detail: `${grade} in the season ending ${season} graduates ${expected}, but that derivation says ${stated}`,
      })
    }
  }
  if (!seen.length) return null
  if (seen.some((d) => d.sound && d.stated === claimed)) return null
  const unsound = seen.find((d) => !d.sound && d.stated === claimed)
  if (unsound) return unsound.detail
  const sound = seen.find((d) => d.sound)
  if (sound) return `the evidence soundly derives ${sound.stated} but the row claims ${claimed}`
  return seen[0]!.detail
}
