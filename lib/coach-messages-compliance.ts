/**
 * Is a college coach allowed to message this wrestler yet? (Matt, 17 Oct 2026: "when a coach goes
 * to message a kid they should not because of compliance, do we pop a note up warning them?
 * Customised for division and male/female.")
 *
 * Only Division I sets a date before which a coach may not send recruiting messages to a high
 * school wrestler; Division II, Division III, the NAIA and the NJCAA allow it at any time (the
 * rules library, lib/recruiting/learn/content.ts). The Division I date depends on the wrestler:
 * boys of the Class of 2028 and later, April 1 of junior year; boys of 2027 and girls, June 15 at
 * the end of sophomore year. The date is worked out here, never typed.
 *
 * A soft caution, never a block (Matt, 17 Oct 2026: "do not block anyone"): the note shows, the
 * coach sends as they choose, and a send before the date is logged.
 */
import { D1_CONTACT, D1_TRACK_LABEL, d1TrackFor } from "@/lib/recruiting/learn/content"
import { resolveRuleDate } from "@/lib/recruiting/scout/dates"
import type { CollegeDivision } from "@/lib/college-programs/types"

export type MessagingCompliance =
  | { status: "open" }
  | { status: "not_yet" | "check"; title: string; detail: string; allowed: string; rule: string | null; href: string }

const ALLOWED =
  "Until then, the most a Division I coach may send is a reply that does not recruit, camp information, or a referral to admissions."

export function messagingRule(input: {
  /** The coach's level for this wrestler's team; null when we could not tell. */
  division: CollegeDivision | null
  /** Why the level is unknown, for the note ("Your college has no women's team on our list"). */
  divisionNote?: string | null
  gender: string | null
  classYear: number | null
  firstName: string
  now?: Date
}): MessagingCompliance {
  const { division, gender, classYear, firstName } = input
  const now = input.now ?? new Date()
  // Every level but Division I may message a high school wrestler at any time.
  if (division && division !== "NCAA Division I") return { status: "open" }

  const track = d1TrackFor(gender, classYear)
  const row = (D1_CONTACT[track].rows ?? [])[0]
  const rule = D1_CONTACT[track].rule ?? null
  const who = D1_TRACK_LABEL[track]
  if (!row) return { status: "open" }

  if (!classYear) {
    return {
      status: "check",
      title: `Check ${firstName}'s class before you write`,
      detail: `This profile has no graduation year. Division I coaches may send recruiting messages to ${who.toLowerCase()} from ${row.value.toLowerCase()}.`,
      allowed: ALLOWED,
      rule,
      href: "/recruiting/learn/division-1",
    }
  }
  const opens = resolveRuleDate(row.value, classYear, now)
  if (!opens || opens.open) return { status: "open" }
  const female = /^f/i.test(String(gender ?? ""))
  const kid = female ? "a girl" : "a boy"
  const pronoun = female ? "her" : "him"
  const possessive = female ? "her" : "his"
  return {
    status: division ? "not_yet" : "check",
    title: `Division I coaches may message ${firstName} from ${opens.label}`,
    detail: `${firstName} is ${kid} in the Class of ${classYear}. Division I coaches may send ${pronoun} recruiting messages, emails and calls from ${row.value.replace(/ (junior|sophomore|senior) year/, ` ${possessive} $1 year`)}: ${opens.label}.${division ? "" : " We could not confirm your college's division, so check before you write."}${input.divisionNote ? ` ${input.divisionNote}` : ""}`,
    allowed: ALLOWED,
    rule,
    href: "/recruiting/learn/division-1",
  }
}
