import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/** GET /api/forum/groups — returns all forum groups with channels. Use when sidebar returns no groups so the list still shows. */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: allGroupRows } = await admin.from("forum_groups").select("id, name, visibility, logo_url")
  const rows = allGroupRows ?? []
  const allIds = rows.map((r) => (r as { id: string }).id)
  if (allIds.length === 0) return NextResponse.json({ groups: [] })

  const { data: channelRows } = await admin
    .from("forum_channels")
    .select("id, group_id, name, type, coach_only")
    .in("group_id", allIds)
    .order("position", { ascending: true })

  const groups = rows.map((g) => {
    const row = g as { id: string; name: string; visibility: string; logo_url?: string | null }
    const channels = (channelRows ?? [])
      .filter((c) => (c as { group_id: string }).group_id === row.id)
      .map((c) => ({
        id: (c as { id: string }).id,
        name: (c as { name: string }).name,
        type: (c as { type: string }).type,
        coach_only: (c as { coach_only: boolean }).coach_only ?? false,
      }))
    return { id: row.id, name: row.name, visibility: row.visibility, logo_url: row.logo_url ?? null, channels }
  })
  groups.sort((a, b) => a.name.localeCompare(b.name))
  return NextResponse.json({ groups })
}

/**
 * POST /api/forum/groups
 * Body: { name: string, visibility?: 'public' | 'private' }
 * Creates a group with one default channel (general) — one place to chat, like GroupMe. Adds current user as admin.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { name?: string; visibility?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })
  const visibility = body.visibility === "public" ? "public" : "private"

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("forum_groups")
    .select("id")
    .ilike("name", name)
    .limit(1)
    .maybeSingle()
  if (existing) {
    const groupId = (existing as { id: string }).id
    const { data: firstChannel } = await admin
      .from("forum_channels")
      .select("id")
      .eq("group_id", groupId)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle()
    await admin.from("forum_members").upsert(
      { group_id: groupId, user_id: user.id, role: "admin" },
      { onConflict: "group_id,user_id", ignoreDuplicates: true }
    )
    return NextResponse.json({
      group: { id: groupId, name, visibility: "public" as const },
      channelId: firstChannel ? (firstChannel as { id: string }).id : null,
      existing: true,
    })
  }

  const { data: group, error: groupErr } = await admin
    .from("forum_groups")
    .insert({
      name,
      visibility,
      created_by: user.id,
    })
    .select("id, name, visibility")
    .single()

  if (groupErr || !group) {
    console.error("[forum/groups POST]", groupErr)
    const code = (groupErr as { code?: string })?.code
    const message = (groupErr as { message?: string })?.message ?? ""
    if (code === "23505" || message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "A group with that name already exists. Try a different name." }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to create group. Please try again." },
      { status: 500 }
    )
  }

  const groupId = (group as { id: string }).id

  const { data: channel, error: channelErr } = await admin
    .from("forum_channels")
    .insert({
      group_id: groupId,
      name: "general",
      type: "chat",
      position: 0,
      coach_only: false,
    })
    .select("id")
    .single()

  if (channelErr || !channel) {
    console.error("[forum/groups POST] channel insert", channelErr)
    return NextResponse.json({ error: "Group was created but the channel could not be set up. Please refresh and try opening the group." }, { status: 500 })
  }
  const channelId = (channel as { id: string }).id

  const { error: memberErr } = await admin.from("forum_members").insert({
    group_id: groupId,
    user_id: user.id,
    role: "admin",
  })

  if (memberErr) {
    console.error("[forum/groups POST] member insert", memberErr)
    return NextResponse.json({ error: "Group was created but adding you as a member failed. Please refresh the page and look for the group in the sidebar." }, { status: 500 })
  }

  return NextResponse.json({
    group: { id: groupId, name: (group as { name: string }).name, visibility: (group as { visibility: string }).visibility },
    channelId,
  })
}
