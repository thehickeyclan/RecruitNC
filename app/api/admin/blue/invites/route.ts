import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { randomBytes } from "crypto"
import { sendBlueInviteEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const, user }
}

function generateToken(): string {
  return randomBytes(24).toString("base64url")
}

/** GET: List invites */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("blue_invites")
    .select("id, token, email, expires_at, used_at, created_at, notes")
    .order("created_at", { ascending: false })

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ error: "Table blue_invites does not exist. Run SQL in docs/blue-membership-tables.md" }, { status: 503 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ invites: data ?? [] })
}

/** POST: Create invite */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { email?: string; notes?: string; expiresInDays?: number; interestId?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const expiresInDays = Math.min(90, Math.max(1, Number(body.expiresInDays) || 14))
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const token = generateToken()
  const admin = createAdminClient()
  const insertPayload: Record<string, unknown> = {
    token,
    email: body.email?.trim() || null,
    expires_at: expiresAt.toISOString(),
    created_by: auth.user.id,
    notes: body.notes?.trim() || null,
  }
  if (body.interestId?.trim()) insertPayload.interest_id = body.interestId.trim()

  const { data: row, error } = await admin
    .from("blue_invites")
    .insert(insertPayload)
    .select("id, token, expires_at, email")
    .single()

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ error: "Table blue_invites does not exist. Run SQL in docs/blue-membership-tables.md" }, { status: 503 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const registerUrl = `${baseUrl}/blue/register?invite=${encodeURIComponent(row.token)}`

  let emailSent = false
  if (body.email?.trim()) {
    const sent = await sendBlueInviteEmail(body.email.trim(), registerUrl)
    emailSent = sent.success
  }

  return NextResponse.json({
    invite: row,
    registerUrl,
    expiresAt: row.expires_at,
    emailSent,
  })
}
