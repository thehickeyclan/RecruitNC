import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * The link in Matt's text that opens a commitment for approval (Matt, 26 October 2026: "it should
 * text me with link to approve and it auto sends").
 *
 * The token stands in for signing in: Matt approves from his phone wherever he is, and the page
 * behind it shows one submission and nothing else. It names the submission and an expiry, so a
 * forwarded or leaked link opens that one commitment for thirty days and then nothing. Opening the
 * link changes nothing - approving is a button on the page - because message apps fetch links to
 * draw previews, and a preview must never publish a commitment.
 */
const VERSION = "v1"
export const APPROVAL_LINK_DAYS = 30

function key(): string {
  const k = process.env.COMMITMENT_APPROVAL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE
  if (!k) throw new Error("Commitment approval links are not configured.")
  return k
}

const sign = (submissionId: string, expires: number) =>
  createHmac("sha256", key()).update(`commitment-approval:${VERSION}:${submissionId}:${expires}`).digest("base64url")

export function createApprovalToken(submissionId: string, now: number = Date.now()): string {
  const expires = Math.floor(now / 1000) + APPROVAL_LINK_DAYS * 86_400
  return `${expires}.${sign(submissionId, expires)}`
}

export function verifyApprovalToken(submissionId: string, token: string | null | undefined, now: number = Date.now()): boolean {
  const [rawExpires, signature] = String(token ?? "").split(".")
  const expires = Number(rawExpires)
  if (!Number.isInteger(expires) || !signature || expires * 1000 < now) return false
  const expected = Buffer.from(sign(submissionId, expires))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com").replace(/\/$/, "")
}

export function approvalUrl(submissionId: string): string {
  return `${siteUrl()}/approve-commitment/${encodeURIComponent(submissionId)}?t=${encodeURIComponent(createApprovalToken(submissionId))}`
}
