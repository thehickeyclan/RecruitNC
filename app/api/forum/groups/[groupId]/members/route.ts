import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyForumGroupAdded } from "@/lib/forum-notifications"
import { getEventSlugFromGroupName, getEventName } from "@/lib/national-team-events"

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
 * Caller must be group admin.
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

  const admin = createAdminClient()
  const { data: myMember } = await admin
    .from("forum_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle()
  const myRole = (myMember as { role?: string } | null)?.role
  if (!myMember || myRole !== "admin") {
    return NextResponse.json({ error: "Only group admins can add members" }, { status: 403 })
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
    .select("user_id, email, cell_phone, role")
    .eq("user_id", userIdToAdd)
    .maybeSingle()
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Use body.role if valid; else use the user's profile role (so "parent" in Admin → Users shows as parent in the group)
  const profileRole = (profile as { role?: string | null }).role
  const validRoles = ["admin", "coach", "athlete", "parent"]
  const role = validRoles.includes(body.role ?? "")
    ? body.role!
    : validRoles.includes(profileRole ?? "")
      ? profileRole!
      : "parent"

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

  // If this group is for a known event hub (e.g. "NHSCA Duals 2026"), send email + SMS with hub link.
  const { data: group } = await admin.from("forum_groups").select("name").eq("id", groupId).maybeSingle()
  const groupName = (group as { name?: string } | null)?.name ?? ""
  const eventSlug = getEventSlugFromGroupName(groupName)
  if (eventSlug) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.ncwrestlingunited.com"
    const hubUrl = `${baseUrl.replace(/\/$/, "")}/national-team/hub`
    const eventName = getEventName(eventSlug)
    const email = (profile as { email?: string | null }).email ?? ""
    const cellPhone = ((profile as { cell_phone?: string | null }).cell_phone ?? "").trim() || null
    console.log("[RecruitNC] forum add-member hub notify", { groupName, eventSlug, hasEmail: !!email, hasCell: !!cellPhone })
    if (email) {
      try {
        const { sendAddedToHubEmail } = await import("@/lib/email")
        await sendAddedToHubEmail(email, eventName, hubUrl)
      } catch (e) {
        console.error("[forum/members POST] sendAddedToHubEmail:", e)
      }
    }
    if (cellPhone) {
      try {
        const { sendSms, toE164 } = await import("@/lib/sms")
        const e164 = toE164(cellPhone)
        if (e164) {
          const sent = await sendSms(e164, `RecruitNC: You've been added to ${eventName}. View hub: ${hubUrl}`)
          console.log("[RecruitNC] forum add-member SMS", sent ? "sent" : "skipped (Twilio not configured or error)")
        } else {
          console.log("[RecruitNC] forum add-member SMS skipped (phone could not be parsed to E.164)")
        }
      } catch (e) {
        console.error("[forum/members POST] hub SMS:", e)
      }
    } else {
      console.log("[RecruitNC] forum add-member SMS skipped (no cell_phone on profile)")
    }
  } else {
    console.log("[RecruitNC] forum add-member no hub notify (group name not a known event)", { groupName })
  }

  return NextResponse.json({ added: true, user_id: userIdToAdd, role })
}

/**
 * DELETE /api/forum/groups/[groupId]/members
 * Remove a member. Body: { user_id: string } or query user_id=.
 * Caller must be group admin. Cannot remove the last admin.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let userIdToRemove: string
  try {
    const body = await request.json().catch(() => ({}))
    const q = request.nextUrl.searchParams.get("user_id")
    userIdToRemove = (typeof body.user_id === "string" ? body.user_id : q ?? "").trim()
  } catch {
    userIdToRemove = request.nextUrl.searchParams.get("user_id") ?? ""
  }
  if (!userIdToRemove) return NextResponse.json({ error: "user_id is required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: myMember } = await admin
    .from("forum_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle()
  const myRole = (myMember as { role?: string } | null)?.role
  if (!myMember || myRole !== "admin") {
    return NextResponse.json({ error: "Only group admins can remove members" }, { status: 403 })
  }

  if (userIdToRemove === user.id) {
    return NextResponse.json({ error: "To leave the group, use Leave group (or remove yourself from the members list)." }, { status: 400 })
  }

  const { data: targetMember } = await admin
    .from("forum_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userIdToRemove)
    .maybeSingle()
  if (!targetMember) return NextResponse.json({ error: "User is not a member" }, { status: 404 })

  const { data: adminCount } = await admin
    .from("forum_members")
    .select("user_id")
    .eq("group_id", groupId)
    .in("role", ["admin", "coach"])
  const numAdmins = (adminCount ?? []).length
  if ((targetMember as { role: string }).role === "admin" && numAdmins <= 1) {
    return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 })
  }

  const { error: deleteError } = await admin
    .from("forum_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userIdToRemove)
  if (deleteError) {
    console.error("[forum/members DELETE]", deleteError)
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
  }
  return NextResponse.json({ removed: true, user_id: userIdToRemove })
}
