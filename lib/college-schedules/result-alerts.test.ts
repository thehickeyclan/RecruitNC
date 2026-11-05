import { beforeEach, describe, expect, it, vi } from "vitest"

const sent: Array<{ tokens: string[]; title: string; body: string; data: Record<string, unknown> }> = []

vi.mock("@/lib/push-send", () => ({
  sendToTokens: vi.fn(async (_kind: string, tokens: string[], msg: { title: string; body: string; data: Record<string, unknown> }) => {
    sent.push({ tokens, ...msg })
    return { sent: tokens.length, failed: 0, pruned: 0, undelivered: 0 }
  }),
}))

import { alertDualResults, dualResultBody } from "./result-alerts"
import { toScheduleRow } from "./import"

/** Just enough of the Supabase client for the queries the alert makes. */
function fakeAdmin({
  finals,
  claimed = new Set<string>(),
  claimError,
  scheduleError,
}: {
  finals: unknown[]
  claimed?: Set<string>
  claimError?: { code: string; message: string }
  scheduleError?: { message: string }
}) {
  const filters: Array<[string, string, unknown]> = []
  const admin = {
    filters,
    from(table: string) {
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => (filters.push(["eq", c, v]), q),
        not: () => q,
        gte: (c: string, v: unknown) => (filters.push(["gte", c, v]), q),
        lte: (c: string, v: unknown) => (filters.push(["lte", c, v]), q),
        insert: async (row: { college_id: string; event_date: string; opponent: string }) => {
          if (claimError) return { error: claimError }
          const key = `${row.college_id}|${row.event_date}|${row.opponent}`
          if (claimed.has(key)) return { error: { code: "23505", message: "duplicate key" } }
          claimed.add(key)
          return { error: null }
        },
        then: (resolve: (v: unknown) => void) => {
          if (table === "college_schedules") return resolve(scheduleError ? { data: null, error: scheduleError } : { data: finals, error: null })
          if (table === "college_follows") return resolve({ data: [{ push_devices: { expo_push_token: "tok-1", alert_college: true } }], error: null })
          return resolve({ data: [], error: null })
        },
      }
      return q
    },
  }
  return admin as typeof admin & never
}

const duke = {
  college_id: "duke",
  event_date: "2026-11-14",
  opponent: "Princeton",
  outcome: "W",
  team_score: "24",
  opponent_score: "12",
  college: { name: "Duke" },
}

describe("dual result alerts", () => {
  beforeEach(() => {
    sent.length = 0
  })

  it("reads as a final score", () => {
    expect(dualResultBody("Duke", duke as never)).toBe("Final: Duke 24, Princeton 12")
    expect(dualResultBody("Duke", { ...duke, outcome: "L", team_score: 9, opponent_score: 27 } as never)).toBe(
      "Final: Duke 9, Princeton 27",
    )
  })

  it("names the winner when a school posts no score", () => {
    expect(dualResultBody("Duke", { ...duke, team_score: null, opponent_score: null } as never)).toBe("Final: Duke beat Princeton")
    expect(dualResultBody("Duke", { ...duke, outcome: "L", team_score: null, opponent_score: null } as never)).toBe(
      "Final: Princeton beat Duke",
    )
  })

  it("tells followers once, however many imports see the score", async () => {
    const claimed = new Set<string>()
    const now = new Date("2026-11-15T03:00:00Z")
    await alertDualResults(fakeAdmin({ finals: [duke], claimed }), now)
    await alertDualResults(fakeAdmin({ finals: [duke], claimed }), now)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ title: "Duke", body: "Final: Duke 24, Princeton 12", tokens: ["tok-1"] })
    expect(sent[0].data.path).toBe("/calendar")
  })

  it("only looks at the last two days, in North Carolina's calendar", async () => {
    // 03:00 UTC on the 15th is still the evening of the 14th in Raleigh.
    const admin = fakeAdmin({ finals: [] })
    await alertDualResults(admin, new Date("2026-11-15T03:00:00Z"))
    expect(admin.filters).toContainEqual(["lte", "event_date", "2026-11-14"])
    expect(admin.filters).toContainEqual(["gte", "event_date", "2026-11-12"])
    expect(admin.filters).toContainEqual(["eq", "event_type", "dual"])
  })

  it("sends nothing when no record of the send can be kept", async () => {
    const r = await alertDualResults(fakeAdmin({ finals: [duke], claimError: { code: "42P01", message: "relation does not exist" } }))
    expect(sent).toHaveLength(0)
    expect(r.skipped).toContain("does not exist")
  })

  it("stays quiet before the result columns exist", async () => {
    const r = await alertDualResults(fakeAdmin({ finals: [], scheduleError: { message: "column college_schedules.outcome does not exist" } }))
    expect(sent).toHaveLength(0)
    expect(r.skipped).toBeTruthy()
  })
})

describe("schedule rows carry dual results", () => {
  const base = {
    date: "2026-11-14",
    startTime: "19:00",
    homeAway: "away" as const,
    location: "Princeton, NJ",
    tv: null,
    streamUrl: null,
    eventName: null,
    status: "scheduled" as const,
  }

  it("keeps the outcome and both scores on a dual", () => {
    const row = toScheduleRow({ ...base, opponent: "Princeton", outcome: "W", teamScore: 24, opponentScore: 12 }, "duke", "2026-27")
    expect(row).toMatchObject({ event_type: "dual", outcome: "W", team_score: 24, opponent_score: 12 })
  })

  it("stores no result on a tournament", () => {
    const row = toScheduleRow(
      { ...base, opponent: null, eventName: "Wolfpack Open", outcome: "W", teamScore: 30, opponentScore: null },
      "ncsu",
      "2026-27",
    )
    expect(row).toMatchObject({ event_type: "tournament", outcome: null, team_score: null, opponent_score: null })
  })

  it("stores nothing for a meet still ahead", () => {
    const row = toScheduleRow({ ...base, opponent: "Princeton", outcome: null, teamScore: null, opponentScore: null }, "duke", "2026-27")
    expect(row).toMatchObject({ outcome: null, team_score: null })
  })
})

describe("importing before the result columns exist", () => {
  it("recognises PostgREST's missing-column error, and nothing else", async () => {
    const { isMissingResultColumn } = await import("./import")
    expect(isMissingResultColumn("Could not find the 'outcome' column of 'college_schedules' in the schema cache")).toBe(true)
    expect(isMissingResultColumn('column "team_score" of relation "college_schedules" does not exist')).toBe(true)
    expect(isMissingResultColumn("duplicate key value violates unique constraint")).toBe(false)
  })
})
