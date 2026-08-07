import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { markdownToHtml, toPlainText } from "@/lib/blast-format"
import { sendAdminBlastEmails } from "@/lib/admin-messaging-blast-email"
import { resolveAdminBlastSender } from "@/lib/admin-blast-senders"
import { getAdminMessagingRecipients } from "@/lib/admin-messaging-recipients"
import { sendSms, toE164 } from "@/lib/sms"

export const dynamic = "force-dynamic"
export const maxDuration = 300

type RecipientRow = {
  user_id: string
  email: string | null
  display_name: string | null
  cell_phone: string | null
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user)
    return {
      ok: false as const,
      status: 401 as const,
      error: "Unauthorized",
      user: null,
    }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin)
    return {
      ok: false as const,
      status: 403 as const,
      error: "Admin required",
      user: null,
    }
  return { ok: true as const, user }
}

/** POST: Send blast. Body: { profile?, group?, subject?, body, channels: { inApp?: boolean, email?: boolean, sms?: boolean } } */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const adminUserId = (auth as { user: { id: string } }).user.id

  let body: {
    profile?: string
    group?: string
    subject?: string
    body?: string
    bodyHtml?: string
    testEmail?: string
    testOnly?: boolean
    logoVariant?: string
    emailSender?: string
    excludeCollegeCoaches?: boolean
    channels?: { inApp?: boolean; email?: boolean; sms?: boolean }
  } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const profile = typeof body.profile === "string" ? body.profile.trim() || null : null
  const group = typeof body.group === "string" ? body.group.trim() || null : null
  const subject = typeof body.subject === "string" ? body.subject.trim() || "Update from RecruitNC" : "Update from RecruitNC"
  const rawBody = typeof body.body === "string" ? body.body.trim() : ""
  const rawBodyHtml = typeof body.bodyHtml === "string" ? body.bodyHtml.trim() : ""
  const testEmail = typeof body.testEmail === "string" ? body.testEmail.trim() || null : null
  const testOnly = body.testOnly === true
  const excludeCollegeCoaches = body.excludeCollegeCoaches === true
  const sender = resolveAdminBlastSender({
    emailSender: body.emailSender,
    logoVariant: body.logoVariant,
  })
  const channels =
    body.channels && typeof body.channels === "object"
      ? {
          inApp: !!body.channels.inApp,
          email: !!body.channels.email,
          sms: !!body.channels.sms,
        }
      : { inApp: false, email: false, sms: false }

  if (!rawBody && !rawBodyHtml) return NextResponse.json({ error: "Message body is required" }, { status: 400 })
  if (!channels.inApp && !channels.email && !channels.sms) {
    return NextResponse.json({ error: "Select at least one channel (In-app, Email, or SMS)" }, { status: 400 })
  }

  const admin = createAdminClient()
  let recipients: RecipientRow[]
  if (testOnly && testEmail && testEmail.includes("@")) {
    recipients = [
      {
        user_id: "test",
        email: testEmail,
        display_name: "Test",
        cell_phone: null,
      },
    ]
  } else {
    recipients = await getAdminMessagingRecipients(admin, profile, group, 5000, excludeCollegeCoaches)
    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients match the selected audience" }, { status: 400 })
    }
    if (channels.email) {
      const withEmail = recipients.filter((r) => r.email?.trim()).length
      if (withEmail === 0) {
        return NextResponse.json(
          {
            error: "No recipients have an email on file — cannot send email blast.",
          },
          { status: 400 },
        )
      }
    }
  }

  // Use provided HTML if available (from rich text editor), otherwise convert markdown
  const htmlBody = rawBodyHtml || markdownToHtml(rawBody)
  const plainBody = rawBody || toPlainText(rawBodyHtml)
  const smsBody = plainBody.length > 1500 ? plainBody.slice(0, 1497) + "…" : plainBody

  const result: {
    inApp?: { sent: boolean; threadId?: string; error?: string }
    email: { sent: number; failed: number }
    sms: { sent: number; failed: number }
  } = {
    email: { sent: 0, failed: 0 },
    sms: { sent: 0, failed: 0 },
  }

  /** Log row created up front so each email can reference it for Reply-To threads. */
  let blastLogId: string | null = null
  try {
    const { data: logRow } = await admin
      .from("admin_blast_log")
      .insert({
        sent_by_user_id: adminUserId,
        sent_at: new Date().toISOString(),
        audience_profile: profile ?? null,
        audience_group: group ?? null,
        subject,
        body: rawBody,
        body_snippet: rawBody.slice(0, 200),
        channels_in_app: channels.inApp,
        channels_email: channels.email,
        channels_sms: channels.sms,
        recipient_count: recipients.length,
        result_in_app_sent: null,
        result_in_app_thread_id: null,
        result_email_sent: 0,
        result_email_failed: 0,
        result_sms_sent: 0,
        result_sms_failed: 0,
      })
      .select("id")
      .single()
    blastLogId = logRow?.id ?? null
  } catch (e) {
    console.warn("[admin/messaging/send] admin_blast_log early insert skipped:", (e as Error).message)
  }

  if (channels.inApp && group && !testOnly) {
    let threadId: string | null = null
    if (group === "blue") {
      const { data: t } = await admin.from("messaging_threads").select("id").eq("context_type", "program").in("context_id", ["blue", "blue-2026"]).limit(1).maybeSingle()
      threadId = t?.id ?? null
    } else if (group.startsWith("event:")) {
      const eventSlug = group.slice("event:".length)
      const { data: t } = await admin.from("messaging_threads").select("id").eq("context_type", "event").eq("context_id", eventSlug).limit(1).maybeSingle()
      threadId = t?.id ?? null
    }
    if (threadId) {
      const { error: insertErr } = await admin.from("messaging_messages").insert({
        thread_id: threadId,
        sender_id: adminUserId,
        type: "announcement",
        body: rawBody.slice(0, 2000),
      })
      if (!insertErr) {
        await admin.from("messaging_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId)
        result.inApp = { sent: true, threadId }
      } else {
        result.inApp = { sent: false, error: insertErr.message }
      }
    } else {
      result.inApp = {
        sent: false,
        error: "No thread found for this group (event or Blue). In-app only works for event hubs or Blue.",
      }
    }
  }

  let emailSkippedNoAddress = 0
  let emailSampleError: string | undefined
  if (channels.email) {
    const emailResult = await sendAdminBlastEmails(recipients, {
      subject,
      htmlBody,
      sender,
      replyTo: group?.startsWith("toc-college-coaches") ? "info@ncwrestlingunited.com" : undefined,
    })
    result.email.sent = emailResult.sent
    result.email.failed = emailResult.failed
    emailSkippedNoAddress = emailResult.skippedNoEmail
    emailSampleError = emailResult.sampleError
  }

  if (channels.sms && !testOnly) {
    for (const r of recipients) {
      const e164 = toE164(r.cell_phone)
      if (!e164) continue
      const ok = await sendSms(e164, smsBody)
      if (ok) result.sms.sent++
      else result.sms.failed++
    }
  }

  if (blastLogId) {
    try {
      await admin
        .from("admin_blast_log")
        .update({
          result_in_app_sent: result.inApp?.sent ?? null,
          result_in_app_thread_id: result.inApp?.threadId ?? null,
          result_email_sent: result.email.sent,
          result_email_failed: result.email.failed,
          result_sms_sent: result.sms.sent,
          result_sms_failed: result.sms.failed,
        })
        .eq("id", blastLogId)
    } catch (e) {
      console.warn("[admin/messaging/send] admin_blast_log update skipped:", (e as Error).message)
    }
  } else {
    try {
      await admin.from("admin_blast_log").insert({
        sent_by_user_id: adminUserId,
        sent_at: new Date().toISOString(),
        audience_profile: profile ?? null,
        audience_group: group ?? null,
        subject,
        body: rawBody,
        body_snippet: rawBody.slice(0, 200),
        channels_in_app: channels.inApp,
        channels_email: channels.email,
        channels_sms: channels.sms,
        recipient_count: recipients.length,
        result_in_app_sent: result.inApp?.sent ?? null,
        result_in_app_thread_id: result.inApp?.threadId ?? null,
        result_email_sent: result.email.sent,
        result_email_failed: result.email.failed,
        result_sms_sent: result.sms.sent,
        result_sms_failed: result.sms.failed,
      })
    } catch (e) {
      console.warn("[admin/messaging/send] admin_blast_log insert skipped:", (e as Error).message)
    }
  }

  if (channels.email && result.email.sent === 0 && result.email.failed === 0) {
    return NextResponse.json(
      {
        error: "No emails were sent. Check RESEND_API_KEY on Vercel and that recipients have email addresses.",
        recipientCount: recipients.length,
        result,
        emailSkippedNoAddress,
        emailSampleError,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    recipientCount: recipients.length,
    result,
    emailSkippedNoAddress,
    emailSampleError,
    testOnly,
  })
}
