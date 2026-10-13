/**
 * Which program a college coach works with: men's, women's, or both (Matt, 13 October 2026).
 *
 * Nothing asked. A women's coach from Mount Olive signed up into the same coach home as a men's
 * coach - boys' rankings, boys in search, boys on every list - and had to dig for the wrestlers she
 * can actually recruit. The answer sets what a coach sees FIRST. It is a default, never a lock:
 * small colleges have one staff for both, and anyone can switch with one tap.
 *
 * Stored in Supabase Auth app_metadata (`coach_program`), like the scoped ranking access: a user
 * cannot set it on themselves from the browser, it rides in the session so the menu needs no extra
 * request, and it needed no change to user_profiles.
 */
export type CoachProgram = "mens" | "womens" | "both"
export type ViewGender = "Male" | "Female"

export const COACH_PROGRAM_KEY = "coach_program"
/** The one-tap switch: which list this browser is looking at now. */
export const VIEW_GENDER_COOKIE = "rnc_view_gender"

export const COACH_PROGRAM_OPTIONS: ReadonlyArray<{ value: CoachProgram; label: string; detail: string }> = [
  { value: "mens", label: "Men's", detail: "I recruit men's wrestlers" },
  { value: "womens", label: "Women's", detail: "I recruit women's wrestlers" },
  { value: "both", label: "Both", detail: "One staff for both programs" },
]

export function parseCoachProgram(value: unknown): CoachProgram | null {
  const v = String(value ?? "").trim().toLowerCase().replace(/[^a-z]/g, "")
  if (v === "mens" || v === "men" || v === "male") return "mens"
  if (v === "womens" || v === "women" || v === "female") return "womens"
  if (v === "both") return "both"
  return null
}

/** The program on a session or admin user object. Null when the coach has never been asked. */
export function coachProgramOf(user: { app_metadata?: Record<string, unknown> | null } | null | undefined): CoachProgram | null {
  return parseCoachProgram(user?.app_metadata?.[COACH_PROGRAM_KEY])
}

export function parseViewGender(value: unknown): ViewGender | null {
  const v = String(value ?? "").trim().toLowerCase()
  if (v === "female" || v === "women" || v === "womens" || v === "f") return "Female"
  if (v === "male" || v === "men" || v === "mens" || v === "m") return "Male"
  return null
}

/**
 * What to show: the browser's own switch if it has been used, else the coach's program, else men's.
 * Everyone who is not a women's coach starts on the men's lists, which is what the site showed
 * before there were two.
 */
export function viewGenderFor(program: CoachProgram | null, chosen?: unknown): ViewGender {
  return parseViewGender(chosen) ?? (program === "womens" ? "Female" : "Male")
}

/** "women's", "men's", "men's and women's" - for a sentence, e.g. the staff sign-up alert. */
export function programPhrase(program: CoachProgram | null): string | undefined {
  if (!program) return undefined
  return program === "both" ? "men's and women's" : program === "womens" ? "women's" : "men's"
}

export const genderLabel = (gender: ViewGender) => (gender === "Female" ? "Women's" : "Men's")
export const genderSlug = (gender: ViewGender) => (gender === "Female" ? "women" : "men")

/** athletes.gender is stored as "Male"/"Female" with stray casing; this is the one comparison. */
export function isFemale(gender: unknown): boolean {
  return String(gender ?? "").trim().toLowerCase() === "female"
}
