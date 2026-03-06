import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * POST /api/forum/groups
 * Body: { name: string, visibility?: 'public' | 'private' }
 * Creates a group with 3 default channels (announcements, general, logistics) and adds current user as admin.
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
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 })
  }

  const groupId = (group as { id: string }).id

  const defaultChannels = [
    { name: "announcements", type: "announcement", position: 0 },
    { name: "general", type: "chat", position: 1 },
    { name: "logistics", type: "forum", position: 2 },
  ]

  for (const ch of defaultChannels) {
    await admin.from("forum_channels").insert({
      group_id: groupId,
      name: ch.name,
      type: ch.type,
      position: ch.position,
      coach_only: ch.type === "announcement",
    })
  }

  await admin.from("forum_members").insert({
    group_id: groupId,
    user_id: user.id,
    role: "admin",
  })

  return NextResponse.json({
    group: { id: groupId, name: (group as { name: string }).name, visibility: (group as { visibility: string }).visibility },
  })
}
