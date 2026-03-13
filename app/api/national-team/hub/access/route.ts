import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const HUB_COOKIE_NAME = "nc_hub_access"
const HUB_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const HUB_GRANT_DAYS = 30

/** Event slugs that accept hub access codes. Add slugs here when adding new tournaments with code-based hub access. */
const HUB_CODE_EVENT_SLUGS = ["nhsca-duals-2026", "nhsca-duals-2026-select"]

/**
 * POST: Validate access code and grant hub access.
 * Flow (scalable for multiple tournaments):
 * 1. Validate code against national_team_invite_codes (event_slug in HUB_CODE_EVENT_SLUGS).
 * 2. If logged in: upsert national_team_hub_access_grants (user_id, code, expires_at) so hub GET can allow access without cookies.
 * 3. Set cookie nc_hub_access on response (for anonymous or cookie-based clients).
 * 4. Return 200 JSON so client can let the browser commit the cookie, then navigate to /national-team/hub.
 */
export async function POST(request: NextRequest) {
  let body: { code?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 })
  }
  const code = typeof body.code === "string" ? body.code.trim() : ""
  if (!code) {
    return NextResponse.json({ success: false, error: "Access code is required." }, { status: 400 })
  }

  const codeLower = code.toLowerCase()
  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from("national_team_invite_codes")
    .select("id, code, expires_at, max_uses, uses_count")
    .in("event_slug", HUB_CODE_EVENT_SLUGS)
    .limit(50)

  const row = error
    ? null
    : (Array.isArray(rows) ? rows : []).find(
        (r) => (r as { code?: string }).code?.trim().toLowerCase() === codeLower
      ) as { id: string; code?: string; expires_at?: string | null; max_uses?: number | null; uses_count?: number } | undefined
  if (!row) {
    return NextResponse.json({ success: false, error: "Invalid access code." }, { status: 400 })
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ success: false, error: "This code has expired." }, { status: 400 })
  }
  const maxUses = row.max_uses != null ? Number(row.max_uses) : null
  const usesCount = Number(row.uses_count) ?? 0
  if (maxUses != null && usesCount >= maxUses) {
    return NextResponse.json({ success: false, error: "This code has reached its limit." }, { status: 400 })
  }

  const valueToStore = (row.code ?? code).trim()

  // Logged-in user: store grant in DB so hub GET can allow access without relying on cookies
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + HUB_GRANT_DAYS)
      await admin
        .from("national_team_hub_access_grants")
        .upsert(
          { user_id: user.id, code: valueToStore, expires_at: expiresAt.toISOString() },
          { onConflict: "user_id" }
        )
    }
  } catch {
    // national_team_hub_access_grants may not exist; cookie still set below
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(HUB_COOKIE_NAME, valueToStore, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HUB_COOKIE_MAX_AGE,
  })
  return response
}
