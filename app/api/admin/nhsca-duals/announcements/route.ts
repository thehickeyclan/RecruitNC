import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const, userId: user.id }
}

/** POST: Create a new announcement */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const body = await request.json()
  const { team, body: announcementBody, published = true } = body

  if (!announcementBody) {
    return NextResponse.json({ error: "body is required" }, { status: 400 })
  }

  const { data, error } = await admin
    .from('nhsca_duals_announcements')
    .insert({
      team: team || 'all',
      body: announcementBody,
      published,
      created_by: auth.userId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ announcement: data })
}
