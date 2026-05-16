import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { ok: false as const, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403, error: "Admin required" }
  return { ok: true as const, user }
}

/**
 * GET /api/admin/contacts/messages?userId=xxx
 * Fetches all message threads and blasts for a specific user
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = request.nextUrl
  const userId = searchParams.get("userId")?.trim()

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    // 1. Get email threads for this user (from admin_email_threads)
    const { data: threads, error: threadsErr } = await admin
      .from("admin_email_threads")
      .select("id, subject, created_at, last_message_at, has_unread_inbound")
      .eq("recipient_user_id", userId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50)

    if (threadsErr) {
      console.error("[admin/contacts/messages] threads error:", threadsErr.message)
    }

    // 2. Get blast log entries that were sent to this user's profile/group
    // This is trickier - blasts go to groups, not individuals directly
    // We need to check the user's profile role and memberships
    const { data: userProfile } = await admin
      .from("user_profiles")
      .select("role, email")
      .eq("user_id", userId)
      .single()

    let blasts: any[] = []

    if (userProfile) {
      // Get blasts sent to this user's role
      const { data: roleBlasts } = await admin
        .from("admin_blast_log")
        .select("id, sent_at, subject, body_snippet, channels_email, channels_sms")
        .or(`audience_profile.eq.${userProfile.role},audience_profile.is.null`)
        .order("sent_at", { ascending: false })
        .limit(20)

      blasts = roleBlasts || []
    }

    // 3. Also check for direct CRM messages (if we have them in a separate table)
    // For now, we'll just return threads and blasts

    return NextResponse.json({
      success: true,
      threads: threads || [],
      blasts,
    })
  } catch (e) {
    console.error("[admin/contacts/messages] error:", e)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}
