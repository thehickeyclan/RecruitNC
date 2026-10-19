/**
 * People staff have removed as college coaches. A sign-up that matches one is never let in by the
 * access-first rule: the account is made, coach access stays off, and staff get a text. A person
 * can still approve them by hand on the users dashboard.
 *
 * Matched on any one of email, the email's name part, cell or name, because a removed coach who
 * comes back usually changes only one of them. Keep the reason out of this file.
 */
type BlockedCoach = {
  /** Lowercase first names that count as this person (nicknames included). */
  firstNames: string[]
  lastName: string
  emails: string[]
  /** Ten-digit cells. */
  phones: string[]
  removedOn: string
}

const BLOCKED: BlockedCoach[] = [
  {
    firstNames: ["jim", "james", "jimmy", "jamie"],
    lastName: "giannotti",
    emails: ["jim.giannotti@greensboro.edu"],
    phones: ["3365168036"],
    removedOn: "2026-10-19",
  },
]

const digits = (v: string | null | undefined) => String(v ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")
const word = (v: string | null | undefined) => String(v ?? "").trim().toLowerCase().replace(/[^a-z]/g, "")

/** Why this sign-up matches a removed coach ("email", "cell", "name"), or null. */
export function blockedCoachMatch(input: {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
}): string | null {
  const email = String(input.email ?? "").trim().toLowerCase()
  const local = email.split("@")[0] ?? ""
  const phone = digits(input.phone)
  const first = word(input.firstName)
  const last = word(input.lastName)
  for (const b of BLOCKED) {
    if (email && b.emails.includes(email)) return "email"
    if (local && b.emails.some((e) => e.split("@")[0] === local)) return "email name"
    if (phone.length === 10 && b.phones.includes(phone)) return "cell"
    if (last === b.lastName && b.firstNames.includes(first)) return "name"
  }
  return null
}
