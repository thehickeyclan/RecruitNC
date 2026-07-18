export type BluePracticeEvent = {
  title: string | null
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  description: string | null
  coach: string | null
  registration_deadline: string | null
  entry_fee: number | null
  travel_info: string | null
  weight_classes: string[] | null
  rsvp_required: boolean | null
  external_link: string | null
  drop_in_registration_link: string | null
}

export function isBluePracticeScheduleQuery(message: string): boolean {
  const lower = String(message ?? "").toLowerCase()
  const identifiesBlue = /\bblue\b/.test(lower) || /\bnc\s*united\b/.test(lower)
  const identifiesPractice = /\bpracti[cs]e\b|\btraining\b|\bcalendar\b|\bschedule\b/.test(lower)
  const asksForSchedule =
    /\bnext\b|\bupcoming\b|\bwhen\b|\bwhat\s+time\b|\bwhere\b|\blocation\b|\baddress\b|\bcalendar\b|\bschedule\b/.test(
      lower,
    )
  return identifiesBlue && identifiesPractice && asksForSchedule
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`)
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatShortDate(value: string): string {
  const date = new Date(`${value}T12:00:00`)
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function formatTime(value: string | null): string | null {
  if (!value) return null
  const [hourText, minute = "00"] = value.split(":")
  const hour = Number(hourText)
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return value
  const suffix = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute} ${suffix}`
}

function cleanCalendarText(value: string | null): string | null {
  if (!value?.trim()) return null
  return value
    .trim()
    .replace(/\s*·\s*/g, " · ")
    .replace(/\s+/g, " ")
    .replace(/\.{2,}$/g, ".")
    .replace(/[·,;|\-]+\s*$/g, "")
    .trim()
}

export function formatNextBluePracticeAnswer(events: BluePracticeEvent[]): string {
  if (events.length === 0) {
    return "I don’t see an upcoming Blue practice on the NC United calendar right now. Check the [NC United calendar](/calendar) for updates."
  }

  const event = events[0]
  const start = formatTime(event.start_time)
  const end = formatTime(event.end_time)
  const time = start ? `${start}${end && end !== start ? `–${end}` : ""}` : "Time not posted"
  const title = cleanCalendarText(event.title) || "NC United Blue Practice"
  const location = cleanCalendarText(event.location)
  const coach = cleanCalendarText(event.coach)
  const description = cleanCalendarText(event.description)
  const travelInfo = cleanCalendarText(event.travel_info)
  const mapsUrl = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : null

  let answer = `The next Blue practice is **${title}** on **${formatDate(event.start_date)}**.\n\n`
  answer += `- **Time:** ${time}\n`
  answer += `- **Location:** ${location || "Not posted"}${mapsUrl ? ` · [Open in Google Maps](${mapsUrl})` : ""}\n`
  if (coach) answer += `- **Coach:** ${coach}\n`
  if (event.weight_classes?.length) answer += `- **Weights:** ${event.weight_classes.join(", ")}\n`
  if (event.entry_fee != null) answer += `- **Entry fee:** $${Number(event.entry_fee).toFixed(2)}\n`
  if (event.registration_deadline) answer += `- **Registration deadline:** ${formatDate(event.registration_deadline.slice(0, 10))}\n`
  if (event.rsvp_required) answer += `- **RSVP:** Required\n`
  if (description) answer += `\n**Details:** ${description}\n`
  if (travelInfo) answer += `\n**Travel details:** ${travelInfo}\n`

  const registrationLink = event.drop_in_registration_link || event.external_link
  if (registrationLink) answer += `\n[Register or view event details](${registrationLink})`
  else answer += `\n[View the NC United calendar](/calendar)`

  if (events.length > 1) {
    answer += `\n\n**Following Blue practices:**`
    for (const upcoming of events.slice(1, 4)) {
      const upcomingTime = formatTime(upcoming.start_time)
      answer += `\n- ${formatShortDate(upcoming.start_date)}${upcomingTime ? ` at ${upcomingTime}` : ""}`
      const upcomingLocation = cleanCalendarText(upcoming.location)
      if (upcomingLocation) answer += ` — ${upcomingLocation}`
    }
  }

  return answer
}

export async function answerNextBluePractice(): Promise<string> {
  // Keep the calendar client lazy so pure intent/format tests do not require production secrets.
  const { getCalendarSupabase } = await import("@/lib/calendar-supabase")
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await getCalendarSupabase()
    .from("events")
    .select(
      "title, start_date, end_date, start_time, end_time, location, description, coach, registration_deadline, entry_fee, travel_info, weight_classes, rsvp_required, external_link, drop_in_registration_link",
    )
    .eq("category", "blue-practice")
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(4)

  if (error) throw new Error(`Calendar lookup failed: ${error.message}`)
  return formatNextBluePracticeAnswer((data ?? []) as BluePracticeEvent[])
}
