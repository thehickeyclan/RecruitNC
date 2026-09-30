import { type NextRequest, NextResponse } from "next/server"
import { isBotRequest } from "@/lib/bot-traffic"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_EVENTS = new Set([
  "login_wall_view",
  "signup_started",
  /*
     Step one of the wizard. Added to the page on 28 Sep and rejected here ever since, so the
     biggest drop in the funnel - open to submit - stayed a single number with two opposite
     causes behind it: could not pick a role, or would not fill the fields.
  */
  "signup_role_chosen",
  "signup_submitted",
  "signup_error",
  "signup_completed",
  "verification_email_sent",
  "verification_resend_requested",
  "verification_completed",
  "signin_started",
  "signin_completed",
])

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
    // Crawlers and scripts are not visitors; recording them inflated every view count.
    if (isBotRequest(request)) return NextResponse.json({ success: true, ignored: "bot" })

    const body = await request.json().catch(() => ({}))
    const event = typeof body.event === "string" ? body.event : ""
    if (!ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ ok: false, error: "Unsupported funnel event" }, { status: 400 })
    }

    const path = cleanPath(body.path)
    const target = cleanPath(body.target)
    const source = typeof body.source === "string" ? body.source.slice(0, 80) : null
    const message = typeof body.message === "string" ? body.message.slice(0, 300) : null

    let userId: string | null = null
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userId = user?.id ?? null
    } catch {
      userId = null
    }

    const admin = createAdminClient()
    const { error } = await admin.from("user_analytics").insert({
      user_id: userId,
      event_type: event,
      page_url: path,
      referrer: target || null,
      user_agent: request.headers.get("user-agent") || null,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      event_data: {
        source,
        path,
        target,
        message,
        /* Which role the wizard was on. Whitelisted, not spread: the body is public input. */
        role: typeof body.role === "string" ? body.role.slice(0, 40) : null,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.warn("[track-funnel-event]", error.message)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.warn("[track-funnel-event]", error)
    return NextResponse.json({ ok: true })
  }
}
