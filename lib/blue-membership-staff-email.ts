import "server-only"
import type Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import { NC_UNITED_STAFF_BCC, sendStaffEmail } from "@/lib/resend-staff-bcc"
import type { BlueMembershipStaffAlertKind } from "@/lib/blue-membership-staff-alert"

const FROM = "NC Wrestling United <info@ncwrestlingunited.com>"
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"

export type BlueMembershipStaffAlertDetails = {
  kind: BlueMembershipStaffAlertKind
  membershipId: string
  athleteName: string
  payerName: string
  payerEmail: string | null
  stripeSubscriptionId: string
  resumeAt: string | null
  nextBillingAt: string | null
  cancelAtPeriodEnd: boolean
  initiatedBy: "member" | "stripe" | "admin"
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function subjectFor(kind: BlueMembershipStaffAlertKind, athleteName: string): string {
  switch (kind) {
    case "paused":
      return `Blue membership paused — ${athleteName}`
    case "cancel_scheduled":
      return `Blue membership cancelling at period end — ${athleteName}`
    case "cancelled":
      return `Blue membership cancelled — ${athleteName}`
  }
}

function headlineFor(kind: BlueMembershipStaffAlertKind): string {
  switch (kind) {
    case "paused":
      return "Membership paused"
    case "cancel_scheduled":
      return "Cancellation scheduled"
    case "cancelled":
      return "Membership cancelled"
  }
}

function summaryFor(kind: BlueMembershipStaffAlertKind, details: BlueMembershipStaffAlertDetails): string {
  switch (kind) {
    case "paused":
      return details.resumeAt
        ? `Billing is paused. Scheduled to resume on ${formatWhen(details.resumeAt)}.`
        : "Billing is paused in Stripe. Resume date was not set on the subscription."
    case "cancel_scheduled":
      return details.nextBillingAt
        ? `Member requested cancel at end of billing period (${formatWhen(details.nextBillingAt)}).`
        : "Member requested cancel at end of the current billing period."
    case "cancelled":
      return "The Blue subscription is cancelled in Stripe."
  }
}

export function buildBlueMembershipStaffAlertHtml(details: BlueMembershipStaffAlertDetails): string {
  const adminUrl = `${SITE_URL}/admin/blue/subscriptions`
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #03154C 0%, #0A1628 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">NC United Blue — ${headlineFor(details.kind)}</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>${summaryFor(details.kind, details)}</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Athlete</td><td style="padding: 6px 0;"><strong>${escapeHtml(details.athleteName)}</strong></td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Parent / payer</td><td style="padding: 6px 0;">${escapeHtml(details.payerName)}${details.payerEmail ? ` &lt;${escapeHtml(details.payerEmail)}&gt;` : ""}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Stripe subscription</td><td style="padding: 6px 0; font-family: monospace; font-size: 12px;">${escapeHtml(details.stripeSubscriptionId)}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Membership id</td><td style="padding: 6px 0; font-family: monospace; font-size: 12px;">${escapeHtml(details.membershipId)}</td></tr>
      ${details.resumeAt ? `<tr><td style="padding: 6px 0; color: #6b7280;">Resume date</td><td style="padding: 6px 0;">${escapeHtml(formatWhen(details.resumeAt))}</td></tr>` : ""}
      ${details.nextBillingAt ? `<tr><td style="padding: 6px 0; color: #6b7280;">Next bill / access end</td><td style="padding: 6px 0;">${escapeHtml(formatWhen(details.nextBillingAt))}</td></tr>` : ""}
      <tr><td style="padding: 6px 0; color: #6b7280;">Source</td><td style="padding: 6px 0;">${escapeHtml(details.initiatedBy === "member" ? "Member (profile or billing portal)" : details.initiatedBy === "admin" ? "Admin action" : "Stripe")}</td></tr>
    </table>
    <p style="margin: 20px 0;">
      <a href="${adminUrl}" style="display: inline-block; background: #03154C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Blue subscriptions admin</a>
    </p>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

async function resolveAthleteName(
  admin: SupabaseClient,
  athleteId: string,
  signupId: string | null,
): Promise<string> {
  const { data: athlete } = await admin
    .from("athletes")
    .select("name, firstname, lastname, firstName, lastName")
    .eq("id", athleteId)
    .maybeSingle()
  if (athlete) {
    const row = athlete as Record<string, unknown>
    const name =
      String(row.name ?? "").trim() ||
      [row.firstname ?? row.firstName, row.lastname ?? row.lastName].filter(Boolean).join(" ").trim()
    if (name) return name
  }
  if (signupId) {
    const { data: signup } = await admin
      .from("blue_signups")
      .select("athlete_first_name, athlete_last_name")
      .eq("id", signupId)
      .maybeSingle()
    if (signup) {
      const n = [signup.athlete_first_name, signup.athlete_last_name].filter(Boolean).join(" ").trim()
      if (n) return n
    }
  }
  return "Unknown athlete"
}

async function resolvePayer(
  admin: SupabaseClient,
  payerUserId: string | null,
  signupId: string | null,
): Promise<{ name: string; email: string | null }> {
  if (payerUserId) {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("full_name, first_name, last_name, email")
      .eq("user_id", payerUserId)
      .maybeSingle()
    if (profile) {
      const full = String(profile.full_name ?? "").trim()
      const name =
        full || [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Parent"
      return { name, email: profile.email?.trim() || null }
    }
  }
  if (signupId) {
    const { data: signup } = await admin
      .from("blue_signups")
      .select("parent_email, parent_first_name, parent_last_name")
      .eq("id", signupId)
      .maybeSingle()
    if (signup) {
      const name =
        [signup.parent_first_name, signup.parent_last_name].filter(Boolean).join(" ").trim() || "Parent"
      return { name, email: signup.parent_email?.trim() || null }
    }
  }
  return { name: "Parent", email: null }
}

export async function loadBlueMembershipStaffAlertDetails(
  admin: SupabaseClient,
  membership: {
    id: string
    athlete_id: string
    payer_user_id: string | null
    signup_id?: string | null
    resume_at?: string | null
    next_billing_at?: string | null
    stripe_subscription_id: string | null
  },
  subscription: Stripe.Subscription,
  kind: BlueMembershipStaffAlertKind,
  initiatedBy: BlueMembershipStaffAlertDetails["initiatedBy"],
): Promise<BlueMembershipStaffAlertDetails | null> {
  const subId = membership.stripe_subscription_id?.trim()
  if (!subId) return null

  const signupId = membership.signup_id?.trim() || null
  const [athleteName, payer] = await Promise.all([
    resolveAthleteName(admin, membership.athlete_id, signupId),
    resolvePayer(admin, membership.payer_user_id, signupId),
  ])

  const stripeResumeAt =
    subscription.pause_collection?.resumes_at != null
      ? new Date(subscription.pause_collection.resumes_at * 1000).toISOString()
      : null
  const resumeAt = membership.resume_at ?? stripeResumeAt
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null

  return {
    kind,
    membershipId: membership.id,
    athleteName,
    payerName: payer.name,
    payerEmail: payer.email,
    stripeSubscriptionId: subId,
    resumeAt,
    nextBillingAt: membership.next_billing_at ?? periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    initiatedBy,
  }
}

export async function sendBlueMembershipStaffAlertEmail(
  details: BlueMembershipStaffAlertDetails,
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[blue-membership-staff-email] RESEND_API_KEY not configured")
    return { success: false, error: "Email not configured" }
  }

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await sendStaffEmail(resend, {
      from: FROM,
      to: [NC_UNITED_STAFF_BCC],
      subject: subjectFor(details.kind, details.athleteName),
      html: buildBlueMembershipStaffAlertHtml(details),
    })
    if (result.error) {
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to send email" }
  }
}

export async function notifyStaffBlueMembershipChange(
  admin: SupabaseClient,
  params: {
    membership: {
      id: string
      athlete_id: string
      payer_user_id: string | null
      signup_id?: string | null
      resume_at?: string | null
      next_billing_at?: string | null
      stripe_subscription_id: string | null
      status?: string | null
    }
    subscription: Stripe.Subscription
    kind: BlueMembershipStaffAlertKind
    initiatedBy?: BlueMembershipStaffAlertDetails["initiatedBy"]
  },
): Promise<void> {
  const details = await loadBlueMembershipStaffAlertDetails(
    admin,
    params.membership,
    params.subscription,
    params.kind,
    params.initiatedBy ?? "stripe",
  )
  if (!details) return

  void sendBlueMembershipStaffAlertEmail(details).then((r) => {
    if (!r.success) {
      console.warn("[blue-membership-staff-email]", params.kind, params.membership.id, r.error)
    }
  })
}
