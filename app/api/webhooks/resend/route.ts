import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseEmailAddress, parseThreadIdFromAddress } from "@/lib/recruitnc-admin-email"
import { fetchResendReceivedEmail } from "@/lib/resend-received-email"

export const dynamic = "force-dynamic"

function textFromReceived(email: { text?: string | null; html?: string | null }): string {
  const t = email.text?.trim()
  if (t) return t.slice(0, 500_000)
  const h = email.html
  if (!h) return ""
  return h
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500_000)
}

/**
 * Resend webhook: `email.received` for inbound replies to admin blast Reply-To.
 * Configure in Resend Dashboard → Webhooks → `email.received` → this URL.
 * Set env RECRUITNC_EMAIL_REPLY_DOMAIN to match the domain on Reply-To (replies+<thread_id>@domain).
 */
export async function POST(request: NextRequest) {
  let payload: { type?: string; data?: { email_id?: string } }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (payload.type !== "email.received" || !payload.data?.email_id) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const emailId = payload.data.email_id
  const full = await fetchResendReceivedEmail(emailId)
  if (!full) {
    return NextResponse.json({ ok: false, error: "Could not load email" }, { status: 500 })
  }

  const toList = full.to ?? (full as { to?: string[] }).to
  const toJoined = Array.isArray(toList) ? toList.join(", ") : String(toList ?? "")
  const threadId = parseThreadIdFromAddress(toJoined)
  if (!threadId) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_thread_in_to" })
  }

  const fromRaw = full.from ?? ""
  const { email: fromEmail } = parseEmailAddress(fromRaw)
  if (!fromEmail) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_from" })
  }

  const admin = createAdminClient()
  const { data: thread, error: threadErr } = await admin
    .from("admin_email_threads")
    .select("id, recipient_user_id")
    .eq("id", threadId)
    .maybeSingle()

  if (threadErr || !thread) {
    console.warn("[webhooks/resend] unknown thread", threadId)
    return NextResponse.json({ ok: true, skipped: true, reason: "unknown_thread" })
  }

  const { data: profile } = await admin
    .from("user_profiles")
    .select("email")
    .eq("user_id", (thread as { recipient_user_id: string }).recipient_user_id)
    .maybeSingle()

  const expected = (profile as { email?: string } | null)?.email?.trim().toLowerCase()
  if (expected && expected !== fromEmail) {
    console.warn("[webhooks/resend] from email does not match thread recipient", fromEmail, expected)
    return NextResponse.json({ ok: true, skipped: true, reason: "sender_mismatch" })
  }

  const bodyText = textFromReceived(full)
  if (!bodyText) {
    return NextResponse.json({ ok: true, skipped: true, reason: "empty_body" })
  }

  const { error: insErr } = await admin.from("admin_email_messages").insert({
    thread_id: threadId,
    direction: "inbound",
    body_text: bodyText,
    body_html: full.html?.slice(0, 500_000) ?? null,
    from_email: fromEmail,
    sender_user_id: (thread as { recipient_user_id: string }).recipient_user_id,
    inbound_resend_email_id: emailId,
  })

  if (insErr) {
    console.error("[webhooks/resend] insert inbound:", insErr)
    return NextResponse.json({ error: "Insert failed" }, { status: 500 })
  }

  await admin
    .from("admin_email_threads")
    .update({
      last_message_at: new Date().toISOString(),
      has_unread_inbound: true,
    })
    .eq("id", threadId)

  return NextResponse.json({ ok: true })
}
