import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMessagingUser } from "@/lib/messaging-auth"
import { sendSms, toE164 } from "@/lib/sms"
import { sendNewMessageNotificationEmail } from "@/lib/email"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_BODY_LENGTH = 2000
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30

const recentSendsByUser = new Map<string, number[]>()
function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  let times = recentSendsByUser.get(userId) ?? []
  times = times.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (times.length >= RATE_LIMIT_MAX) return false
  times.push(now)
  recentSendsByUser.set(userId, times)
  return true
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 })

  const supabase = await createClient()
  const { data: member } = await supabase
    .from("messaging_thread_members")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single()
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const searchParams = request.nextUrl.searchParams
  const beforeId = searchParams.get("before")
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT))

  let query = supabase
    .from("messaging_messages")
    .select("id, thread_id, sender_id, type, body, created_at, edited_at")
    .eq("thread_id", threadId)

  if (beforeId) {
    const { data: cursorRow } = await supabase
      .from("messaging_messages")
      .select("created_at")
      .eq("id", beforeId)
      .eq("thread_id", threadId)
      .single()
    if (cursorRow) query = query.lt("created_at", cursorRow.created_at)
  }

  const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(limit + 1)

  if (error) {
    console.error("[messaging/messages GET]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rawMessages = (rows ?? []).slice(0, limit).reverse() as Array<{
    id: string
    thread_id: string
    sender_id: string
    type: string
    body: string
    created_at: string
    edited_at?: string | null
  }>
  const hasMore = (rows ?? []).length > limit

  // Attach sender display names (GroupMe-style: show who wrote each message)
  const senderIds = [...new Set(rawMessages.map((m) => m.sender_id))]
  const nameBySenderId = new Map<string, string>()
  if (senderIds.length > 0) {
    const admin = createAdminClient()
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id, full_name, first_name, last_name")
      .in("user_id", senderIds)
    for (const p of profiles ?? []) {
      const r = p as { user_id: string; full_name?: string | null; first_name?: string | null; last_name?: string | null }
      const name = r.full_name?.trim() || [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || "Member"
      nameBySenderId.set(r.user_id, name)
    }
  }

  // Attachments for these messages (RLS: user is thread member so can select)
  const messageIds = rawMessages.map((m) => m.id)
  const attachmentsByMessageId = new Map<string, { id: string; file_url: string; content_type?: string | null; filename?: string | null }[]>()
  if (messageIds.length > 0) {
    const { data: attachmentRows } = await supabase
      .from("messaging_attachments")
      .select("id, message_id, file_url, content_type, filename")
      .in("message_id", messageIds)
    for (const a of attachmentRows ?? []) {
      const row = a as { id: string; message_id: string; file_url: string; content_type?: string | null; filename?: string | null }
      const list = attachmentsByMessageId.get(row.message_id) ?? []
      list.push({ id: row.id, file_url: row.file_url, content_type: row.content_type, filename: row.filename })
      attachmentsByMessageId.set(row.message_id, list)
    }
  }

  const messages = rawMessages.map((m) => ({
    ...m,
    sender_name: nameBySenderId.get(m.sender_id) ?? null,
    attachments: attachmentsByMessageId.get(m.id) ?? [],
  }))

  return NextResponse.json({
    messages,
    hasMore,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: "Too many messages. Try again in a minute." }, { status: 429 })
  }

  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 })

  let body: { body?: string; type?: string; attachment_urls?: { url: string; content_type?: string; filename?: string }[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const text = typeof body.body === "string" ? body.body.trim() : ""
  const attachmentUrls = Array.isArray(body.attachment_urls)
    ? body.attachment_urls.filter((a) => a && typeof a.url === "string" && a.url.trim().length > 0)
    : []
  const hasContent = text.length > 0 || attachmentUrls.length > 0
  if (!hasContent) return NextResponse.json({ error: "Message must have text or at least one attachment" }, { status: 400 })
  if (text.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "Body must be at most 2000 characters" }, { status: 400 })
  }

  const type = body.type === "announcement" ? "announcement" : "message"
  const supabase = await createClient()

  const { data: member } = await supabase
    .from("messaging_thread_members")
    .select("thread_id, role")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single()
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (type === "announcement" && member.role !== "admin") {
    return NextResponse.json({ error: "Only admins can send announcements" }, { status: 403 })
  }

  const bodyText = text.length > 0 ? text : " "
  const { data: message, error: insertError } = await supabase
    .from("messaging_messages")
    .insert({ thread_id: threadId, sender_id: user.id, type, body: bodyText })
    .select("id, thread_id, sender_id, type, body, created_at, edited_at")
    .single()

  if (insertError) {
    console.error("[messaging/messages POST]", insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  if (attachmentUrls.length > 0 && message) {
    const attachmentRows = attachmentUrls.map((a) => ({
      message_id: message.id,
      file_url: a.url.trim(),
      content_type: typeof a.content_type === "string" ? a.content_type : null,
      filename: typeof a.filename === "string" ? a.filename : null,
    }))
    const { error: attachError } = await supabase.from("messaging_attachments").insert(attachmentRows)
    if (attachError) console.error("[messaging/messages POST] attachments insert:", attachError)
  }

  await supabase
    .from("messaging_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", threadId)

  // Notify thread members who opted into SMS (fire-and-forget)
  notifyThreadMembersBySms(threadId, text, user.id).catch((err) =>
    console.error("[messaging/messages] SMS notify error:", err)
  )

  return NextResponse.json(message)
}

const PREVIEW_LEN = 60
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"

async function notifyThreadMembersBySms(threadId: string, messageBody: string, senderId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: thread } = await admin.from("messaging_threads").select("name").eq("id", threadId).single()
  const threadName = (thread as { name?: string } | null)?.name ?? "RecruitNC"
  const { data: members } = await admin
    .from("messaging_thread_members")
    .select("user_id")
    .eq("thread_id", threadId)
    .neq("user_id", senderId)
  const userIds = (members ?? []).map((m) => (m as { user_id: string }).user_id)
  if (userIds.length === 0) return
  const preview = messageBody.slice(0, PREVIEW_LEN) + (messageBody.length > PREVIEW_LEN ? "…" : "")
  const inboxUrl = `${BASE_URL.replace(/\/$/, "")}/messages`

  // SMS: users with notify_sms_new_messages and cell_phone
  const { data: smsProfiles } = await admin
    .from("user_profiles")
    .select("user_id, cell_phone")
    .in("user_id", userIds)
    .eq("notify_sms_new_messages", true)
    .not("cell_phone", "is", null)
  const smsBody = `RecruitNC: New message in ${threadName}: ${preview}`
  for (const row of smsProfiles ?? []) {
    const r = row as { user_id: string; cell_phone: string }
    const e164 = toE164(r.cell_phone)
    if (e164) await sendSms(e164, smsBody)
  }

  // Email: users with notify_email_new_messages; get email from auth
  const { data: emailProfiles } = await admin
    .from("user_profiles")
    .select("user_id")
    .in("user_id", userIds)
    .eq("notify_email_new_messages", true)
  for (const row of emailProfiles ?? []) {
    const uid = (row as { user_id: string }).user_id
    const { data: authUser } = await admin.auth.admin.getUserById(uid)
    const email = authUser?.user?.email
    if (email?.trim()) {
      await sendNewMessageNotificationEmail(email.trim(), threadName, preview, inboxUrl)
    }
  }
}
