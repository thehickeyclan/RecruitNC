import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export type SentBlastRow = {
  id: string
  sent_at: string
  audience_profile: string | null
  audience_group: string | null
  subject: string | null
  body_snippet: string | null
  channels_in_app: boolean
  channels_email: boolean
  channels_sms: boolean
  recipient_count: number
  result_in_app_sent: boolean | null
  result_email_sent: number
  result_email_failed: number
  result_sms_sent: number
  result_sms_failed: number
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized", user: null }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required", user: null }
  return { ok: true as const, user }
}

/** GET: List sent blasts for current admin. ?limit=50&before=uuid (cursor). */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const userId = (auth as { user: { id: string } }).user.id

  const { searchParams } = request.nextUrl
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100)
  const before = searchParams.get("before")?.trim() || null

  const admin = createAdminClient()
  let query = admin
    .from("admin_blast_log")
    .select("id, sent_at, audience_profile, audience_group, subject, body_snippet, channels_in_app, channels_email, channels_sms, recipient_count, result_in_app_sent, result_email_sent, result_email_failed, result_sms_sent, result_sms_failed")
    .eq("sent_by_user_id", userId)
    .order("sent_at", { ascending: false })

  if (before) {
    const { data: row } = await admin.from("admin_blast_log").select("sent_at").eq("id", before).eq("sent_by_user_id", userId).single()
    if (row) query = query.lt("sent_at", (row as { sent_at: string }).sent_at)
  }

  const { data: rows, error } = await query.limit(limit + 1)
  if (error) {
    if ((error as { code?: string })?.code === "42P01") {
      return NextResponse.json({ sent: [], hasMore: false })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = (rows ?? []) as SentBlastRow[]
  const hasMore = list.length > limit
  const sent = hasMore ? list.slice(0, limit) : list

  return NextResponse.json({ sent, hasMore })
}
