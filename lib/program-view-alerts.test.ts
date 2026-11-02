import { beforeEach, describe, expect, it, vi } from "vitest"

const sent: Array<{ tokens: string[]; body: string; data: Record<string, unknown> }> = []
const paid = new Set<string>()

vi.mock("@/lib/push-send", () => ({
  sendToTokens: vi.fn(async (_kind: string, tokens: string[], msg: { body: string; data: Record<string, unknown> }) => {
    sent.push({ tokens, body: msg.body, data: msg.data })
    return { sent: tokens.length }
  }),
}))
vi.mock("@/lib/coach-messages", () => ({ isApprovedCoach: () => true }))
vi.mock("@/lib/internal-accounts", () => ({ isInternalAccount: () => false }))
vi.mock("@/lib/college-domain-schools", () => ({ collegeForCoach: () => "Campbell University" }))
vi.mock("@/lib/ranking-access", () => ({
  resolveRankingViewerForUser: async ({ userId }: { userId: string }) => ({ userId, viewer: { hasSubscription: paid.has(userId) } }),
}))

import { alertFamilyOfProgramView, programViewBody } from "./program-view-alerts"

/** Just enough of the Supabase client for the queries the alert makes. */
function fakeAdmin(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const q = {
        select: () => q,
        eq: () => q,
        in: () => q,
        maybeSingle: async () => ({ data: (tables[table] ?? [])[0] ?? null, error: null }),
        insert: async () => ({ error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: tables[table] ?? [], error: null }),
      }
      return q
    },
  } as never
}

const base = {
  user_profiles: [{ role: "college_coach", verified_coach: true, verification_status: "approved", email: "c@campbell.edu" }],
  athletes: [{ id: "a1", name: "Liam Smith", claimed_by_user_id: "parent-free", graduationyear: 2028 }],
  parent_athlete_links: [{ user_id: "parent-paid" }],
  push_devices: [
    { user_id: "parent-free", expo_push_token: "tok-free" },
    { user_id: "parent-paid", expo_push_token: "tok-paid" },
  ],
}

describe("program-view alerts", () => {
  beforeEach(() => {
    sent.length = 0
    paid.clear()
  })

  it("names the program for a paid account and locks it for a free one", async () => {
    paid.add("parent-paid")
    const r = await alertFamilyOfProgramView(fakeAdmin({ ...base, blue_memberships: [], blue_wiq_subscriptions: [] }), {
      athleteId: "a1",
      viewerUserId: "coach",
    })
    expect(r.sent).toBe(2)
    expect(sent.find((s) => s.tokens.includes("tok-paid"))?.body).toBe("Campbell University viewed Liam's profile.")
    const free = sent.find((s) => s.tokens.includes("tok-free"))!
    expect(free.body).toBe("A college program viewed Liam's profile. See which with Insider.")
    expect(JSON.stringify(free)).not.toContain("Campbell")
  })

  it("names the program for the whole family when the wrestler is Blue", async () => {
    await alertFamilyOfProgramView(
      fakeAdmin({ ...base, blue_memberships: [{ status: "active", stripe_subscription_id: "sub_1", source: "recruitnc_onboarding" }], blue_wiq_subscriptions: [] }),
      { athleteId: "a1", viewerUserId: "coach" },
    )
    expect(sent).toHaveLength(1)
    expect(sent[0].tokens.sort()).toEqual(["tok-free", "tok-paid"])
    expect(sent[0].body).toContain("Campbell University")
  })

  it("alerts nobody about a graduated wrestler", async () => {
    const r = await alertFamilyOfProgramView(
      fakeAdmin({ ...base, athletes: [{ ...base.athletes[0], graduationyear: 2020 }], blue_memberships: [], blue_wiq_subscriptions: [] }),
      { athleteId: "a1", viewerUserId: "coach" },
    )
    expect(r).toEqual({ sent: 0, skipped: "graduated" })
    expect(sent).toHaveLength(0)
  })

  it("keeps the free text free of any program", () => {
    expect(programViewBody(null, "Ava")).toBe("A college program viewed Ava's profile. See which with Insider.")
  })
})
