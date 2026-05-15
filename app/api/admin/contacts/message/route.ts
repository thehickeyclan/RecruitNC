import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendSms, toE164 } from "@/lib/sms"

export const dynamic = "force-dynamic"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = "NC Wrestling United <info@ncwrestlingunited.com>"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401, error: "Unauthorized", user: null }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin, full_name").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403, error: "Admin required", user: null }
  return { ok: true as const, user, adminName: profile.full_name || "RecruitNC Admin" }
}

async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: "Email service not configured (RESEND_API_KEY missing)" }
  }

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(RESEND_API_KEY)

    // Convert plain text to simple HTML
    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #061224 0%, #0B2545 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #C8A94A; margin: 0; font-size: 20px;">RecruitNC</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    ${body.split("\n").map(p => `<p style="margin: 0 0 16px 0;">${p || "&nbsp;"}</p>`).join("")}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">
      This message was sent by RecruitNC. Reply to this email or contact 
      <a href="mailto:info@ncwrestlingunited.com" style="color: #C8A94A;">info@ncwrestlingunited.com</a>
    </p>
  </div>
</body>
</html>
    `

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to.trim()],
      subject,
      html: htmlBody,
      text: body, // Plain text fallback
    })

    if (result.error) {
      console.error("[admin/contacts/message] Resend error:", result.error)
      return { success: false, error: result.error.message }
    }

    return { success: true, messageId: result.data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email"
    console.error("[admin/contacts/message] Email error:", err)
    return { success: false, error: message }
  }
}

/**
 * POST: Send a message to a specific contact
 * Body: { contactId, contactType, channel: "email"|"sms", subject?, body, recipientEmail?, recipientPhone? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  let payload: {
    contactId?: string
    contactType?: string
    channel?: "email" | "sms"
    subject?: string
    body?: string
    recipientEmail?: string
    recipientPhone?: string
  } = {}

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const { contactId, contactType, channel, subject, body, recipientEmail, recipientPhone } = payload

  if (!contactId || !contactType) {
    return NextResponse.json({ success: false, error: "contactId and contactType are required" }, { status: 400 })
  }
  if (!channel || (channel !== "email" && channel !== "sms")) {
    return NextResponse.json({ success: false, error: "channel must be 'email' or 'sms'" }, { status: 400 })
  }
  if (!body?.trim()) {
    return NextResponse.json({ success: false, error: "Message body is required" }, { status: 400 })
  }

  const admin = createAdminClient()
  let sendResult: { success: boolean; messageId?: string; error?: string }

  if (channel === "email") {
    if (!recipientEmail?.trim()) {
      return NextResponse.json({ success: false, error: "recipientEmail is required for email channel" }, { status: 400 })
    }
    const emailSubject = subject?.trim() || "Message from RecruitNC"
    sendResult = await sendEmail(recipientEmail.trim(), emailSubject, body.trim())
  } else {
    // SMS
    if (!recipientPhone?.trim()) {
      return NextResponse.json({ success: false, error: "recipientPhone is required for SMS channel" }, { status: 400 })
    }
    const e164 = toE164(recipientPhone)
    if (!e164) {
      return NextResponse.json({ success: false, error: "Invalid phone number format" }, { status: 400 })
    }
    const smsOk = await sendSms(e164, body.trim())
    sendResult = smsOk ? { success: true } : { success: false, error: "SMS delivery failed" }
  }

  // Log the message in database
  try {
    await admin.from("crm_contact_messages").insert({
      contact_id: contactId,
      contact_type: contactType,
      sent_by_user_id: auth.user.id,
      channel,
      direction: "outbound",
      subject: channel === "email" ? (subject?.trim() || null) : null,
      body: body.trim().slice(0, 10000),
      recipient_email: channel === "email" ? recipientEmail : null,
      recipient_phone: channel === "sms" ? recipientPhone : null,
      status: sendResult.success ? "sent" : "failed",
      external_message_id: sendResult.messageId || null,
      created_at: new Date().toISOString(),
    })
  } catch (logErr) {
    // Don't fail the request if logging fails, but warn
    console.warn("[admin/contacts/message] Failed to log message:", logErr)
  }

  if (!sendResult.success) {
    return NextResponse.json({ success: false, error: sendResult.error || "Failed to send message" }, { status: 500 })
  }

  return NextResponse.json({ success: true, messageId: sendResult.messageId })
}
