import { describe, expect, it } from "vitest"

import { buildTimeline, groupViews, nextStepFrom, type TimelineInput } from "@/lib/recruiting/recruit-file-timeline"

const empty: TimelineInput = { views: [], messages: [], interest: null, logged: [], results: [], upcoming: [], added: [] }
const now = new Date("2026-11-02T15:00:00Z")

describe("recruiting file timeline", () => {
  it("is one list, newest first, with an upcoming event on top", () => {
    const t = buildTimeline(
      {
        ...empty,
        upcoming: [{ startDate: "2026-11-15", endDate: "2026-11-16", title: "Super 32", location: "Greensboro, NC" }],
        results: [{ at: "2026-10-12", event: "Fall Brawl", place: 1, record: "4-0", weight: "157", addedAt: "2026-11-01T10:00:00Z" }],
        messages: [{ at: "2026-10-20T12:00:00Z", fromCoach: false, by: "Staff", preview: "Thanks coach", threadId: "t1" }],
        added: [{ at: "2026-09-01T12:00:00Z", by: "You" }],
      },
      now,
    )
    expect(t.map((e) => e.kind)).toEqual(["upcoming", "message_in", "result", "added"])
    expect(t[0]!.detail).toBe("through 2026-11-16 · Greensboro, NC")
    expect(t[1]!.href).toBe("/inbox/t1")
    expect(t[1]!.by).toBeNull()
    expect(t[2]!.detail).toBe("1st · 4-0 · 157 lbs")
    expect(t[2]!.fresh).toBe(true)
  })

  it("marks a result fresh only when it was loaded in the last week", () => {
    const t = buildTimeline({ ...empty, results: [{ at: "2026-03-01", event: "State", place: 3, record: null, weight: null, addedAt: "2026-03-02T00:00:00Z" }] }, now)
    expect(t[0]!.fresh).toBe(false)
    expect(t[0]!.detail).toBe("3rd")
  })

  it("groups one coach's views of a day into one line", () => {
    const g = groupViews([
      { at: "2026-10-30T13:00:00Z", by: "You" },
      { at: "2026-10-30T18:00:00Z", by: "You" },
      { at: "2026-10-30T19:00:00Z", by: "Jacob Power" },
      { at: "2026-10-31T09:00:00Z", by: "You" },
    ])
    expect(g).toHaveLength(3)
    const mine = g.find((e) => e.by === "You" && e.at.startsWith("2026-10-30"))!
    expect(mine.title).toBe("Viewed profile ×2")
    expect(mine.at).toBe("2026-10-30T18:00:00Z")
  })

  it("names the family's interest in the program, and logged contact by type", () => {
    const t = buildTimeline(
      {
        ...empty,
        interest: { at: "2026-10-01T00:00:00Z", program: "Ohio State" },
        logged: [{ at: "2026-10-05T00:00:00Z", type: "watched_live", by: "You", note: " Looked strong on top ", followUp: null }],
      },
      now,
    )
    expect(t[0]).toMatchObject({ kind: "logged", title: "Watched live", detail: "Looked strong on top" })
    expect(t[1]).toMatchObject({ kind: "interest", title: "Family told Ohio State: interested" })
  })

  it("takes the next step from the newest contact that set a follow-up", () => {
    expect(nextStepFrom([])).toBeNull()
    expect(
      nextStepFrom([
        { at: "2026-10-20T00:00:00Z", type: "call", by: "You", note: "No follow-up on this one", followUp: null },
        { at: "2026-10-10T00:00:00Z", type: "call", by: "Jacob Power", note: "Ask about visit", followUp: "2026-11-10T00:00:00+00:00" },
        { at: "2026-10-01T00:00:00Z", type: "text", by: "You", note: null, followUp: "2026-10-15" },
      ]),
    ).toEqual({ date: "2026-11-10", note: "Ask about visit", by: "Jacob Power" })
  })
})
