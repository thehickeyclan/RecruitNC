import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

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
    return NextResponse.json(
      { error: "A group with that name already exists. Try a different name." },
      { status: 409 }
    )
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
