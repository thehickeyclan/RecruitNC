import { randomBytes } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { BLUE_PUBLIC_PAGE_URL } from "@/lib/blue-member-links"

export type BlueApprovalEmailParams = {
  athleteFirstName: string
  athleteLastName: string
  parentName?: string | null
  personalNote?: string | null
  registerUrl: string
}

export function buildBlueApprovalEmailHtml(params: BlueApprovalEmailParams): string {
  const athleteName = [params.athleteFirstName, params.athleteLastName].filter(Boolean).join(" ").trim() || "your athlete"
  const greeting = params.parentName?.trim() ? `Hi ${params.parentName.trim()},` : "Hi,"
  const noteBlock = params.personalNote?.trim()
    ? `<p style="background: #f3f4f6; padding: 14px; border-radius: 6px; font-style: italic;">${escapeHtml(params.personalNote.trim())}</p>`
    : ""

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #03154C 0%, #0A1628 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">NC United Blue</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>${greeting}</p>
    <p>Congratulations — <strong>${escapeHtml(athleteName)}</strong> has been <strong>approved to join NC United Blue</strong>, our invite-only training program for North Carolina&apos;s top high school wrestlers.</p>
    ${noteBlock}

    <h2 style="color: #03154C; font-size: 16px; margin-top: 24px;">Why Blue</h2>
    <ul style="padding-left: 20px; margin: 12px 0;">
      <li>Train with the state&apos;s best wrestlers under shared elite standards</li>
      <li>Compete as a unified NC group on national stages</li>
      <li>Pathway to NC United National Team opportunities</li>
      <li>Recruiting assistance through RecruitNC profiles, exposure, and college pipeline support</li>
      <li>Accountability, culture, and daily competition that raises everyone&apos;s level</li>
    </ul>

    <h2 style="color: #03154C; font-size: 16px; margin-top: 24px;">Practices</h2>
    <p><strong>Sundays, 1:00–3:00 PM</strong><br>UNC Fetzer Hall · Chapel Hill</p>

    <h2 style="color: #03154C; font-size: 16px; margin-top: 24px;">Member benefits</h2>
    <p>After you complete registration, Blue members get our private GroupMe community and <strong>20% off NC United Store</strong> apparel and gear.</p>

    <h2 style="color: #03154C; font-size: 16px; margin-top: 24px;">Complete registration</h2>
    <p>Use your private link below to enroll and set up billing. The link expires in 14 days.</p>
    <p style="margin: 20px 0;">
      <a href="${params.registerUrl}" style="display: inline-block; background: #03154C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Register for Blue</a>
    </p>
    <p style="color: #6b7280; font-size: 13px; word-break: break-all;">${escapeHtml(params.registerUrl)}</p>

    <h2 style="color: #03154C; font-size: 16px; margin-top: 24px;">Learn more</h2>
    <p><a href="${BLUE_PUBLIC_PAGE_URL}" style="color: #03154C; font-weight: bold;">Read the full NC United Blue program page →</a></p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 14px;">Questions? Reply to this email or contact <a href="mailto:info@ncwrestlingunited.com" style="color: #03154C;">info@ncwrestlingunited.com</a></p>
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

export async function sendBlueApprovalEmail(
  to: string,
  params: BlueApprovalEmailParams,
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "Email service not configured" }
  }

  const athleteName = [params.athleteFirstName, params.athleteLastName].filter(Boolean).join(" ").trim()
  const subject = athleteName
    ? `${athleteName} — approved for NC United Blue`
    : "You're approved for NC United Blue"

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: "NC Wrestling United <info@ncwrestlingunited.com>",
      to: [to.trim()],
      subject,
      html: buildBlueApprovalEmailHtml(params),
    })
    if (result.error) {
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to send email" }
  }
}

function generateToken(): string {
  return randomBytes(24).toString("base64url")
}

/** Reuse unused invite for this interest row, or create a new one. */
export async function ensureBlueInviteForInterest(
  admin: SupabaseClient,
  opts: {
    interestId: string
    email: string
    createdBy: string
    notes?: string | null
    expiresInDays?: number
  },
): Promise<{ inviteId: string; token: string; registerUrl: string } | { error: string }> {
  const { data: existing } = await admin
    .from("blue_invites")
    .select("id, token, expires_at, used_at")
    .eq("interest_id", opts.interestId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.ncwrestlingunited.com"

  if (existing?.token) {
    return {
      inviteId: existing.id,
      token: existing.token,
      registerUrl: `${baseUrl}/blue/register?invite=${encodeURIComponent(existing.token)}`,
    }
  }

  const expiresInDays = Math.min(90, Math.max(1, opts.expiresInDays ?? 14))
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)
  const token = generateToken()

  const { data: row, error } = await admin
    .from("blue_invites")
    .insert({
      token,
      email: opts.email.trim().toLowerCase(),
      expires_at: expiresAt.toISOString(),
      created_by: opts.createdBy,
      notes: opts.notes?.trim() || null,
      interest_id: opts.interestId,
    })
    .select("id, token")
    .single()

  if (error || !row) {
    return { error: error?.message || "Failed to create invite" }
  }

  return {
    inviteId: row.id,
    token: row.token,
    registerUrl: `${baseUrl}/blue/register?invite=${encodeURIComponent(row.token)}`,
  }
}
