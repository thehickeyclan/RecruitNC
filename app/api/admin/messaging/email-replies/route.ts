import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const }
  return { ok: true as const }
}

/** GET: list admin email threads (inbound replies + blast context), newest first. */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status })

  const admin = createAdminClient()
  const { data: threads, error } = await admin
    .from("admin_email_threads")
    .select(
      "id, subject, recipient_user_id, has_unread_inbound, last_message_at, created_at, admin_blast_log_id",
    )
    .order("last_message_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("[admin/messaging/email-replies]", error)
    return NextResponse.json(
      { error: error.message, hint: "Run SQL from lib/ADMIN-EMAIL-REPLIES-MIGRATION.md in Supabase if tables are missing." },
      { status: 500 },
    )
  }

  const userIds = [...new Set((threads ?? []).map((t: { recipient_user_id: string }) => t.recipient_user_id))]
  const { data: profiles } =
    userIds.length > 0
      ? await admin.from("user_profiles").select("user_id, email, full_name").in("user_id", userIds)
      : { data: [] }

  const nameByUser = new Map<string, string>()
  for (const p of profiles ?? []) {
    const row = p as { user_id: string; email: string | null; full_name: string | null }
    nameByUser.set(row.user_id, row.full_name?.trim() || row.email || row.user_id)
  }

  const rows = (threads ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    recipient_label: nameByUser.get(t.recipient_user_id as string) ?? (t.recipient_user_id as string),
  }))

  return NextResponse.json({ threads: rows })
}
