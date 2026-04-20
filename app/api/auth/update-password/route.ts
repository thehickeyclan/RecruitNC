import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Password reset final step using the session in HttpOnly cookies (set by /auth/callback or client exchange).
 * The browser client often cannot read that session; updateUser must run server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const password = typeof body.password === "string" ? body.password : ""
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : ""

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 })
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: "No active reset session. Open the link from your email again, or request a new reset link." },
        { status: 401 },
      )
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return NextResponse.json({ error: error.message || "Failed to update password" }, { status: 400 })
    }

    const res = NextResponse.json({ success: true })
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0")
    return res
  } catch (e) {
    console.error("[auth/update-password]", e)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
