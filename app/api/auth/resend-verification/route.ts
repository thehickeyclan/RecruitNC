import { createEmailLinkClient } from "@/lib/supabase/email-link-client"
import { NextResponse } from "next/server"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"

export async function POST(request: Request) {
  try {
    const { email, returnTo } = await request.json()
    const supabase = createEmailLinkClient()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const safeReturnTo =
      typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined
    // Back to the site the person is on (RecruitWrestlers families were sent to NC United).
    const baseUrl = stagedBrandForHost(request.headers.get("host")) === "national" ? "https://www.recruitwrestlers.com" : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
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
