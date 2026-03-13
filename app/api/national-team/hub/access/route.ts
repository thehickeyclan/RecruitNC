import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const HUB_COOKIE_NAME = "nc_hub_access"
const HUB_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const NHSCA_SLUGS = ["nhsca-duals-2026", "nhsca-duals-2026-select"]

/** POST: Validate access code (invite code for NHSCA) and set cookie so hub allows access without sign-in. */
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
    .in("event_slug", NHSCA_SLUGS)
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
