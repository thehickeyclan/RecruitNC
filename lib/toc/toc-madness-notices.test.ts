import { describe, expect, it } from "vitest"
import {
  buildTocMadnessOpenPush,
  buildTocMadnessReminderPush,
  formatPoolDeadline,
  incompleteEntrants,
  tocMadnessSendWindow,
} from "./toc-madness-notices"

const deadline = new Date("2026-09-15T23:59:59-04:00")

describe("TOC Madness notices", () => {
  it("states the deadline in Eastern time", () => {
    expect(formatPoolDeadline(deadline)).toBe("Tuesday at 11:59 PM")
  })

  it("links both pushes to the bracket screen", () => {
    expect(buildTocMadnessOpenPush(deadline).data).toEqual({ kind: "toc-madness", path: "/toc-bracket" })
    expect(buildTocMadnessReminderPush(deadline).data?.path).toBe("/toc-bracket")
    expect(buildTocMadnessOpenPush(deadline).body).toContain("Tuesday at 11:59 PM")
  })
})

describe("incompleteEntrants", () => {
  const locked = [117, 125, 133]
  it("finds people who started and did not finish", () => {
    const rows = [
      { user_id: "done", weight_class: 117, submitted: true },
      { user_id: "done", weight_class: 125, submitted: true },
      { user_id: "done", weight_class: 133, submitted: true },
      { user_id: "half", weight_class: 117, submitted: true },
      { user_id: "draft", weight_class: 125, submitted: false },
    ]
    expect(incompleteEntrants(rows, locked).sort()).toEqual(["draft", "half"])
  })

  it("does not count a submitted entry for a weight without a locked draw", () => {
    const rows = [
      { user_id: "u", weight_class: 117, submitted: true },
      { user_id: "u", weight_class: 125, submitted: true },
      { user_id: "u", weight_class: 999, submitted: true },
    ]
    expect(incompleteEntrants(rows, locked)).toEqual(["u"])
  })

  it("never reminds someone who never started", () => {
    expect(incompleteEntrants([], locked)).toEqual([])
  })
})

describe("tocMadnessSendWindow", () => {
  const before = new Date("2026-09-12T10:00:00-04:00")
  it("refuses before the brackets are released", () => {
    expect(tocMadnessSendWindow({ bracketsReleased: false, now: before, deadline, lastSentAt: null, minGapMs: 0 }).ok).toBe(false)
  })
  it("refuses after the deadline", () => {
    const late = new Date(deadline.getTime() + 1)
    expect(tocMadnessSendWindow({ bracketsReleased: true, now: late, deadline, lastSentAt: null, minGapMs: 0 }).ok).toBe(false)
  })
  it("refuses a repeat inside the gap and allows one after it", () => {
    const sent = new Date(before.getTime() - 30 * 60_000).toISOString()
    expect(tocMadnessSendWindow({ bracketsReleased: true, now: before, deadline, lastSentAt: sent, minGapMs: 60 * 60_000 }).ok).toBe(false)
    expect(tocMadnessSendWindow({ bracketsReleased: true, now: before, deadline, lastSentAt: sent, minGapMs: 15 * 60_000 }).ok).toBe(true)
  })
})
