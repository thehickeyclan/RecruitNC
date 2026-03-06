import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyForumGroupAdded } from "@/lib/forum-notifications"

export const dynamic = "force-dynamic"

/**
 * GET /api/forum/groups/[groupId]/members
 * List members (user_id, role, display_name, email). Caller must be a member.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: myMember } = await admin
    .from("forum_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!myMember) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })

  const { data: rows } = await admin
    .from("forum_members")
    .select("user_id, role, joined_at")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true })

  const userIds = [...new Set((rows ?? []).map((r) => (r as { user_id: string }).user_id))]
  if (userIds.length === 0) {
    return NextResponse.json({ members: [] })
  }

  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, email, full_name, first_name, last_name, headshot_url")
    .in("user_id", userIds)

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      (p as { user_id: string }).user_id,
      p as { user_id: string; email?: string | null; full_name?: string | null; first_name?: string | null; last_name?: string | null; headshot_url?: string | null },
    ])
  )

  const members = (rows ?? []).map((r) => {
    const row = r as { user_id: string; role: string; joined_at: string }
    const profile = profileMap.get(row.user_id)
    const displayName =
      profile?.full_name?.trim() ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      profile?.email ||
      "Member"
    return {
      user_id: row.user_id,
      role: row.role,
      joined_at: row.joined_at,
      display_name: displayName,
      email: profile?.email ?? null,
      headshot_url: profile?.headshot_url ?? null,
    }
  })

  return NextResponse.json({ members })
}

/**
 * POST /api/forum/groups/[groupId]/members
 * Add a member. Body: { user_id: string, role?: 'athlete'|'parent'|'coach'|'admin' }.
 * Caller must be admin or coach.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { user_id?: string; role?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const userIdToAdd = typeof body.user_id === "string" ? body.user_id.trim() : ""
  if (!userIdToAdd) return NextResponse.json({ error: "user_id is required" }, { status: 400 })
  if (userIdToAdd === user.id) return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 })

  const role = ["admin", "coach", "athlete", "parent"].includes(body.role ?? "") ? body.role : "athlete"

  const admin = createAdminClient()
  const { data: myMember } = await admin
    .from("forum_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle()
  const myRole = (myMember as { role?: string } | null)?.role
  if (!myMember || (myRole !== "admin" && myRole !== "coach")) {
    return NextResponse.json({ error: "Only admins and coaches can add members" }, { status: 403 })
  }

  const { data: existing } = await admin
    .from("forum_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userIdToAdd)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: "User is already a member" }, { status: 409 })

  const { data: profile } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userIdToAdd)
    .maybeSingle()
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const { error: insertError } = await admin.from("forum_members").insert({
    group_id: groupId,
    user_id: userIdToAdd,
    role: role as "athlete" | "parent" | "coach" | "admin",
  })
  if (insertError) {
    console.error("[forum/members POST]", insertError)
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 })
  }

  notifyForumGroupAdded(admin, userIdToAdd, groupId).catch((e) =>
    console.error("[forum/members POST] notifyForumGroupAdded:", e)
  )

  return NextResponse.json({ added: true, user_id: userIdToAdd, role })
}
