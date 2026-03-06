import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const MIN_QUERY_LENGTH = 2
const MAX_RESULTS = 20

/** GET: Search RecruitNC users to add to the workspace (not already members). Caller must be a workspace member. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { eventSlug } = await params
  if (!eventSlug?.trim()) {
    return NextResponse.json({ error: "eventSlug is required" }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") ?? "").trim()
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ users: [] })
  }

  const admin = createAdminClient()

  // Caller must be a workspace member (same check as POST add member).
  const { data: regs } = await admin
    .from("national_team_event_registrations")
    .select("parent_email")
    .eq("event_slug", eventSlug)
    .eq("status", "paid")
  const parentEmails = new Set(
    (regs ?? []).map((r) => (r as { parent_email?: string }).parent_email?.toLowerCase()).filter(Boolean)
  )
  let callerIsMember = parentEmails.has(user.email!.toLowerCase())
  if (!callerIsMember) {
    try {
      const { data: wm } = await admin
        .from("event_workspace_members")
        .select("user_id")
        .eq("event_slug", eventSlug)
        .eq("user_id", user.id)
        .maybeSingle()
      callerIsMember = !!wm
    } catch {
      // table may not exist
    }
  }
  if (!callerIsMember) {
    return NextResponse.json({ error: "You must be a member of this event workspace to search" }, { status: 403 })
  }

  // Existing workspace members: event_workspace_members + resolved parent_user_id from paid regs.
  const workspaceUserIds = new Set<string>()
  try {
    const { data: wmRows } = await admin
      .from("event_workspace_members")
      .select("user_id")
      .eq("event_slug", eventSlug)
    ;(wmRows ?? []).forEach((r) => workspaceUserIds.add((r as { user_id: string }).user_id))
  } catch {
    // table may not exist
  }
  for (const email of parentEmails) {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("user_id")
      .ilike("email", email)
      .maybeSingle()
    const uid = (profile as { user_id?: string } | null)?.user_id
    if (uid) workspaceUserIds.add(uid)
  }

  const pattern = `%${q}%`
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, email, full_name, first_name, last_name")
    .or(`email.ilike.${pattern},full_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
    .limit(MAX_RESULTS * 2)

  const filtered = (profiles ?? []).filter(
    (p: { user_id: string }) => !workspaceUserIds.has(p.user_id)
  ).slice(0, MAX_RESULTS)

  const list = filtered.map(
    (p: { user_id: string; email?: string | null; full_name?: string | null; first_name?: string | null; last_name?: string | null }) => ({
      user_id: p.user_id,
      email: p.email ?? null,
      display_name: p.full_name?.trim() || [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.email || "Member",
    })
  )
  return NextResponse.json({ users: list })
}
