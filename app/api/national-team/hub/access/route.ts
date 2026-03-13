import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"

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

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from("national_team_invite_codes")
    .select("id, expires_at, max_uses, uses_count")
    .in("event_slug", NHSCA_SLUGS)
    .eq("code", code)
    .limit(1)

  const row = Array.isArray(rows) ? rows[0] : null
  if (error || !row) {
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

  const cookieStore = await cookies()
  cookieStore.set(HUB_COOKIE_NAME, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HUB_COOKIE_MAX_AGE,
  })

  return NextResponse.json({ success: true })
}
