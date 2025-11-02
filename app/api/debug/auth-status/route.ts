import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200))

    let session = null
    let sessionError = null
    let user = null
    let userError = null

    try {
      const sessionResult = await supabase.auth.getSession()
      session = sessionResult.data.session
      sessionError = sessionResult.error
    } catch (error) {
      sessionError = error
      console.error("Session fetch error:", error)
    }

    try {
      const userResult = await supabase.auth.getUser()
      user = userResult.data.user
      userError = userResult.error
    } catch (error) {
      userError = error
      console.error("User fetch error:", error)
    }

    return NextResponse.json({
      user: user?.email || null,
      userId: user?.id || null,
      session: session ? "Present" : "None",
      accessToken: session?.access_token ? "Present" : "Missing",
      userError: userError?.message || null,
      sessionError: sessionError?.message || null,
      debug: {
        hasSession: !!session,
        hasUser: !!user,
        sessionExpiry: session?.expires_at || null,
      },
    })
  } catch (error) {
    console.error("Auth status check error:", error)
    return NextResponse.json(
      {
        error: "Failed to check auth status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
