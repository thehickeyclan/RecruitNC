import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/forum/invite/[code]
 * Preview invite: returns { valid, group_name, group_id, expires_at, uses_left }.
 * No auth required.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  if (!code?.trim()) return NextResponse.json({ valid: false, error: "Missing code" }, { status: 400 })

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from("forum_invite_links")
    .select("id, group_id, expires_at, max_uses, use_count")
    .eq("code", code.trim())
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ valid: false, error: "Invalid or expired link" })
  }

  const r = row as { group_id: string; expires_at: string; max_uses: number; use_count: number }
  const now = new Date().toISOString()
  const expired = r.expires_at < now
  const usesLeft = Math.max(0, r.max_uses - r.use_count)
  const exhausted = usesLeft <= 0

  if (expired || exhausted) {
    return NextResponse.json({
      valid: false,
      error: expired ? "This invite link has expired." : "This invite link has reached its use limit.",
    })
  }

  const { data: group } = await admin
    .from("forum_groups")
    .select("id, name")
    .eq("id", r.group_id)
    .single()

  if (!group) {
    return NextResponse.json({ valid: false, error: "Group not found" })
  }

  return NextResponse.json({
    valid: true,
    group_id: (group as { id: string }).id,
    group_name: (group as { name: string }).name,
    expires_at: r.expires_at,
    uses_left: usesLeft,
  })
}

/**
 * POST /api/forum/invite/[code]/join
 * Join the group. Requires auth. Adds user to forum_members (role athlete), increments use_count.
 * Returns { group_id, channel_id } (first channel) for redirect.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  if (!code?.trim()) return NextResponse.json({ error: "Missing code" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Sign in to join this group" }, { status: 401 })

  const admin = createAdminClient()
  const { data: row, error: fetchError } = await admin
    .from("forum_invite_links")
    .select("id, group_id, expires_at, max_uses, use_count")
    .eq("code", code.trim())
    .maybeSingle()

  if (fetchError || !row) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 })
  }

  const r = row as { id: string; group_id: string; expires_at: string; max_uses: number; use_count: number }
  const now = new Date().toISOString()
  if (r.expires_at < now) return NextResponse.json({ error: "This invite link has expired." }, { status: 400 })
  if (r.use_count >= r.max_uses) return NextResponse.json({ error: "This invite link has reached its use limit." }, { status: 400 })

  const { data: existing } = await admin
    .from("forum_members")
    .select("id")
    .eq("group_id", r.group_id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing) {
    const { data: firstCh } = await admin
      .from("forum_channels")
      .select("id")
      .eq("group_id", r.group_id)
      .order("position", { ascending: true })
      .limit(1)
      .single()
    return NextResponse.json({
      group_id: r.group_id,
      channel_id: (firstCh as { id: string } | null)?.id ?? null,
      already_member: true,
    })
  }

  const { error: insertMemberError } = await admin.from("forum_members").insert({
    group_id: r.group_id,
    user_id: user.id,
    role: "athlete",
  })
  if (insertMemberError) {
    console.error("[forum/invite/join] insert member", insertMemberError)
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 })
  }

  await admin
    .from("forum_invite_links")
    .update({ use_count: r.use_count + 1 })
    .eq("id", r.id)

  const { data: firstCh } = await admin
    .from("forum_channels")
    .select("id")
    .eq("group_id", r.group_id)
    .order("position", { ascending: true })
    .limit(1)
    .single()

  return NextResponse.json({
    group_id: r.group_id,
    channel_id: (firstCh as { id: string } | null)?.id ?? null,
  })
}
