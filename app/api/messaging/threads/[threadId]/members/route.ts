import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMessagingUser } from "@/lib/messaging-auth"

export type ThreadMember = {
  user_id: string
  role: string
  display_name: string
}

/** GET: List thread members (name + role). Only for current user's threads. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 })

  const supabase = await createClient()
  const { data: myMember } = await supabase
    .from("messaging_thread_members")
    .select("thread_id, role")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single()

  if (!myMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const currentUserRole = (myMember as { role?: string }).role ?? "member"

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from("messaging_thread_members")
    .select("user_id, role")
    .eq("thread_id", threadId)
    .order("role", { ascending: true })
  // admins first (role 'admin' < 'member' alphabetically)

  if (error) {
    console.error("[messaging/threads/members GET]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const members = (rows ?? []) as { user_id: string; role: string }[]
  const userIds = members.map((m) => m.user_id)
  if (userIds.length === 0) {
    return NextResponse.json({ members: [] })
  }

  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, full_name, first_name, last_name")
    .in("user_id", userIds)

  const nameByUserId = new Map<string, string>()
  for (const p of profiles ?? []) {
    const r = p as { user_id: string; full_name?: string | null; first_name?: string | null; last_name?: string | null }
    const name = r.full_name?.trim() || [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || "Member"
    nameByUserId.set(r.user_id, name)
  }

  const result: ThreadMember[] = members.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    display_name: nameByUserId.get(m.user_id) ?? "Member",
  }))

  return NextResponse.json({ members: result, current_user_role: currentUserRole })
}

/** POST: Add a member to the thread. Any thread member can add. Sends "You've been added" email with link. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 })

  const supabase = await createClient()
  const { data: myMember } = await supabase
    .from("messaging_thread_members")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single()
  if (!myMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: { user_id?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const userIdToAdd = typeof body.user_id === "string" ? body.user_id.trim() : ""
  if (!userIdToAdd) return NextResponse.json({ error: "user_id is required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("messaging_thread_members")
    .select("user_id")
    .eq("thread_id", threadId)
    .eq("user_id", userIdToAdd)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: "User is already in the group" }, { status: 400 })

  const { data: thread } = await admin.from("messaging_threads").select("name, context_type, context_id").eq("id", threadId).single()
  const threadName = (thread as { name?: string } | null)?.name ?? "Group"
  const contextType = (thread as { context_type?: string | null } | null)?.context_type
  const contextId = (thread as { context_id?: string | null } | null)?.context_id

  const now = new Date().toISOString()
  const { error: insertErr } = await admin.from("messaging_thread_members").insert({
    thread_id: threadId,
    user_id: userIdToAdd,
    role: "member",
    notification_level: "all",
    joined_at: now,
  })
  if (insertErr) {
    console.error("[messaging/threads/members POST]", insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // If this is an event-linked thread, add the user to the event workspace so they see the hub.
  if (contextType === "event" && contextId) {
    try {
      await admin.from("event_workspace_members").upsert(
        {
          event_slug: contextId,
          user_id: userIdToAdd,
          source: "forum_invite",
          created_at: now,
        },
        { onConflict: "event_slug,user_id", ignoreDuplicates: true }
      )
    } catch (e) {
      if ((e as { code?: string })?.code !== "42P01") {
        console.warn("[messaging/threads/members] event_workspace_members upsert", (e as Error).message)
      }
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"
  const threadUrl = `${baseUrl.replace(/\/$/, "")}/messages/${threadId}`
  const { data: authUser } = await admin.auth.admin.getUserById(userIdToAdd)
  const email = authUser?.user?.email?.trim()
  if (email) {
    const { sendAddedToGroupEmail } = await import("@/lib/email")
    sendAddedToGroupEmail(email, threadName, threadUrl).catch((e) => console.error("[RecruitNC] add-member email:", e))
  }

  return NextResponse.json({ ok: true, added: userIdToAdd })
}
