import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyForumGroupAdded } from "@/lib/forum-notifications"

export const dynamic = "force-dynamic"

/**
 * POST /api/forum/groups/[groupId]/sync-event
 * Body: { event_slug: string } (e.g. "nhsca-duals-2026").
 * Adds all paid registrations for that event to the group (as athlete).
 * Resolves parent_email to user_id via user_profiles. Only adds users who have a RecruitNC account.
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

  let body: { event_slug?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const eventSlug = typeof body.event_slug === "string" ? body.event_slug.trim() : ""
  if (!eventSlug) return NextResponse.json({ error: "event_slug is required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: myMember } = await admin
    .from("forum_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!myMember || (myMember as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Only group admins can sync from event" }, { status: 403 })
  }

  const { data: regs } = await admin
    .from("national_team_event_registrations")
    .select("parent_email")
    .eq("event_slug", eventSlug)
    .eq("status", "paid")

  const emailsLower = [...new Set((regs ?? []).map((r) => (r as { parent_email?: string }).parent_email?.toLowerCase().trim()).filter(Boolean))]
  if (emailsLower.length === 0) {
    return NextResponse.json({ added: 0, skipped: 0, message: "No paid registrations found for this event." })
  }

  const { data: allProfiles } = await admin
    .from("user_profiles")
    .select("user_id, email")
  const emailLowerSet = new Set(emailsLower)
  const profiles = (allProfiles ?? []).filter(
    (p) => (p as { email?: string | null }).email && emailLowerSet.has((p as { email: string }).email.toLowerCase().trim())
  )

  const userIdsToAdd = profiles
    .map((p) => (p as { user_id: string }).user_id)
    .filter((id) => id !== user.id)

  const { data: existing } = await admin
    .from("forum_members")
    .select("user_id")
    .eq("group_id", groupId)
    .in("user_id", userIdsToAdd)
  const existingSet = new Set((existing ?? []).map((r) => (r as { user_id: string }).user_id))
  const toInsert = userIdsToAdd.filter((id) => !existingSet.has(id))

  if (toInsert.length === 0) {
    return NextResponse.json({
      added: 0,
      skipped: emailsLower.length,
      message: "All registrants with RecruitNC accounts are already in the group.",
    })
  }

  const rows = toInsert.map((user_id) => ({
    group_id: groupId,
    user_id,
    role: "athlete" as const,
  }))
  const { error: insertError } = await admin.from("forum_members").insert(rows)
  if (insertError) {
    console.error("[forum/sync-event]", insertError)
    return NextResponse.json({ error: "Failed to add some members" }, { status: 500 })
  }

  for (const uid of toInsert) {
    notifyForumGroupAdded(admin, uid, groupId).catch((e) =>
      console.error("[forum/sync-event] notifyForumGroupAdded:", e)
    )
  }

  return NextResponse.json({
    added: toInsert.length,
    skipped: emailsLower.length - userIdsToAdd.length,
    message: `${toInsert.length} member(s) added. ${emailsLower.length - userIdsToAdd.length} registrant(s) don't have a RecruitNC account yet — share an invite link so they can sign up and join.`,
  })
}
