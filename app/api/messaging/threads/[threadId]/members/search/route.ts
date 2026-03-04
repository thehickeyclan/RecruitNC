import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMessagingUser } from "@/lib/messaging-auth"

const MIN_QUERY_LENGTH = 2
const MAX_RESULTS = 20

/** GET: Search users to add to the thread (not already members). Thread admin only. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 })

  const supabase = await createClient()
  const { data: myMember } = await supabase
    .from("messaging_thread_members")
    .select("role")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single()
  if (!myMember || (myMember as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Only group admins can search for members" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") ?? "").trim()
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ users: [] })
  }

  const admin = createAdminClient()
  const { data: existingRows } = await admin
    .from("messaging_thread_members")
    .select("user_id")
    .eq("thread_id", threadId)
  const memberIds = (existingRows ?? []).map((r) => (r as { user_id: string }).user_id)
  if (memberIds.length === 0) {
    return NextResponse.json({ users: [] })
  }

  const pattern = `%${q}%`
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, email, full_name, first_name, last_name")
    .or(`email.ilike.${pattern},full_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
    .limit(MAX_RESULTS * 2)

  const memberSet = new Set(memberIds)
  const filtered = (profiles ?? []).filter((p: { user_id: string }) => !memberSet.has(p.user_id)).slice(0, MAX_RESULTS)

  const list = filtered.map((p: { user_id: string; email?: string | null; full_name?: string | null; first_name?: string | null; last_name?: string | null }) => ({
    user_id: p.user_id,
    email: p.email ?? null,
    display_name: p.full_name?.trim() || [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.email || "Member",
  }))
  return NextResponse.json({ users: list })
}
