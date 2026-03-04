import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMessagingUser } from "@/lib/messaging-auth"

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
    .select("id, thread_id, sender_id, type, body, created_at")
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

  const messages = (rows ?? []).slice(0, limit)
  const hasMore = (rows ?? []).length > limit
  return NextResponse.json({
    messages: messages.reverse(),
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

  let body: { body?: string; type?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const text = typeof body.body === "string" ? body.body.trim() : ""
  if (text.length === 0 || text.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "Body must be 1–2000 characters" }, { status: 400 })
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

  const { data: message, error: insertError } = await supabase
    .from("messaging_messages")
    .insert({ thread_id: threadId, sender_id: user.id, type, body: text })
    .select("id, thread_id, sender_id, type, body, created_at")
    .single()

  if (insertError) {
    console.error("[messaging/messages POST]", insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await supabase
    .from("messaging_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", threadId)

  return NextResponse.json(message)
}
