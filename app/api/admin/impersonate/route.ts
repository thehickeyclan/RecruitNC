import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    const { coachUserId } = await request.json()

    console.log("[v0] Impersonate request for coach ID:", coachUserId)

    const { data: coachProfile, error } = await supabase
      .from("user_profiles")
      .select("id, user_id, email, full_name")
      .eq("id", coachUserId)
      .single()

    console.log("[v0] Coach profile found:", coachProfile)
    console.log("[v0] Error:", error)

    if (error || !coachProfile) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 })
    }

    // Store impersonation data in cookies
    const response = NextResponse.json({
      success: true,
      coachEmail: coachProfile.email,
      coachName: coachProfile.full_name,
      message: "Impersonation initiated",
    })

    response.cookies.set("impersonating_profile_id", coachProfile.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
    })

    response.cookies.set("impersonating_email", coachProfile.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
    })

    return response
  } catch (error: any) {
    console.error("[v0] Impersonation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
