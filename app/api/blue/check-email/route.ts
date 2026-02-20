import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * GET ?email=xxx — Check if this email is already registered (user_profiles).
 * Used on Blue register page to show "Already have an account? Log in" before parent submits.
 * Public (no auth). Returns only { registered: boolean }.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim()?.toLowerCase()
  if (!email) return NextResponse.json({ registered: false }, { status: 200 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("user_profiles")
    .select("user_id")
    .ilike("email", email)
    .limit(1)

  if (error) {
    console.warn("[blue/check-email]", error.message)
    return NextResponse.json({ registered: false }, { status: 200 })
  }

  const found = Array.isArray(data) ? data.length > 0 : !!data
  return NextResponse.json({ registered: found })
}
