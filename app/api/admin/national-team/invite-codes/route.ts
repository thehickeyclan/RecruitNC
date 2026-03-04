import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const DEFAULT_EVENT_SLUG = "nhsca-duals-2026"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/** GET: List invite codes for an event */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const eventSlug = request.nextUrl.searchParams.get("event") || DEFAULT_EVENT_SLUG
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("national_team_invite_codes")
    .select("id, event_slug, code, max_uses, uses_count, expires_at, created_at")
    .eq("event_slug", eventSlug)
    .order("created_at", { ascending: false })

  if (error) {
    if ((error as { code?: string })?.code === "42P01") {
      return NextResponse.json(
        { error: "Table national_team_invite_codes does not exist. Run scripts/208-national-team-registrations-and-products.md in Supabase." },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ codes: data ?? [], eventSlug })
}

/** POST: Create invite code */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { eventSlug?: string; code?: string; maxUses?: number; expiresInDays?: number } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const eventSlug = typeof body.eventSlug === "string" ? body.eventSlug.trim() || DEFAULT_EVENT_SLUG : DEFAULT_EVENT_SLUG
  const code = typeof body.code === "string" ? body.code.trim() : ""
  if (!code) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 })
  }

  const maxUses = body.maxUses != null ? (Number(body.maxUses) >= 0 ? Number(body.maxUses) : null) : null
  let expiresAt: string | null = null
  if (body.expiresInDays != null && Number(body.expiresInDays) > 0) {
    const d = new Date()
    d.setDate(d.getDate() + Number(body.expiresInDays))
    expiresAt = d.toISOString()
  }

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from("national_team_invite_codes")
    .insert({
      event_slug: eventSlug,
      code,
      max_uses: maxUses,
      uses_count: 0,
      expires_at: expiresAt,
    })
    .select("id, event_slug, code, max_uses, uses_count, expires_at, created_at")
    .single()

  if (error) {
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "A code with this value already exists for this event." }, { status: 400 })
    }
    if ((error as { code?: string })?.code === "42P01") {
      return NextResponse.json(
        { error: "Table national_team_invite_codes does not exist. Run scripts/208 in Supabase." },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ code: row })
}
