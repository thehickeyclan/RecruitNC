import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendBlueInviteEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/** POST: Send invite email (to address on invite or body.to) */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { inviteId?: string; to?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const inviteId = body.inviteId?.trim()
  if (!inviteId) return NextResponse.json({ error: "inviteId required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: invite, error } = await admin
    .from("blue_invites")
    .select("id, token, email, used_at, expires_at")
    .eq("id", inviteId)
    .maybeSingle()

  if (error || !invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 })
  if (invite.used_at) return NextResponse.json({ error: "Invite already used" }, { status: 400 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 400 })

  const to = body.to?.trim() || invite.email?.trim()
  if (!to) return NextResponse.json({ error: "No email address. Add an email to the invite or pass 'to' in the request." }, { status: 400 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const registerUrl = `${baseUrl}/blue/register?invite=${encodeURIComponent(invite.token)}`

  const result = await sendBlueInviteEmail(to, registerUrl)
  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 500 })
  }

  return NextResponse.json({ success: true, sentTo: to })
}
