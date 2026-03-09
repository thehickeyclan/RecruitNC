import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { markdownToHtml, toPlainText } from "@/lib/blast-format"
import { sendAdminBlastEmail } from "@/lib/email"
import { sendSms, toE164 } from "@/lib/sms"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type RecipientRow = { user_id: string; email: string | null; display_name: string | null; cell_phone: string | null }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized", user: null }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required", user: null }
  return { ok: true as const, user }
}

async function getRecipients(admin: ReturnType<typeof createAdminClient>, profileFilter: string | null, groupFilter: string | null, limit: number): Promise<RecipientRow[]> {
  let userIds = new Set<string>()

  if (groupFilter) {
    const groupIds = new Set<string>()
    if (groupFilter === "blue") {
      const { data: blueRows } = await admin.from("blue_memberships").select("payer_user_id").eq("status", "active")
      for (const r of blueRows ?? []) {
        const uid = (r as { payer_user_id: string | null }).payer_user_id
        if (uid) groupIds.add(uid)
      }
    } else if (groupFilter.startsWith("event:")) {
      const eventSlug = groupFilter.slice("event:".length)
      const { data: workspaceRows } = await admin.from("event_workspace_members").select("user_id").eq("event_slug", eventSlug)
      for (const r of workspaceRows ?? []) groupIds.add((r as { user_id: string }).user_id)
      const { data: regs } = await admin
        .from("national_team_event_registrations")
        .select("parent_email, parent_user_id")
        .eq("event_slug", eventSlug)
        .eq("status", "paid")
      for (const r of regs ?? []) {
        const row = r as { parent_user_id: string | null; parent_email: string | null }
        if (row.parent_user_id) groupIds.add(row.parent_user_id)
        else if (row.parent_email?.trim()) {
          const { data: up } = await admin.from("user_profiles").select("user_id").ilike("email", row.parent_email.trim()).limit(1).maybeSingle()
          if (up?.user_id) groupIds.add((up as { user_id: string }).user_id)
        }
      }
    } else if (groupFilter.startsWith("forum:")) {
      const groupId = groupFilter.slice("forum:".length)
      const { data: memberRows } = await admin.from("forum_members").select("user_id").eq("group_id", groupId)
      for (const r of memberRows ?? []) groupIds.add((r as { user_id: string }).user_id)
    }
    userIds = groupIds
  }

  const byRole = profileFilter && profileFilter.toLowerCase() !== "all"
  const { data: profileRows, error: profileError } = byRole
    ? await admin.from("user_profiles").select("user_id, email, full_name, cell_phone").eq("role", profileFilter)
    : await admin.from("user_profiles").select("user_id, email, full_name, cell_phone")
  if (profileError) return []

  const profileUserIds = new Set((profileRows ?? []).map((r: { user_id: string }) => r.user_id))
  if (userIds.size > 0) userIds = new Set([...userIds].filter((id) => profileUserIds.has(id)))
  else userIds = profileUserIds

  const idList = [...userIds].slice(0, limit)
  if (idList.length === 0) return []

  const { data: rows } = await admin.from("user_profiles").select("user_id, email, full_name, cell_phone").in("user_id", idList)
  const byId = new Map<string, RecipientRow>()
  for (const r of rows ?? []) {
    const row = r as { user_id: string; email: string | null; full_name: string | null; cell_phone: string | null }
    byId.set(row.user_id, { user_id: row.user_id, email: row.email ?? null, display_name: row.full_name ?? null, cell_phone: row.cell_phone ?? null })
  }
  return idList.map((id) => byId.get(id) ?? { user_id: id, email: null, display_name: null, cell_phone: null })
}

/** POST: Send blast. Body: { profile?, group?, subject?, body, channels: { inApp?: boolean, email?: boolean, sms?: boolean } } */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const adminUserId = (auth as { user: { id: string } }).user.id

  let body: { profile?: string; group?: string; subject?: string; body?: string; channels?: { inApp?: boolean; email?: boolean; sms?: boolean } } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const profile = typeof body.profile === "string" ? body.profile.trim() || null : null
  const group = typeof body.group === "string" ? body.group.trim() || null : null
  const subject = typeof body.subject === "string" ? body.subject.trim() || "Update from RecruitNC" : "Update from RecruitNC"
  const rawBody = typeof body.body === "string" ? body.body.trim() : ""
  const channels = body.channels && typeof body.channels === "object"
    ? { inApp: !!body.channels.inApp, email: !!body.channels.email, sms: !!body.channels.sms }
    : { inApp: false, email: false, sms: false }

  if (!rawBody) return NextResponse.json({ error: "Message body is required" }, { status: 400 })
  if (!channels.inApp && !channels.email && !channels.sms) {
    return NextResponse.json({ error: "Select at least one channel (In-app, Email, or SMS)" }, { status: 400 })
  }

  const admin = createAdminClient()
  const recipients = await getRecipients(admin, profile, group, 5000)
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients match the selected audience" }, { status: 400 })
  }

  const htmlBody = markdownToHtml(rawBody)
  const plainBody = toPlainText(rawBody)
  const smsBody = plainBody.length > 1500 ? plainBody.slice(0, 1497) + "…" : plainBody

  const result: { inApp?: { sent: boolean; threadId?: string; error?: string }; email: { sent: number; failed: number }; sms: { sent: number; failed: number } } = {
    email: { sent: 0, failed: 0 },
    sms: { sent: 0, failed: 0 },
  }

  if (channels.inApp && group) {
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
      result.inApp = { sent: false, error: "No thread found for this group (event or Blue). In-app only works for event hubs or Blue." }
    }
  }

  if (channels.email) {
    for (const r of recipients) {
      if (!r.email?.trim()) continue
      const ok = await sendAdminBlastEmail(r.email.trim(), subject, htmlBody)
      if (ok.success) result.email.sent++
      else result.email.failed++
    }
  }

  if (channels.sms) {
    for (const r of recipients) {
      const e164 = toE164(r.cell_phone)
      if (!e164) continue
      const ok = await sendSms(e164, smsBody)
      if (ok) result.sms.sent++
      else result.sms.failed++
    }
  }

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

  return NextResponse.json({
    ok: true,
    recipientCount: recipients.length,
    result,
  })
}
