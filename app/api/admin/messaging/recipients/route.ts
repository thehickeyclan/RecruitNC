import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export type RecipientRow = { user_id: string; email: string | null; display_name: string | null; cell_phone: string | null }
export type RecipientsResponse = { count: number; recipients: RecipientRow[]; error?: string }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/** GET: Get recipient user_ids (and contact info) for audience. Query: profile=role | group=blue | group=event:slug | group=forum:groupId. Limit 2000. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = request.nextUrl
  const profileFilter = searchParams.get("profile")?.trim() || null
  const groupFilter = searchParams.get("group")?.trim() || null
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "2000", 10) || 2000, 5000)

  const admin = createAdminClient()

  let userIds = new Set<string>()

  // Resolve group first so we can intersect with profile
  if (groupFilter) {
    const groupIds = new Set<string>()
    if (groupFilter === "blue") {
      const { data: blueRows } = await admin
        .from("blue_memberships")
        .select("payer_user_id")
        .eq("status", "active")
      for (const r of blueRows ?? []) {
        const uid = (r as { payer_user_id: string | null }).payer_user_id
        if (uid) groupIds.add(uid)
      }
    } else if (groupFilter.startsWith("event:")) {
      const eventSlug = groupFilter.slice("event:".length)
      const { data: workspaceRows } = await admin
        .from("event_workspace_members")
        .select("user_id")
        .eq("event_slug", eventSlug)
      for (const r of workspaceRows ?? []) {
        groupIds.add((r as { user_id: string }).user_id)
      }
      const { data: regs } = await admin
        .from("national_team_event_registrations")
        .select("parent_email, parent_user_id")
        .eq("event_slug", eventSlug)
        .eq("status", "paid")
      const emailsToResolve = new Set<string>()
      for (const r of regs ?? []) {
        const row = r as { parent_user_id: string | null; parent_email: string | null }
        if (row.parent_user_id) groupIds.add(row.parent_user_id)
        else if (row.parent_email?.trim()) emailsToResolve.add(row.parent_email.trim().toLowerCase())
      }
      for (const email of emailsToResolve) {
        const { data: up } = await admin.from("user_profiles").select("user_id").ilike("email", email).limit(1).maybeSingle()
        if (up?.user_id) groupIds.add((up as { user_id: string }).user_id)
      }
    } else if (groupFilter.startsWith("forum:")) {
      const groupId = groupFilter.slice("forum:".length)
      const { data: memberRows } = await admin.from("forum_members").select("user_id").eq("group_id", groupId)
      for (const r of memberRows ?? []) {
        groupIds.add((r as { user_id: string }).user_id)
      }
    }

    userIds = groupIds
  }

  // Profile filter: either start from all profiles or intersect with current set
  const byRole = profileFilter && profileFilter.toLowerCase() !== "all"
  const { data: profileRows, error: profileError } = byRole
    ? await admin.from("user_profiles").select("user_id, email, full_name, cell_phone").eq("role", profileFilter)
    : await admin.from("user_profiles").select("user_id, email, full_name, cell_phone")

  if (profileError) {
    return NextResponse.json({ count: 0, recipients: [], error: profileError.message }, { status: 200 })
  }

  const profileUserIds = new Set((profileRows ?? []).map((r: { user_id: string }) => r.user_id))
  if (userIds.size > 0) {
    userIds = new Set([...userIds].filter((id) => profileUserIds.has(id)))
  } else {
    userIds = profileUserIds
  }

  const idList = [...userIds].slice(0, limit)
  if (idList.length === 0) {
    return NextResponse.json({ count: 0, recipients: [] } as RecipientsResponse)
  }

  const { data: rows } = await admin
    .from("user_profiles")
    .select("user_id, email, full_name, cell_phone")
    .in("user_id", idList)

  const byId = new Map<string, RecipientRow>()
  for (const r of rows ?? []) {
    const row = r as { user_id: string; email: string | null; full_name: string | null; cell_phone: string | null }
    byId.set(row.user_id, {
      user_id: row.user_id,
      email: row.email ?? null,
      display_name: row.full_name ?? null,
      cell_phone: row.cell_phone ?? null,
    })
  }
  const recipients: RecipientRow[] = idList.map((id) => byId.get(id) ?? { user_id: id, email: null, display_name: null, cell_phone: null })

  return NextResponse.json({
    count: recipients.length,
    recipients,
    totalMatching: userIds.size,
  } as RecipientsResponse & { totalMatching?: number })
}
