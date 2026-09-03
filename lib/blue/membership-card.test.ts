import { describe, expect, it } from "vitest"
import { buildMembershipCard, DROP_IN_WINDOW_DAYS, type MembershipRow } from "./membership-card"

const CLUBS = [
  { id: "darkhorse", name: "Darkhorse Wrestling Club" },
  { id: "sandcats", name: "Sandcats" },
]
const card = (over: { memberships?: MembershipRow[]; checkIns?: { checkedInAt: string; clubId: string }[] }) =>
  buildMembershipCard({ memberships: over.memberships ?? [], checkIns: over.checkIns ?? [], partnerClubs: CLUBS, now: NOW })
const at = (c: ReturnType<typeof card>, clubId: string) => c.dropIns.find((d) => d.clubId === clubId)!

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
      expect(card({ memberships: [row] }).status).toBe("active")
    }
  })

  it("honours what a cancelled WIQ member already paid for", () => {
    expect(card({ memberships: [wiq({ status: "cancelled", activeUntil: daysAgo(-10) })] }).status).toBe("active")
  })

  it("stops at the end of the paid period", () => {
    expect(card({ memberships: [wiq({ status: "cancelled", activeUntil: daysAgo(1) })] }).status).toBe("inactive")
  })

  it("takes the earliest join date across both systems", () => {
    expect(card({ memberships: [stripe(), wiq()] }).memberSince).toBe("2025-09-01T00:00:00.000Z")
  })
})

describe("the drop-in window, counted per club", () => {
  it("offers a session at every partner when none has been used", () => {
    const c = card({ memberships: [stripe()] })
    expect(c.dropIns.map((d) => d.eligible)).toEqual([true, true])
  })

  it("closes only the club that was visited", () => {
    /** The whole point: one club's offer is not the other's. */
    const c = card({ memberships: [stripe()], checkIns: [{ checkedInAt: daysAgo(3), clubId: "darkhorse" }] })
    expect(at(c, "darkhorse").eligible).toBe(false)
    expect(at(c, "darkhorse").availableFrom).toBe("2026-10-31T12:00:00.000Z")
    expect(at(c, "sandcats").eligible).toBe(true)
  })

  it("tracks both clubs independently", () => {
    const c = card({
      memberships: [stripe()],
      checkIns: [
        { checkedInAt: daysAgo(3), clubId: "darkhorse" },
        { checkedInAt: daysAgo(40), clubId: "sandcats" },
      ],
    })
    expect(at(c, "darkhorse").eligible).toBe(false)
    expect(at(c, "sandcats").eligible).toBe(true)
  })

  it("reopens on the thirtieth day, not the thirty-first", () => {
    const c = card({
      memberships: [stripe()],
      checkIns: [{ checkedInAt: daysAgo(DROP_IN_WINDOW_DAYS), clubId: "darkhorse" }],
    })
    expect(at(c, "darkhorse").eligible).toBe(true)
  })

  it("uses that club's most recent visit, not its first", () => {
    const c = card({
      memberships: [stripe()],
      checkIns: [
        { checkedInAt: daysAgo(45), clubId: "darkhorse" },
        { checkedInAt: daysAgo(2), clubId: "darkhorse" },
      ],
    })
    expect(at(c, "darkhorse").eligible).toBe(false)
    expect(at(c, "darkhorse").lastVisitAt).toBe(daysAgo(2))
  })

  it("ignores a visit to a club no longer partnered", () => {
    const c = card({ memberships: [stripe()], checkIns: [{ checkedInAt: daysAgo(1), clubId: "retired-club" }] })
    expect(c.dropIns.map((d) => d.eligible)).toEqual([true, true])
  })

  it("closes every club for a paused membership — that is what pausing means", () => {
    const c = card({ memberships: [stripe({ status: "paused" })] })
    expect(c.status).toBe("paused")
    expect(c.dropIns.every((d) => !d.eligible)).toBe(true)
  })

  it("closes every club for a lapsed membership", () => {
    const c = card({ memberships: [stripe({ status: "cancelled" })] })
    expect(c.dropIns.every((d) => !d.eligible)).toBe(true)
  })
})

describe("vouching for stale data", () => {
  it("warns when the only live membership is a WIQ row nobody has refreshed", () => {
    expect(card({ memberships: [wiq({ lastSyncedAt: daysAgo(48) })] }).staleWarning).toContain("check with NC United")
  })

  it("stays quiet when a fresh Stripe membership backs the card", () => {
    expect(card({ memberships: [wiq({ lastSyncedAt: daysAgo(48) }), stripe()] }).staleWarning).toBeNull()
  })

  it("stays quiet for a recently imported WIQ row", () => {
    expect(card({ memberships: [wiq({ lastSyncedAt: daysAgo(3) })] }).staleWarning).toBeNull()
  })
})
