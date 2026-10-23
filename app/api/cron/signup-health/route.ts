import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"
import { scheduledJobsOff, skippedJob } from "@/lib/scheduled-jobs"

/**
 * Hourly: are people able to sign up?
 *
 * From 20 to 22 October 2026 sign-up confirmation emails failed ("Error sending confirmation
 * email") because Supabase's auth SMTP pointed at a personal mailbox. 108 attempts from 18 people
 * failed over two days and nobody knew: the errors were in user_analytics the whole time. This
 * reads them every hour and emails staff when sign-ups are failing.
 *
 * The "you can only request this after N seconds" message is Supabase throttling a fast retry,
 * not an outage, so it does not count.
 */
const FROM = "NC United <info@ncwrestlingunited.com>"
const WINDOW_MINUTES = 60
/** Failures in the window that mean something is broken, not one person mistyping. */
const ALERT_AT = 3

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

export async function GET(request: NextRequest) {
  if (scheduledJobsOff()) return skippedJob()
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = createAdminClient()
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString()

  const { data, error } = await admin
    .from("user_analytics")
    .select("event_type, event_data, ip_address, user_agent, created_at")
    .in("event_type", ["signup_error", "signup_started"])
    .gte("created_at", since)
    .limit(2000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const failures = (data ?? []).filter((e) => {
    if (e.event_type !== "signup_error") return false
    const message = String((e.event_data as { message?: unknown } | null)?.message ?? "")
    return !/only request this after \d+ seconds/i.test(message)
  })
  const people = new Set(failures.map((e) => `${e.ip_address ?? ""}|${e.user_agent ?? ""}`)).size
  const started = (data ?? []).filter((e) => e.event_type === "signup_started").length
  const messages = new Map<string, number>()
  for (const f of failures) {
    const m = String((f.event_data as { message?: unknown } | null)?.message ?? "(no message)")
    messages.set(m, (messages.get(m) ?? 0) + 1)
  }

  const alert = failures.length >= ALERT_AT
  if (alert) {
    const to = (process.env.SIGNUP_ALERT_TO ?? process.env.RANKINGS_ALERT_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean)
    if (to.length) {
      const lines = [...messages].map(([m, n]) => `${n} × ${m}`)
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: FROM,
        to,
        subject: `Sign-ups failing: ${failures.length} errors from ${people} ${people === 1 ? "person" : "people"} in the last hour`,
        text: [
          `In the last ${WINDOW_MINUTES} minutes, ${failures.length} sign-up attempts failed (${people} ${people === 1 ? "person" : "people"}; ${started} sign-ups started).`,
          "",
          ...lines,
          "",
          "\"Error sending confirmation email\" means Supabase's auth email (Authentication → Emails → SMTP Settings) is failing. It should be smtp.resend.com.",
        ].join("\n"),
      })
    }
  }

  return NextResponse.json({ windowMinutes: WINDOW_MINUTES, failures: failures.length, people, started, alerted: alert })
}
