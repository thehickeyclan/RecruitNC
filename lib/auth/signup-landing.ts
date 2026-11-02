/**
 * Where a newly verified account goes when the link itself names nowhere.
 *
 * The Supabase confirmation email ignores the redirect the sign-up asked for and always arrives
 * with next=/dashboard, so every family who tapped "sign up" on a profile was dropped on the
 * rankings sales page instead of back on the wrestler they meant to claim (Rahiem Skyers, 30 Oct
 * 2026: signed up from his own profile, verified, never claimed it). The sign-up stores where it
 * began in the account (`signup_return_to`); this reads it back. A family with nowhere to go back
 * to and no wrestler yet lands on "Let's find you", already searching the name they signed up with.
 */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null
  const v = value.trim()
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/auth/")) return null
  return v === "/" ? null : v
}

export function signupLanding(input: {
  returnTo: unknown
  role: string
  hasWrestler: boolean
  firstName?: string | null
  lastName?: string | null
}): string | null {
  const back = safeReturnPath(input.returnTo)
  if (back) return back
  const role = input.role.trim().toLowerCase()
  if ((role !== "athlete" && role !== "parent") || input.hasWrestler) return null
  // A wrestler searches his or her own name; a parent's own name is not the child's.
  const name = role === "athlete" ? [input.firstName, input.lastName].map((x) => (x ?? "").trim()).filter(Boolean).join(" ") : ""
  return name ? `/create-profile?find=${encodeURIComponent(name)}` : "/create-profile"
}
