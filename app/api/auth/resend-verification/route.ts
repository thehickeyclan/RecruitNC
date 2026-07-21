import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, returnTo } = await request.json()
    const supabase = await createClient()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const safeReturnTo =
      typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const emailRedirectTo = safeReturnTo
      ? `${baseUrl}/auth/callback?next=${encodeURIComponent(safeReturnTo)}`
      : `${baseUrl}/auth/callback`

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Resend verification error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
