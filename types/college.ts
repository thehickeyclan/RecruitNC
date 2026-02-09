/**
 * College entity — single source of truth for college name and division.
 * Athletes link via college_id (FK).
 */

export type College = {
  id: string
  name: string
  division: string
  logo_url?: string | null
  slug?: string | null
  created_at?: string
  updated_at?: string
}

/** Canonical division values for colleges (one value per college). */
export const COLLEGE_DIVISION_OPTIONS = [
  "NCAA Division I",
  "NCAA Division II",
  "NCAA Division III",
  "NAIA",
  "NJCAA",
  "NCAA Division I (FCS Football)",
  "Other",
] as const

export type CollegeDivision = (typeof COLLEGE_DIVISION_OPTIONS)[number]
