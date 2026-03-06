import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

/**
 * GET /api/forum/channels/[channelId]/messages
 * Query: before=<message_id> (cursor), limit=50
 * Returns messages newest-first; client can reverse for chronological display.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const beforeId = url.searchParams.get("before")?.trim()
  const limit = Math.min(MAX_LIMIT, parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)

  const admin = createAdminClient()

  const { data: channel } = await admin
    .from("forum_channels")
    .select("id, group_id")
    .eq("id", channelId)
    .single()
  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 })

  const { data: member } = await admin
    .from("forum_members")
    .select("id")
    .eq("group_id", (channel as { group_id: string }).group_id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })

  let query = admin
    .from("forum_messages")
    .select("id, channel_id, author_id, body, attachments, pinned, pin_order, created_at, edited_at, parent_id")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (beforeId) {
    const { data: cursorRow } = await admin
      .from("forum_messages")
      .select("created_at")
      .eq("id", beforeId)
      .single()
    if (cursorRow) {
      const cursorAt = (cursorRow as { created_at: string }).created_at
      query = query.lt("created_at", cursorAt)
    }
  }

  const { data: rows, error } = await query
  if (error) {
    console.error("[forum/messages GET]", error)
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
  }

  const messages = (rows ?? []).map((m) => ({
    id: (m as { id: string }).id,
    channel_id: (m as { channel_id: string }).channel_id,
    author_id: (m as { author_id: string }).author_id,
    body: (m as { body: string }).body,
    attachments: (m as { attachments?: unknown }).attachments ?? [],
    pinned: (m as { pinned?: boolean }).pinned ?? false,
    pin_order: (m as { pin_order?: number | null }).pin_order ?? null,
    created_at: (m as { created_at: string }).created_at,
    edited_at: (m as { edited_at?: string | null }).edited_at ?? null,
  }))

  return NextResponse.json({
    messages,
    hasMore: messages.length === limit,
  })
}

/**
 * POST /api/forum/channels/[channelId]/messages
 * Body: { body: string }
 * Inserts message and updates channel's group (no last_message on channel in schema; can add later).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { body?: string; parent_id?: string | null } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const text = typeof body.body === "string" ? body.body.trim() : ""
  if (!text) return NextResponse.json({ error: "body is required" }, { status: 400 })
  if (text.length > 2000) return NextResponse.json({ error: "body max 2000 characters" }, { status: 400 })
  const parentId = typeof body.parent_id === "string" && body.parent_id.trim() ? body.parent_id.trim() : null

  const admin = createAdminClient()

  const { data: channel } = await admin
    .from("forum_channels")
    .select("id, group_id, coach_only")
    .eq("id", channelId)
    .single()
  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 })

  const ch = channel as { group_id: string; coach_only: boolean }
  const { data: member } = await admin
    .from("forum_members")
    .select("id, role")
    .eq("group_id", ch.group_id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })

  if (ch.coach_only) {
    const role = (member as { role: string }).role
    if (role !== "admin" && role !== "coach") {
      return NextResponse.json({ error: "Only coaches can post in this channel" }, { status: 403 })
    }
  }

  const { data: inserted, error: insertError } = await admin
    .from("forum_messages")
    .insert({
      channel_id: channelId,
      author_id: user.id,
      body: text,
      attachments: [],
    })
    .select("id, channel_id, author_id, body, created_at, edited_at")
    .single()

  if (insertError) {
    console.error("[forum/messages POST]", insertError)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }

  return NextResponse.json({
    message: {
      id: (inserted as { id: string }).id,
      channel_id: (inserted as { channel_id: string }).channel_id,
      author_id: (inserted as { author_id: string }).author_id,
      body: (inserted as { body: string }).body,
      created_at: (inserted as { created_at: string }).created_at,
      edited_at: (inserted as { edited_at?: string | null }).edited_at ?? null,
      parent_id: (inserted as { parent_id?: string | null }).parent_id ?? null,
    },
  })
}
