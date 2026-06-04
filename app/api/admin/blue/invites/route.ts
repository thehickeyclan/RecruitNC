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
    .limit(5000)

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

  let row: { id: string; token: string; expires_at: string; email: string | null }
  try {
    const result = await admin
      .from("blue_invites")
      .insert(insertPayload)
      .select("id, token, expires_at, email")
      .single()
    if (result.error) throw result.error
    if (!result.data) throw new Error("No data returned from insert")
    row = result.data
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string }
    if (e?.code === "42P01") return NextResponse.json({ error: "Table blue_invites does not exist. Run SQL in docs/blue-membership-tables.md" }, { status: 503 })
    if (e?.code === "23503") return NextResponse.json({ error: "Invalid created_by (auth user). Sign in again and retry." }, { status: 400 })
    if (e?.code === "23505") return NextResponse.json({ error: "Token collision (rare). Please try again." }, { status: 409 })
    return NextResponse.json({ error: e?.message ?? "Failed to create invite" }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const registerUrl = `${baseUrl}/blue/register?invite=${encodeURIComponent(row.token)}`

  let emailSent = false
  if (body.email?.trim()) {
    const sent = await sendBlueInviteEmail(body.email.trim(), registerUrl)
    emailSent = sent.success
  }

  if (body.interestId?.trim()) {
    const interestPatch: Record<string, string> = { status: "invite_sent" }
    if (body.email?.trim()) interestPatch.parent_email = body.email.trim().toLowerCase()
    await admin.from("blue_express_interest").update(interestPatch).eq("id", body.interestId.trim())
  }

  return NextResponse.json({
    invite: row,
    registerUrl,
    expiresAt: row.expires_at,
    emailSent,
  })
}
