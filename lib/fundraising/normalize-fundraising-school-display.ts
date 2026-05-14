/**
 * Cosmetic fixes for known typos in `spartan_fundraising_athletes.school` (feeds `entry.label`).
 * Prefer correcting source data in Supabase; this keeps public UI from showing obvious garbage.
 */
export function normalizeFundraisingSchoolDisplay(raw: string | null | undefined): string {
  if (raw == null) return ""
  let s = raw.trim()
  if (!s) return s
  s = s.replace(/\bCardinal\s+fibbons\b/gi, "Cardinal Gibbons")
  return s
}
