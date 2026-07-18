import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

function cleanPath(value: unknown): string {
  if (typeof value !== "string") return "/"
  try {
    const parsed = value.startsWith("http") ? new URL(value) : null
    return (parsed ? parsed.pathname : value.split("?")[0]).slice(0, 500) || "/"
  } catch {
    return value.split("?")[0].slice(0, 500) || "/"
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Auth error in tracking:", authError)
      return NextResponse.json({ success: false }, { status: 200 }) // Silent fail
    }

    if (authError || !user) {
      return NextResponse.json({ success: true })
    }

    const body = await request.json()
    const { page_url, referrer, source } = body
    const cleanPageUrl = cleanPath(page_url)
    const cleanReferrer = typeof referrer === "string" && referrer ? cleanPath(referrer) : null

    // Get request info
    const userAgent = request.headers.get("user-agent") || ""
    const forwarded = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ipAddress = forwarded?.split(",")[0] || realIp || "unknown"

    // Insert tracking data
    const { error } = await supabase.from("user_analytics").insert({
      user_id: user?.id || null,
      event_type: "page_view",
      page_url: cleanPageUrl,
      referrer: cleanReferrer,
      user_agent: userAgent,
      ip_address: ipAddress,
      event_data: {
        source: source === "global_activity_tracker" ? "global_activity_tracker" : "manual",
        path: cleanPageUrl,
        timestamp: new Date().toISOString(),
      },
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
