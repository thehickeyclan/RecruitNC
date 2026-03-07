import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { nanoid } from "nanoid"

export const dynamic = "force-dynamic"

const DEFAULT_EXPIRES_DAYS = 7
const DEFAULT_MAX_USES = 50

/**
 * POST /api/forum/groups/[groupId]/invite-links
 * Create an invite link for the group. Caller must be group admin.
 * Returns { code, url, expires_at, max_uses }.
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

  const admin = createAdminClient()
  const { data: member } = await admin
    .from("forum_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle()
  const role = (member as { role?: string } | null)?.role
  if (!member || role !== "admin") {
    return NextResponse.json({ error: "Only group admins can create invite links" }, { status: 403 })
  }

  let body: { expires_days?: number; max_uses?: number } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const expiresDays = Math.min(30, Math.max(1, Number(body.expires_days) || DEFAULT_EXPIRES_DAYS))
  const maxUses = Math.min(500, Math.max(1, Number(body.max_uses) || DEFAULT_MAX_USES))

  const code = nanoid(10)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresDays)

  const { data: link, error: insertError } = await admin
    .from("forum_invite_links")
    .insert({
      group_id: groupId,
      created_by: user.id,
      code,
      expires_at: expiresAt.toISOString(),
      max_uses,
    })
    .select("id, code, expires_at, max_uses")
    .single()

  if (insertError || !link) {
    console.error("[forum/invite-links POST]", insertError)
    return NextResponse.json({ error: "Failed to create invite link" }, { status: 500 })
  }

  const base = typeof request.nextUrl?.origin === "string" ? request.nextUrl.origin : ""
  const url = `${base.replace(/\/$/, "")}/invite/${code}`

  return NextResponse.json({
    code: (link as { code: string }).code,
    url,
    expires_at: (link as { expires_at: string }).expires_at,
    max_uses: (link as { max_uses: number }).max_uses,
  })
}
