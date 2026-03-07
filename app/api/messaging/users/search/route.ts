import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMessagingUser } from "@/lib/messaging-auth"

const MIN_QUERY_LENGTH = 2
const MAX_RESULTS = 20

/** GET: Search RecruitNC users by name or email (for starting a new DM). */
export async function GET(request: Request) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") ?? "").trim()
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ users: [] })
  }

  const admin = createAdminClient()
  const pattern = `%${q}%`
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, email, full_name, first_name, last_name")
    .or(`email.ilike.${pattern},full_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
    .limit(MAX_RESULTS * 2)

  const filtered = (profiles ?? []).filter((p: { user_id: string }) => p.user_id !== user.id).slice(0, MAX_RESULTS)

  const list = filtered.map((p: { user_id: string; email?: string | null; full_name?: string | null; first_name?: string | null; last_name?: string | null }) => ({
    user_id: p.user_id,
    email: p.email ?? null,
    display_name: p.full_name?.trim() || [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.email || "User",
  }))
  return NextResponse.json({ users: list })
}
