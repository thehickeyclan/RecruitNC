import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendToSubscribers } from "@/lib/push-send"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Remind the day before, so there is still time to plan around it. */
const LEAD_DAYS = 1

/** A day with more than this many events is a data problem, not a schedule. */
const MAX_PER_RUN = 5

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/** "2026-08-21" for the day LEAD_DAYS from now, in local terms — events carry a plain date. */
function targetDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + LEAD_DAYS)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatTime(time: string | null): string | null {
  if (!time) return null
  const [h, m] = time.split(":")
  const hour = Number(h)
  if (!Number.isFinite(hour)) return null
  const suffix = hour >= 12 ? "pm" : "am"
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return m && m !== "00" ? `${twelve}:${m}${suffix}` : `${twelve}${suffix}`
}

/**
 * Reminds devices about tomorrow's calendar events.
 *
 * Runs daily rather than hourly: a reminder is a once-a-day thing, and an hourly job would
 * need the dedupe to carry the reason it already sent rather than just the event.
 *
 * push_sent_events is the guard — an event is reminded about once, ever. The table is keyed on
 * the event, so moving an event's date will not re-announce it; that is the right trade
 * against re-reminding everyone each time a typo is fixed.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const day = targetDate()

  const { data: events, error } = await admin
    .from("events")
    .select("id, title, category, start_date, start_time, location")
    .eq("start_date", day)

  if (error) {
    console.error("[calendar-alerts]", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: alreadySent, error: sentError } = await admin.from("push_sent_events").select("event_id")
  if (sentError) {
    console.error("[calendar-alerts] cannot read push_sent_events:", sentError.message)
    return NextResponse.json({ error: "push_sent_events is not configured." }, { status: 503 })
  }

  const sentIds = new Set((alreadySent ?? []).map((r) => r.event_id))
  const pending = (events ?? []).filter((e) => e.id && e.title && !sentIds.has(e.id)).slice(0, MAX_PER_RUN)

  if (pending.length === 0) {
    return NextResponse.json({ day, announced: 0, message: "Nothing to remind about." })
  }

  const results: Array<Record<string, unknown>> = []

  for (const event of pending) {
    // Claim before sending, same as the other alert jobs: a failed send must not become a
    // reminder that repeats every day until the event passes.
    const { error: claimError } = await admin.from("push_sent_events").insert({ event_id: event.id })
    if (claimError) {
      if (!/duplicate key/i.test(claimError.message)) {
        console.error(`[calendar-alerts] claim failed for ${event.id}:`, claimError.message)
      }
      continue
    }

    const time = formatTime(event.start_time ?? null)
    const where = (event.location ?? "").replace(/\s*·\s*$/, "").trim()
    const detail = [time, where].filter(Boolean).join(" · ")

    const outcome = await sendToSubscribers("alert_events", {
      title: "Tomorrow",
      body: detail ? `${event.title} — ${detail}` : event.title,
      data: { kind: "calendar", eventId: event.id, path: "/calendar" },
    })

    console.info(
      `[calendar-alerts] ${event.id} "${event.title}": sent ${outcome.sent}, failed ${outcome.failed}, undelivered ${outcome.undelivered}`,
    )
    results.push({ eventId: event.id, title: event.title, ...outcome })
  }

  return NextResponse.json({ day, announced: results.length, results })
}
