/**
 * My College List: the schools a family has saved from the map, and where they stand with each.
 *
 * The steps are the order recruiting actually goes in, and each one is something the family did
 * or that happened to them - never a judgement about fit.
 */

export const COLLEGE_LIST_STATUSES = ["interested", "questionnaire", "contacted", "talking", "visited", "offer"] as const
export type CollegeListStatus = (typeof COLLEGE_LIST_STATUSES)[number]

export const COLLEGE_LIST_STATUS_LABEL: Record<CollegeListStatus, string> = {
  interested: "Interested",
  questionnaire: "Questionnaire sent",
  contacted: "Emailed the coach",
  talking: "Coach replied",
  visited: "Visited",
  offer: "Offer",
}

export type CollegeListItem = { schoolId: string; status: CollegeListStatus; note: string | null; updatedAt: string }

export type CollegeListResponse = {
  /** False when the list cannot be used: signed out, not Blue, or the table is not there yet. */
  available: boolean
  items: CollegeListItem[]
}

export function isCollegeListStatus(value: unknown): value is CollegeListStatus {
  return typeof value === "string" && (COLLEGE_LIST_STATUSES as readonly string[]).includes(value)
}
