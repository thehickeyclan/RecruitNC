import { describe, expect, it } from "vitest"

import { activitiesFor, agoText, daysInStage, isStale, lastActivity, nextStep } from "./board-activities"

const today = "2026-10-22"
const info = {
  deadlines: [{ plan: "ea" as const, date: "2026-11-01", label: null, raw: null }],
  notOffered: [],
  rolling: false,
  applyUrl: "https://apply.example.edu",
  testPolicy: null,
  fee: null,
  feeWaiver: null,
  aidForm: null,
}
const none = { status: null, plan: null, submittedOn: null, preread: null }

describe("nextStep", () => {
  it("starts with the interest form", () => {
    expect(nextStep({ status: "interested", hasQuestionnaire: true }, today)?.label).toBe("Fill the interest form")
  })
  it("then the email, then the follow-up", () => {
    expect(nextStep({ status: "interested", hasQuestionnaire: true, questionnaireDone: true }, today)?.action.kind).toBe("email")
    expect(nextStep({ status: "contacted", questionnaireDone: true }, today)?.label).toBe("Follow up with the coach")
  })
  it("treats an old questionnaire-stage row as Interested with the form done", () => {
    expect(nextStep({ status: "questionnaire", hasQuestionnaire: true, questionnaireDone: true }, today)?.label).toBe("Email the coach")
  })
  it("puts a close deadline first when the family is applying", () => {
    const s = nextStep({ status: "interested", hasQuestionnaire: true, admissions: { ...none, status: "planning" }, admissionInfo: info }, today)
    expect(s?.label).toBe("Apply · Early Action Nov 1 · 10 days")
    expect(s?.tone).toBe("soon")
  })
  it("sends a talking college to the application", () => {
    expect(nextStep({ status: "talking", admissionInfo: info, admissions: none }, today)?.action.kind).toBe("apply")
  })
})

describe("activitiesFor", () => {
  it("marks what the stage implies as done", () => {
    const acts = activitiesFor({ status: "visited", questionnaireDone: true, admissions: none }, today)
    expect(acts.find((a) => a.key === "form")).toBeTruthy()
    expect(acts.filter((a) => a.done).map((a) => a.key)).toEqual(["form", "email", "reply", "visit"])
  })
})

describe("pipeline signals", () => {
  it("a coach waiting on a reply comes before everything but a deadline this week", () => {
    const s = nextStep({ status: "interested", hasQuestionnaire: true, inbound: { message: { threadId: "t1", yourTurn: true } } }, today)
    expect(s?.action).toEqual({ kind: "reply", threadId: "t1" })
    expect(s?.rank).toBe(1)
  })
  it("a fresh profile view turns into an email", () => {
    const s = nextStep({ status: "interested", questionnaireDone: true, inbound: { views: { count: 2, last: "2026-10-19T15:00:00Z" } } }, today)
    expect(s?.label).toBe("Email the coach")
    expect(s?.rank).toBe(2)
  })
  it("an old view is not a lead", () => {
    expect(nextStep({ status: "interested", questionnaireDone: true, inbound: { views: { count: 2, last: "2026-08-01T15:00:00Z" } } }, today)?.rank).toBe(4)
  })
  it("flags a stale stage and counts the days", () => {
    const c = { status: "contacted" as const, questionnaireDone: true, stageSince: "2026-10-01T12:00:00Z" }
    expect(isStale(c, today)).toBe(true)
    expect(daysInStage(c, today)).toBe(21)
    expect(nextStep(c, today)?.label).toBe("Follow up: no reply yet")
  })
  it("never calls an offer stale", () => {
    expect(isStale({ status: "offer", stageSince: "2026-01-01T12:00:00Z" }, today)).toBe(false)
  })
})

describe("lastActivity", () => {
  it("is the newest event from either side", () => {
    const last = lastActivity({ status: "contacted", stageSince: "2026-10-10T12:00:00Z", inbound: { views: { count: 2, last: "2026-10-20T15:00:00Z" }, contact: { label: "Phone call", date: "Oct 18", on: "2026-10-18" } } })
    expect(last).toMatchObject({ text: "Coaches viewed the profile", inbound: true })
    expect(agoText(last!.at, "2026-10-22")).toBe("2 days ago")
  })
  it("falls back to the family's own move", () => {
    expect(lastActivity({ status: "contacted", stageSince: "2026-09-01T12:00:00Z" })?.text).toBe("Moved to Reached out")
    expect(agoText("2026-09-01T12:00:00Z", "2026-10-22")).toBe("7 weeks ago")
  })
  it("is null when nothing is dated", () => {
    expect(lastActivity({ status: "interested" })).toBeNull()
  })
})

describe("interest form without a link", () => {
  it("is still an activity the family can tick", () => {
    expect(activitiesFor({ status: "contacted", hasQuestionnaire: false }, today).find((a) => a.key === "form")?.done).toBe(false)
  })
})
