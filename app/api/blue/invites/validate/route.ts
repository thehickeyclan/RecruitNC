import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/** GET ?token=xxx — Validate invite token. Public (no auth). */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim()
  if (!token) return NextResponse.json({ valid: false, error: "Missing token" }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("blue_invites")
    .select("id, email, expires_at, used_at")
    .eq("token", token)
    .maybeSingle()

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ valid: false, error: "Service unavailable" }, { status: 503 })
    return NextResponse.json({ valid: false, error: "Invalid token" }, { status: 500 })
  }

  if (!data) return NextResponse.json({ valid: false, error: "Invalid or expired link" })
  if (data.used_at) return NextResponse.json({ valid: false, error: "This invite has already been used" })
  if (new Date(data.expires_at) < new Date()) return NextResponse.json({ valid: false, error: "This invite has expired" })

  return NextResponse.json({
    valid: true,
    email: data.email || undefined,
  })
}
