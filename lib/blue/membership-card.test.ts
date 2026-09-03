import { describe, expect, it } from "vitest"
import { buildMembershipCard, DROP_IN_WINDOW_DAYS, type MembershipRow } from "./membership-card"

const NOW = new Date("2026-10-04T12:00:00Z")
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

const stripe = (over: Partial<MembershipRow> = {}): MembershipRow => ({
  source: "stripe",
  status: "active",
  startedAt: "2026-02-01T00:00:00Z",
  nextBillingAt: "2026-11-01T00:00:00Z",
  lastSyncedAt: daysAgo(0),
  ...over,
})
const wiq = (over: Partial<MembershipRow> = {}): MembershipRow => ({
  source: "wiq",
  status: "active",
  startedAt: "2025-09-01T00:00:00Z",
  nextBillingAt: "2026-10-20T00:00:00Z",
  activeUntil: null,
  lastSyncedAt: daysAgo(1),
  ...over,
})

describe("membership status", () => {
  it("reads the same whichever system bills them", () => {
    for (const row of [stripe(), wiq()]) {
      expect(buildMembershipCard({ memberships: [row], checkIns: [], now: NOW }).status).toBe("active")
    }
  })

  it("honours what a cancelled WIQ member already paid for", () => {
    const card = buildMembershipCard({
      memberships: [wiq({ status: "cancelled", activeUntil: daysAgo(-10) })],
      checkIns: [],
      now: NOW,
    })
    expect(card.status).toBe("active")
  })

  it("stops at the end of the paid period", () => {
    const card = buildMembershipCard({
      memberships: [wiq({ status: "cancelled", activeUntil: daysAgo(1) })],
      checkIns: [],
      now: NOW,
    })
    expect(card.status).toBe("inactive")
  })

  it("takes the earliest join date across both systems", () => {
    const card = buildMembershipCard({ memberships: [stripe(), wiq()], checkIns: [], now: NOW })
    expect(card.memberSince).toBe("2025-09-01T00:00:00.000Z")
  })
})

describe("the drop-in window", () => {
  it("lets an active member claim one when they have never used it", () => {
    const card = buildMembershipCard({ memberships: [stripe()], checkIns: [], now: NOW })
    expect(card.dropInEligible).toBe(true)
    expect(card.dropInAvailableFrom).toBeNull()
  })

  it("closes the window for thirty days and says when it reopens", () => {
    const card = buildMembershipCard({
      memberships: [stripe()],
      checkIns: [{ checkedInAt: daysAgo(3), clubName: "Darkhorse" }],
      now: NOW,
    })
    expect(card.dropInEligible).toBe(false)
    expect(card.dropInAvailableFrom).toBe("2026-10-31T12:00:00.000Z")
  })

  it("reopens on the thirtieth day, not the thirty-first", () => {
    const card = buildMembershipCard({
      memberships: [stripe()],
      checkIns: [{ checkedInAt: daysAgo(DROP_IN_WINDOW_DAYS), clubName: "Darkhorse" }],
      now: NOW,
    })
    expect(card.dropInEligible).toBe(true)
  })

  it("uses the most recent visit, not the first one found", () => {
    const card = buildMembershipCard({
      memberships: [stripe()],
      checkIns: [
        { checkedInAt: daysAgo(45), clubName: "Darkhorse" },
        { checkedInAt: daysAgo(2), clubName: "Darkhorse" },
      ],
      now: NOW,
    })
    expect(card.dropInEligible).toBe(false)
    expect(card.lastDropIn?.checkedInAt).toBe(daysAgo(2))
  })

  it("gives no drop-in to a paused membership — that is what pausing means", () => {
    const card = buildMembershipCard({ memberships: [stripe({ status: "paused" })], checkIns: [], now: NOW })
    expect(card.status).toBe("paused")
    expect(card.dropInEligible).toBe(false)
  })

  it("gives no drop-in to a lapsed membership", () => {
    const card = buildMembershipCard({ memberships: [stripe({ status: "cancelled" })], checkIns: [], now: NOW })
    expect(card.dropInEligible).toBe(false)
  })
})

describe("vouching for stale data", () => {
  it("warns when the only live membership is a WIQ row nobody has refreshed", () => {
    const card = buildMembershipCard({
      memberships: [wiq({ lastSyncedAt: daysAgo(48) })],
      checkIns: [],
      now: NOW,
    })
    expect(card.staleWarning).toContain("check with NC United")
  })

  it("stays quiet when a fresh Stripe membership backs the card", () => {
    const card = buildMembershipCard({
      memberships: [wiq({ lastSyncedAt: daysAgo(48) }), stripe()],
      checkIns: [],
      now: NOW,
    })
    expect(card.staleWarning).toBeNull()
  })

  it("stays quiet for a recently imported WIQ row", () => {
    const card = buildMembershipCard({ memberships: [wiq({ lastSyncedAt: daysAgo(3) })], checkIns: [], now: NOW })
    expect(card.staleWarning).toBeNull()
  })
})
