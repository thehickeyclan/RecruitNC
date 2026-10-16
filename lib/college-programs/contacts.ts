/**
 * "A college reached out": what a family logs when a coach calls, texts, visits or offers.
 *
 * Contact happens off the platform, so the family is the only one who knows (Matt, 16 Oct 2026).
 * Three steps after the verified "viewed": reached out, visit, offer - the family's version of the
 * coach's funnel on My Recruits.
 */
import { COLLEGE_LIST_STATUSES, type CollegeListStatus } from "@/lib/college-programs/list"

export const CONTACT_KINDS = ["call", "text", "email", "social", "letter", "camp", "visit", "offer"] as const
export type ContactKind = (typeof CONTACT_KINDS)[number]

export const CONTACT_LABEL: Record<ContactKind, string> = {
  call: "Phone call",
  text: "Text",
  email: "Email",
  social: "Social DM",
  letter: "Letter",
  camp: "Camp invite",
  visit: "Visit",
  offer: "Offer",
}

/** The step a contact counts toward in the family's funnel. */
export type ContactStage = "reached" | "visit" | "offer"
export const stageOf = (kind: ContactKind): ContactStage => (kind === "offer" ? "offer" : kind === "visit" ? "visit" : "reached")

/** Where a contact moves the school on My College List: only ever forward. */
export function listStatusAfter(current: CollegeListStatus | null, kind: ContactKind): CollegeListStatus {
  const target: CollegeListStatus = kind === "offer" ? "offer" : kind === "visit" ? "visited" : "talking"
  if (!current) return target
  return COLLEGE_LIST_STATUSES.indexOf(target) > COLLEGE_LIST_STATUSES.indexOf(current) ? target : current
}

export function isContactKind(value: unknown): value is ContactKind {
  return typeof value === "string" && (CONTACT_KINDS as readonly string[]).includes(value)
}

export type CollegeContact = {
  id: string
  athleteId: string
  schoolId: string
  kind: ContactKind
  happenedOn: string
  note: string | null
}

/** Per school, the furthest step reached and the latest contact. */
export function summarizeContacts(contacts: CollegeContact[]) {
  const bySchool = new Map<string, { stage: ContactStage; latest: CollegeContact; count: number }>()
  const rank = { reached: 0, visit: 1, offer: 2 } as const
  for (const c of contacts) {
    const cur = bySchool.get(c.schoolId)
    const stage = stageOf(c.kind)
    if (!cur) bySchool.set(c.schoolId, { stage, latest: c, count: 1 })
    else {
      cur.count += 1
      if (rank[stage] > rank[cur.stage]) cur.stage = stage
      if (c.happenedOn > cur.latest.happenedOn) cur.latest = c
    }
  }
  const schools = [...bySchool.values()]
  return {
    bySchool,
    reached: schools.length,
    visits: schools.filter((s) => s.stage !== "reached").length,
    offers: schools.filter((s) => s.stage === "offer").length,
  }
}
