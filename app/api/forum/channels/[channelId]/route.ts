import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/forum/channels/[channelId]
 * Returns channel name and type (for header). User must be member of the group.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: channel, error } = await admin
    .from("forum_channels")
    .select("id, group_id, name, type, coach_only")
    .eq("id", channelId)
    .single()

  if (error || !channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 })

  const groupId = (channel as { group_id: string }).group_id
  const { data: member } = await admin
    .from("forum_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 })

  const { data: group } = await admin
    .from("forum_groups")
    .select("name, logo_url")
    .eq("id", groupId)
    .single()

  const g = group as { name: string; logo_url?: string | null } | null
  return NextResponse.json({
    id: (channel as { id: string }).id,
    name: (channel as { name: string }).name,
    group_id: groupId,
    group_name: g?.name ?? null,
    group_logo_url: g?.logo_url ?? null,
    type: (channel as { type: string }).type,
    coach_only: (channel as { coach_only: boolean }).coach_only,
  })
}
