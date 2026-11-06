import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * The link a parent sends so their wrestler can answer their own "What matters" set (priorities v3,
 * part 5; Matt's decision 4: a parent never answers the athlete set for them).
 *
 * The token names one wrestler and an expiry, signed with a server secret, so nobody can make one
 * for another family. It grants nothing by being opened: the join page still needs the wrestler's
 * own signed-in account, a wrestler role, and a tick on the consent words before it links the
 * profile (lib/profile-claim.ts claimProfile, relationship "self"). Message apps fetch links to draw
 * previews, so opening must never claim.
 */
const VERSION = "v1"
export const INVITE_LINK_DAYS = 14

function key(): string {
  const k = process.env.PRIORITIES_INVITE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE
  if (!k) throw new Error("Invite links are not configured.")
  return k
}

const sign = (athleteId: string, expires: number) => createHmac("sha256", key()).update(`priorities-invite:${VERSION}:${athleteId}:${expires}`).digest("base64url")

export function createInviteToken(athleteId: string, now: number = Date.now()): string {
  const expires = Math.floor(now / 1000) + INVITE_LINK_DAYS * 86_400
  return `${expires}.${sign(athleteId, expires)}`
}

export function verifyInviteToken(athleteId: string, token: string | null | undefined, now: number = Date.now()): boolean {
  const [rawExpires, signature] = String(token ?? "").split(".")
  const expires = Number(rawExpires)
  if (!/^[0-9a-f-]{36}$/i.test(athleteId) || !Number.isInteger(expires) || !signature || expires * 1000 < now) return false
  const expected = Buffer.from(sign(athleteId, expires))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export const invitePath = (athleteId: string, token: string) => `/my-recruiting/priorities/join?a=${encodeURIComponent(athleteId)}&t=${encodeURIComponent(token)}`

export type JoinState =
  | "invalid" // bad or expired link
  | "sign_in" // nobody signed in: make or sign in to the wrestler's own account
  | "parent_account" // a parent's (or any non-wrestler) account opened it: it's for the wrestler
  | "claimed_by_other" // another account already owns the profile
  | "already_yours" // this login already owns it: straight to the questions
  | "ready" // a wrestler account, free profile: show the consent words and the button

/** What the join page shows. Pure, so the rules are tested without a browser. */
export function joinState(input: {
  validLink: boolean
  userId: string | null
  /** relationshipForRole(account, null): "self" for a wrestler account, "parent" for a parent, else null. */
  relationship: "self" | "parent" | null
  linkedParent: boolean
  claimedBy: string | null
}): JoinState {
  if (!input.validLink) return "invalid"
  if (!input.userId) return "sign_in"
  if (input.claimedBy === input.userId && !input.linkedParent && input.relationship !== "parent") return "already_yours"
  if (input.linkedParent || input.relationship !== "self") return "parent_account"
  if (input.claimedBy) return "claimed_by_other"
  return "ready"
}
