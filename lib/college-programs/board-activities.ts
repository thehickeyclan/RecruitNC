/**
 * The activities inside each stage of a college on the board (Matt, 22 Oct 2026: "stages, and a
 * set of activities aligned to each stage ... recommend activities"), and the one step that
 * matters next. Worked out from what the family has recorded; nothing here is a judgement of fit.
 */
import { deadlineLine, nextDeadline, type AdmissionsSummary } from "@/lib/college-programs/admissions-format"
import { BOARD_STAGES, boardStage, type Admissions, type BoardStage, type CollegeListStatus } from "@/lib/college-programs/list"

/** What came in from the college: verified, from our own records. */
export type Inbound = {
  /** Program views of the profile, and the latest. */
  views?: { count: number; last: string } | null
  /** A coach conversation; yourTurn when the coach wrote last. */
  message?: { threadId: string; yourTurn: boolean } | null
  /** The latest contact the family logged from the coach (call, text, camp invite...). */
  contact?: { label: string; date: string } | null
}

export type ActivityCollege = {
  status: CollegeListStatus
  /** When it entered its stage (or, before that is stored, its last change). */
  stageSince?: string | null
  inbound?: Inbound
  hasQuestionnaire?: boolean
  questionnaireDone?: boolean
  /** Told this program's coaches the wrestler is interested; null when it cannot be offered. */
  interest?: boolean | null
  admissions?: Admissions
  admissionInfo?: AdmissionsSummary | null
}

export type ActivityAction =
  | { kind: "reply"; threadId: string }
  | { kind: "forms" }
  | { kind: "email" }
  | { kind: "interest" }
  | { kind: "apply"; href: string }
  | { kind: "stage"; to: BoardStage }
  | { kind: "scout" }

export type Activity = { key: string; label: string; done: boolean; detail?: string | null; tone?: "soon" | "urgent" | null; action: ActivityAction | null }

const reached = (status: CollegeListStatus, stage: BoardStage) => BOARD_STAGES.indexOf(boardStage(status)) >= BOARD_STAGES.indexOf(stage)
const APPLIED = new Set(["submitted", "admitted", "deferred", "waitlisted", "denied", "withdrawn"])

export function activitiesFor(c: ActivityCollege, today: string): Activity[] {
  const out: Activity[] = []
  if (c.hasQuestionnaire || c.questionnaireDone) {
    out.push({ key: "form", label: "Interest form", done: Boolean(c.questionnaireDone), action: c.questionnaireDone ? null : { kind: "forms" } })
  }
  out.push({ key: "email", label: "Email the coach", done: reached(c.status, "contacted"), action: reached(c.status, "contacted") ? null : { kind: "email" } })
  if (c.interest != null) out.push({ key: "interest", label: "Tell the coaches you're interested", done: Boolean(c.interest), action: { kind: "interest" } })
  out.push({ key: "reply", label: "Coach writes back", done: reached(c.status, "talking"), action: reached(c.status, "talking") ? null : { kind: "stage", to: "talking" } })
  out.push({ key: "visit", label: "Visit campus", done: reached(c.status, "visited"), action: reached(c.status, "visited") ? null : { kind: "stage", to: "visited" } })
  const applied = Boolean(c.admissions?.status && APPLIED.has(c.admissions.status))
  const next = applied ? null : nextDeadline(c.admissionInfo, c.admissions?.plan ?? null, today)
  out.push({
    key: "apply",
    label: "Apply",
    done: applied,
    detail: next ? deadlineLine(next) : null,
    tone: next ? (next.days <= 7 ? "urgent" : next.days <= 21 ? "soon" : null) : null,
    action: !applied && c.admissionInfo?.applyUrl ? { kind: "apply", href: c.admissionInfo.applyUrl } : null,
  })
  return out
}

/** Days in a stage before a college reads as stale - a deal going cold. No clock on an offer. */
export const STALE_AFTER: Record<BoardStage, number | null> = { interested: 21, contacted: 14, talking: 21, visited: 30, offer: null }

export function daysInStage(c: ActivityCollege, today: string): number | null {
  if (!c.stageSince) return null
  const d = Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(c.stageSince)) / 864e5)
  return Number.isFinite(d) ? Math.max(0, d) : null
}

export function isStale(c: ActivityCollege, today: string): boolean {
  const limit = STALE_AFTER[boardStage(c.status)]
  const d = daysInStage(c, today)
  return limit != null && d != null && d >= limit
}

/** A view of the profile within the last two weeks: a lead worth answering. */
export function recentView(c: ActivityCollege, today: string): boolean {
  const v = c.inbound?.views
  return Boolean(v && Date.parse(`${today}T12:00:00Z`) - Date.parse(v.last) <= 14 * 864e5)
}

export type NextStep = { label: string; action: ActivityAction; tone?: Activity["tone"]; why?: string; rank: number }

/**
 * The single next step for the card's button. Ranked for "Today's moves" across the board:
 * a deadline close at hand (0), a coach waiting on a reply (1), a fresh profile view not yet
 * answered (2), a stale stage (3), then the stage's own next activity (4).
 */
export function nextStep(c: ActivityCollege, today: string): NextStep | null {
  const stage = boardStage(c.status)
  const apply0 = activitiesFor(c, today).find((a) => a.key === "apply")!
  if (c.admissions?.status === "planning" && apply0.action && apply0.tone === "urgent")
    return { label: `Apply · ${apply0.detail?.replace(/ closes /, " ") ?? ""}`.trim(), action: apply0.action, tone: "urgent", why: "Deadline this week", rank: 0 }
  if (c.inbound?.message?.yourTurn) return { label: "Reply to the coach", action: { kind: "reply", threadId: c.inbound.message.threadId }, tone: "soon", why: "The coach wrote last", rank: 1 }
  if (recentView(c, today) && (stage === "interested" || stage === "contacted"))
    return { label: stage === "interested" ? "Email the coach" : "Follow up with the coach", action: { kind: "email" }, why: "Viewed the profile in the last 2 weeks", rank: 2 }
  if (isStale(c, today) && stage !== "interested")
    return { label: stage === "contacted" ? "Follow up: no reply yet" : "Check in with the coach", action: { kind: "email" }, tone: "soon", why: `${daysInStage(c, today)} days in ${stage === "contacted" ? "Reached out" : stage === "talking" ? "Talking" : "Visited"}`, rank: 3 }
  const base = baseStep(c, today)
  return base ? { ...base, rank: 4 } : null
}

function baseStep(c: ActivityCollege, today: string): Omit<NextStep, "rank"> | null {
  const acts = activitiesFor(c, today)
  const find = (k: string) => acts.find((a) => a.key === k)
  const form = find("form")
  const apply = find("apply")!
  // A deadline within three weeks the family is planning for comes first, whatever the stage.
  if (c.admissions?.status === "planning" && apply.action && apply.tone) return { label: apply.detail ? `Apply · ${apply.detail.replace(/ closes /, " ")}` : "Apply", action: apply.action, tone: apply.tone }
  if (form && !form.done) return { label: "Fill the interest form", action: { kind: "forms" } }
  const stage = boardStage(c.status)
  if (stage === "interested") {
    const interest = find("interest")
    if (interest && !interest.done) return { label: "Tell the coaches you're interested", action: { kind: "interest" } }
    return { label: "Email the coach", action: { kind: "email" } }
  }
  if (stage === "contacted") return { label: "Follow up with the coach", action: { kind: "email" } }
  if ((stage === "talking" || stage === "visited") && apply.action && !apply.done) return { label: apply.detail ? `Apply · ${apply.detail.replace(/ closes /, " ")}` : "Apply", action: apply.action, tone: apply.tone }
  if (stage === "talking") return { label: "Plan a visit", action: { kind: "stage", to: "visited" } }
  if (stage === "offer") return { label: "Talk it through with Scout", action: { kind: "scout" } }
  return null
}
