import { NextRequest, NextResponse } from "next/server"
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

/** GET: messages in a thread. POST mark_read: clear has_unread_inbound. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status })

  const { threadId } = await params
  const id = (threadId ?? "").trim()
  if (!id) return NextResponse.json({ error: "threadId required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: thread, error: tErr } = await admin.from("admin_email_threads").select("*").eq("id", id).maybeSingle()
  if (tErr || !thread) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: messages, error: mErr } = await admin
    .from("admin_email_messages")
    .select("id, direction, body_text, body_html, from_email, created_at, resend_sent_message_id")
    .eq("thread_id", id)
    .order("created_at", { ascending: true })

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 })
  }

  const { data: profile } = await admin
    .from("user_profiles")
    .select("email, full_name")
    .eq("user_id", (thread as { recipient_user_id: string }).recipient_user_id)
    .maybeSingle()

  return NextResponse.json({
    thread,
    messages: messages ?? [],
    recipient: profile,
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status })

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (body.action !== "mark_read") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  const { threadId } = await params
  const id = (threadId ?? "").trim()
  if (!id) return NextResponse.json({ error: "threadId required" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from("admin_email_threads").update({ has_unread_inbound: false }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
