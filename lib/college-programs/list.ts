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
  // No longer a stage of its own (22 Oct 2026): the interest form is an activity, checked at any
  // stage. Old rows still carry it and are shown as Interested with the form done.
  questionnaire: "Interested",
  contacted: "Reached out",
  talking: "Talking",
  visited: "Visited",
  offer: "Offer",
}

/** The stages a family moves a college through, in order (Matt, 22 Oct 2026: stages, with activities inside each). */
export const BOARD_STAGES = ["interested", "contacted", "talking", "visited", "offer"] as const satisfies readonly CollegeListStatus[]
export type BoardStage = (typeof BOARD_STAGES)[number]

/** Where a college sits on the board: an old "questionnaire" row is an Interested one. */
export const boardStage = (status: CollegeListStatus): BoardStage => (status === "questionnaire" ? "interested" : status)

export type CollegeListItem = {
  schoolId: string
  status: CollegeListStatus
  note: string | null
  updatedAt: string
  /** When the family recorded the interest form (recruiting questionnaire) as done; any stage. */
  questionnaireDoneAt: string | null
  admissions: Admissions
}

/** The admissions track, beside the recruiting stage (22 Oct 2026). */
export const APP_PLANS = ["ed1", "ed2", "ea", "rea", "rd", "rolling"] as const
export type AppPlan = (typeof APP_PLANS)[number]
export const APP_PLAN_LABEL: Record<AppPlan, string> = { ed1: "Early Decision", ed2: "Early Decision II", ea: "Early Action", rea: "Restrictive Early Action", rd: "Regular Decision", rolling: "Rolling" }
export const APP_STATUSES = ["planning", "submitted", "admitted", "deferred", "waitlisted", "denied", "withdrawn"] as const
export type AppStatus = (typeof APP_STATUSES)[number]
export const APP_STATUS_LABEL: Record<AppStatus, string> = { planning: "Applying", submitted: "Submitted", admitted: "Admitted", deferred: "Deferred", waitlisted: "Waitlisted", denied: "Denied", withdrawn: "Withdrawn" }
export const PREREADS = ["requested", "likely", "possible", "unlikely"] as const
export type Preread = (typeof PREREADS)[number]
export const PREREAD_LABEL: Record<Preread, string> = { requested: "Pre-read requested", likely: "Pre-read: likely", possible: "Pre-read: possible", unlikely: "Pre-read: unlikely" }
export type Admissions = { plan: AppPlan | null; status: AppStatus | null; submittedOn: string | null; preread: Preread | null }
export const NO_ADMISSIONS: Admissions = { plan: null, status: null, submittedOn: null, preread: null }
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null)
export function admissionsOf(row: Record<string, unknown>): Admissions {
  return {
    plan: oneOf(APP_PLANS, row.app_plan),
    status: oneOf(APP_STATUSES, row.app_status),
    submittedOn: typeof row.app_submitted_on === "string" ? row.app_submitted_on : null,
    preread: oneOf(PREREADS, row.preread),
  }
}

/** Done, whatever the stage: the check, or the old "Questionnaire sent" stage it replaced. */
export const questionnaireDone = (item: { status: string; questionnaireDoneAt?: string | null }) => Boolean(item.questionnaireDoneAt) || item.status === "questionnaire"

export type CollegeListResponse = {
  /** False when the list cannot be used: signed out, not Blue, or the table is not there yet. */
  available: boolean
  items: CollegeListItem[]
}

export function isCollegeListStatus(value: unknown): value is CollegeListStatus {
  return typeof value === "string" && (COLLEGE_LIST_STATUSES as readonly string[]).includes(value)
}
