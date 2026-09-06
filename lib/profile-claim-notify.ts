/**
 * Tell staff when somebody claims an athlete profile.
 *
 * A claim is immediate: `claimed_by_user_id` is set the moment the button is pressed, with no
 * review. Across 292 unclaimed profiles belonging to minors that is a real surface — anyone
 * with an account can take a wrestler's page and start editing it — and the cheap mitigation
 * is not to slow the honest claims down but to make sure a wrong one is seen.
 *
 * So this notifies rather than gates. It carries who claimed what, which relationship they
 * said, and whether the profile already had an owner, because a claim that displaces an
 * existing owner is the one worth looking at first.
 *
 * Silent no-op when no recipients are configured, matching how the reimbursement alerts
 * behave — a missing env var must never break a claim.
 */

import { Resend } from "resend"

/** Comma-separated addresses. Unset means no email is sent. */
const CLAIM_ALERT_ENV = "RECRUITNC_PROFILE_CLAIM_ALERT_TO"

const FROM = "NC Wrestling United <info@ncwrestlingunited.com>"

const BASE = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://app.ncwrestlingunited.com"
).replace(/\/$/, "")

export type ProfileClaimAlert = {
  athleteId: string
  athleteName: string
  relationship: "self" | "parent"
  claimantName: string | null
  claimantEmail: string | null
  /** Set when the profile already belonged to someone — the case worth reviewing. */
  previousOwnerUserId: string | null
}

export function claimAlertRecipients(): string[] {
  return (process.env[CLAIM_ALERT_ENV] ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean)
}

/** Subject line — a displaced owner is flagged in the subject so it is not missed in a list. */
export function claimAlertSubject(alert: ProfileClaimAlert): string {
  const who = alert.relationship === "self" ? "claimed" : "linked as parent"
  const prefix = alert.previousOwnerUserId ? "[REVIEW] " : ""
  return `${prefix}${alert.athleteName} ${who}`
}

export function claimAlertBody(alert: ProfileClaimAlert): string {
  const rows: Array<[string, string]> = [
    ["Athlete", alert.athleteName],
    ["Relationship", alert.relationship === "self" ? "This is me" : "This is my son or daughter"],
    ["Claimed by", alert.claimantName || "name not on file"],
    ["Account", alert.claimantEmail || "email not on file"],
    ["Profile", `${BASE}/view-profile?id=${encodeURIComponent(alert.athleteId)}`],
  ]
  if (alert.previousOwnerUserId) {
    rows.push(["Previous owner", `${alert.previousOwnerUserId} — this claim replaced an existing owner`])
  }
  return rows.map(([label, value]) => `${label}: ${value}`).join("\n")
}

/**
 * Send the alert. Never throws — a claim must not fail because email did.
 */
export async function notifyProfileClaim(alert: ProfileClaimAlert): Promise<void> {
  const recipients = claimAlertRecipients()
  if (recipients.length === 0 || !process.env.RESEND_API_KEY) return

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: FROM,
      to: recipients,
      subject: claimAlertSubject(alert),
      text: claimAlertBody(alert),
    })
  } catch (error) {
    console.error("[profile-claim-notify] send failed", error)
  }
}
