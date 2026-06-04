import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ensureBlueInviteForInterest, sendBlueApprovalEmail } from "@/lib/blue-approval-email"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const, user }
}

/** POST: Send approval email with private registration link (creates invite if needed). */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  let body: { id?: string; email?: string; personalNote?: string; parentName?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 })
  }

  const id = body.id?.trim()
  const email = body.email?.trim().toLowerCase()
  if (!id) return NextResponse.json({ ok: false, error: "Missing interest submission id" }, { status: 400 })
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Valid parent/guardian email required" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from("blue_express_interest")
    .select("id, first_name, last_name, parent_email")
    .eq("id", id)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ ok: false, error: "Interest submission not found" }, { status: 404 })
  }

  const invite = await ensureBlueInviteForInterest(admin, {
    interestId: id,
    email,
    createdBy: auth.user.id,
    notes: body.personalNote?.trim() || null,
  })

  if ("error" in invite) {
    return NextResponse.json({ ok: false, error: invite.error }, { status: 500 })
  }

  const sent = await sendBlueApprovalEmail(email, {
    athleteFirstName: String(row.first_name ?? ""),
    athleteLastName: String(row.last_name ?? ""),
    parentName: body.parentName?.trim() || null,
    personalNote: body.personalNote?.trim() || null,
    registerUrl: invite.registerUrl,
  })

  if (!sent.success) {
    return NextResponse.json({ ok: false, error: sent.error || "Failed to send email" }, { status: 500 })
  }

  const now = new Date().toISOString()
  const patch: Record<string, string> = {
    status: "invite_sent",
    parent_email: email,
    approval_email_sent_at: now,
  }

  const { error: upErr } = await admin.from("blue_express_interest").update(patch).eq("id", id)

  if (upErr) {
    console.warn("[blue-express-interest/send-approval] DB update:", upErr.message)
    return NextResponse.json({
      ok: true,
      sentTo: email,
      registerUrl: invite.registerUrl,
      warning: "Email sent but status may not have saved. Run SQL in docs/blue-express-interest-table.md for approval columns.",
    })
  }

  return NextResponse.json({
    ok: true,
    sentTo: email,
    status: "invite_sent",
    inviteId: invite.inviteId,
    registerUrl: invite.registerUrl,
  })
}
