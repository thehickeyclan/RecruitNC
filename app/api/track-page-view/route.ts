import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Auth error in tracking:", authError)
      return NextResponse.json({ success: false }, { status: 200 }) // Silent fail
    }

    const body = await request.json()
    const { page_url, referrer } = body

    // Get request info
    const userAgent = request.headers.get("user-agent") || ""
    const forwarded = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ipAddress = forwarded?.split(",")[0] || realIp || "unknown"

    // Insert tracking data
    const { error } = await supabase.from("user_analytics").insert({
      user_id: user?.id || null,
      event_type: "page_view",
      page_url,
      referrer,
      user_agent: userAgent,
      ip_address: ipAddress,
    })

    if (error) {
      console.error("Error tracking page view:", error)
      // Silent fail - don't break user experience
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Tracking error:", error)
    // Silent fail - don't break user experience
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
