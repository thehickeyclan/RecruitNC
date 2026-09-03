/**
 * The Blue membership card, and whether its holder may take a partner-club drop-in today.
 *
 * The card exists to be shown at a partner club's door — Darkhorse first — where a coach glances
 * at a phone and waves the wrestler on. Two things have to be true for that to work: it must say
 * plainly whether the membership is live, and it must say whether the free drop-in is available
 * without anybody doing arithmetic at a door.
 *
 * Membership comes from two systems and will for years: Stripe for everyone who joined recently,
 * WrestlingIQ for the closed pool that drains by attrition. A holder cannot tell which they are on
 * and should not have to, so both resolve to the same card.
 */

export type MembershipSource = "stripe" | "wiq"

export type MembershipRow = {
  source: MembershipSource
  status: string | null
  /** When they joined, for the "member since" line. */
  startedAt: string | null
  /** Stripe's next invoice, or WIQ's next due date. Null when we hold neither. */
  nextBillingAt: string | null
  /** WIQ only: paid through this date even if the subscription has since been cancelled. */
  activeUntil?: string | null
  /** When this row was last refreshed from its source system. */
  lastSyncedAt: string | null
}

export type DropInCheckIn = {
  /** ISO timestamp of the visit a partner club recorded. */
  checkedInAt: string
  clubId: string
}

/**
 * One partner club's standing for this member.
 *
 * The window is counted per club, not across all of them: the free session is each club's own
 * offer, so a member who trained at one partner last week is still owed a first visit at the next
 * partner to join. Counting globally would quietly take that away the day a second club signed up.
 */
export type PartnerDropIn = {
  clubId: string
  clubName: string
  eligible: boolean
  /** ISO date this club's next free session becomes available; null when one is available now. */
  availableFrom: string | null
  lastVisitAt: string | null
}

export type MembershipCard = {
  status: "active" | "paused" | "inactive"
  memberSince: string | null
  /** One entry per partner club, in the order the clubs are listed. */
  dropIns: PartnerDropIn[]
  /**
   * Set when the membership data behind this card is too old to vouch for.
   *
   * WrestlingIQ rows only refresh when somebody imports a CSV by hand, and half the membership
   * sits there. A card that confidently vouches for a status from six weeks ago is worse than one
   * that admits it cannot: a partner club turning away a paying family, or admitting somebody who
   * cancelled, costs the partnership rather than the app.
   */
  staleWarning: string | null
}

/** One free drop-in per rolling window. Calendar months would allow the 30th and the 1st. */
export const DROP_IN_WINDOW_DAYS = 30

/** WrestlingIQ rows go stale silently; past this many days the card stops vouching for them. */
export const WIQ_STALE_AFTER_DAYS = 21

const DAY_MS = 86_400_000

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS)
}

function parse(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "active", "trialing" and WIQ's "Paid" all mean the same thing to somebody at a door. */
function isLive(row: MembershipRow, now: Date): boolean {
  const status = String(row.status ?? "").trim().toLowerCase()
  if (["active", "trialing", "paid"].includes(status)) return true
  /** A cancelled WIQ member keeps what they paid for until the period ends. */
  const until = parse(row.activeUntil)
  return Boolean(until && until.getTime() > now.getTime())
}

function isPaused(row: MembershipRow): boolean {
  return String(row.status ?? "").trim().toLowerCase() === "paused"
}

export function buildMembershipCard(input: {
  memberships: readonly MembershipRow[]
  checkIns: readonly DropInCheckIn[]
  partnerClubs: readonly { id: string; name: string }[]
  now: Date
}): MembershipCard {
  const { memberships, checkIns, partnerClubs, now } = input

  const live = memberships.filter((m) => isLive(m, now))
  const paused = memberships.filter(isPaused)
  const status: MembershipCard["status"] = live.length > 0 ? "active" : paused.length > 0 ? "paused" : "inactive"

  const starts = memberships.map((m) => parse(m.startedAt)).filter((d): d is Date => d !== null)
  const memberSince = starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))).toISOString() : null

  /**
   * Only a live membership earns a drop-in. A paused one does not — pausing is how a family stops
   * paying for a while, and the partner benefit stops with it.
   */
  const membershipAllows = status === "active"

  const dropIns: PartnerDropIn[] = partnerClubs.map((club) => {
    const visits = checkIns
      .filter((visit) => visit.clubId === club.id)
      .map((visit) => parse(visit.checkedInAt))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())

    const last = visits[0] ?? null
    const withinWindow = Boolean(last && daysBetween(last, now) < DROP_IN_WINDOW_DAYS)

    return {
      clubId: club.id,
      clubName: club.name,
      eligible: membershipAllows && !withinWindow,
      availableFrom: withinWindow && last ? new Date(last.getTime() + DROP_IN_WINDOW_DAYS * DAY_MS).toISOString() : null,
      lastVisitAt: last ? last.toISOString() : null,
    }
  })

  let staleWarning: string | null = null
  const staleWiq = live.filter((m) => {
    if (m.source !== "wiq") return false
    const synced = parse(m.lastSyncedAt)
    return !synced || daysBetween(synced, now) > WIQ_STALE_AFTER_DAYS
  })
  if (staleWiq.length > 0 && live.length === staleWiq.length) {
    staleWarning = "Membership last confirmed a while ago — check with NC United before claiming a drop-in."
  }

  return { status, memberSince, dropIns, staleWarning }
}
