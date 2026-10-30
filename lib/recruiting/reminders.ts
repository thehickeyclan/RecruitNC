/**
 * Reminders a parent schedules in the Command Center (Matt, 28 Oct 2026): a date and time and a
 * note, optionally tied to a school, a visit or that school's interest form. Delivered by app push
 * and email from /api/cron/family-reminders once FAMILY_REMINDER_SEND=1 (scripts/add-command-center-visits-reminders.sql).
 *
 * Times are the family's in Eastern time, the way every date in the portal is shown.
 */
export const REMINDER_TOPICS = ["note", "school", "visit", "form"] as const
export type ReminderTopic = (typeof REMINDER_TOPICS)[number]

export type Reminder = {
  id: string
  athleteId: string | null
  schoolId: string | null
  visitId: string | null
  topic: ReminderTopic
  /** ISO timestamp. */
  remindAt: string
  note: string
  sentAt: string | null
}

export const ZONE = "America/New_York"

/** The instant that is `hour`:`minute` Eastern on `day` (YYYY-MM-DD), daylight saving included. */
export function easternAt(day: string, hour: number, minute = 0): Date {
  const [y, m, d] = [Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))]
  // Eastern is UTC-4 in summer and UTC-5 in winter: take the offset that shows the hour asked for.
  for (const offset of [4, 5]) {
    const at = new Date(Date.UTC(y, m, d, hour + offset, minute))
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: ZONE, day: "numeric", hour: "numeric", hourCycle: "h23" }).formatToParts(at).map((p) => [p.type, p.value]))
    if (Number(parts.day) === d && Number(parts.hour) === hour) return at
  }
  return new Date(Date.UTC(y, m, d, hour + 5, minute))
}

/** Today in Eastern time, YYYY-MM-DD. */
export const easternDay = (at: Date = new Date()) => at.toLocaleDateString("en-CA", { timeZone: ZONE })

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export type ReminderPreset = { key: string; label: string; remindAt: string; note: string; topic: ReminderTopic }

/**
 * The quick choices offered beside the form (Matt: "follow up with this coach in a week", "the
 * day before the visit"). Each is a time and a ready note the parent can still change.
 */
export function reminderPresets(ctx: { now?: Date; school?: { name: string } | null; visit?: { startsOn: string; schoolName: string; kind: string } | null }): ReminderPreset[] {
  const today = easternDay(ctx.now)
  const out: ReminderPreset[] = []
  if (ctx.visit) {
    const before = addDays(ctx.visit.startsOn, -1)
    if (before >= today) {
      out.push({ key: "visit-day-before", label: "The day before the visit", remindAt: easternAt(before, 18).toISOString(), note: `${ctx.visit.schoolName} ${ctx.visit.kind} tomorrow. Pack the visit checklist.`, topic: "visit" })
    }
    const weekBefore = addDays(ctx.visit.startsOn, -7)
    if (weekBefore > today) {
      out.push({ key: "visit-week-before", label: "A week before the visit", remindAt: easternAt(weekBefore, 9).toISOString(), note: `${ctx.visit.schoolName} ${ctx.visit.kind} in a week. Send the transcript and book travel.`, topic: "visit" })
    }
    out.push({ key: "visit-thank-you", label: "Thank-you note, day after", remindAt: easternAt(addDays(ctx.visit.startsOn, 1), 18).toISOString(), note: `Send the ${ctx.visit.schoolName} coaches a thank-you note.`, topic: "visit" })
  }
  if (ctx.school) {
    out.push({ key: "follow-up-week", label: "Follow up with this coach in a week", remindAt: easternAt(addDays(today, 7), 9).toISOString(), note: `Follow up with the ${ctx.school.name} coach.`, topic: "school" })
    out.push({ key: "form-3-days", label: "Interest form in 3 days", remindAt: easternAt(addDays(today, 3), 19).toISOString(), note: `Fill out the ${ctx.school.name} interest form.`, topic: "form" })
  }
  if (!ctx.visit && !ctx.school) {
    out.push({ key: "tomorrow", label: "Tomorrow morning", remindAt: easternAt(addDays(today, 1), 9).toISOString(), note: "", topic: "note" })
    out.push({ key: "next-week", label: "In a week", remindAt: easternAt(addDays(today, 7), 9).toISOString(), note: "", topic: "note" })
  }
  return out
}

/** "Tue, Nov 4 at 9:00 AM" in Eastern time. */
export function reminderWhen(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString("en-US", { timeZone: ZONE, weekday: "short", month: "short", day: "numeric" })
  const time = d.toLocaleTimeString("en-US", { timeZone: ZONE, hour: "numeric", minute: "2-digit" })
  return `${day} at ${time}`
}

/**
 * What the push and the email say. The parent's own note is the body, as written; everything we
 * add is a statement, never a question (Matt: emails contain no questions), and the email is signed
 * with the family's brand name, never "NC United Wrestling".
 */
export function reminderMessage(r: Pick<Reminder, "note" | "topic">, ctx: { schoolName: string | null; wrestlerFirstName: string | null; brandName: string; link: string }) {
  const title = ctx.schoolName ? `Reminder: ${ctx.schoolName}` : "Your recruiting reminder"
  const subject = ctx.schoolName ? `Reminder: ${ctx.schoolName}` : `Reminder from ${ctx.brandName}`
  const lead = ctx.wrestlerFirstName ? `You asked us to remind you about ${ctx.wrestlerFirstName}'s recruiting.` : "You asked us to remind you."
  const text = [lead, r.note, `Open the Command Center: ${ctx.link}`, ctx.brandName].join("\n\n")
  return { title, body: r.note, subject, text, lead }
}

export const isReminderTopic = (v: unknown): v is ReminderTopic => typeof v === "string" && (REMINDER_TOPICS as readonly string[]).includes(v)

export function reminderFromRow(row: Record<string, unknown>): Reminder {
  return {
    id: String(row.id),
    athleteId: row.athlete_id ? String(row.athlete_id) : null,
    schoolId: row.school_id ? String(row.school_id) : null,
    visitId: row.visit_id ? String(row.visit_id) : null,
    topic: isReminderTopic(row.topic) ? row.topic : "note",
    remindAt: String(row.remind_at),
    note: String(row.note ?? ""),
    sentAt: row.sent_at ? String(row.sent_at) : null,
  }
}
