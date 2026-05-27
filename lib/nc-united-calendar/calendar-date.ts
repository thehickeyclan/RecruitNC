/**
 * Postgres `date` and timestamptz values are often serialized with a time part.
 * Parsing the full string as `new Date(iso)` treats midnight UTC as the previous
 * calendar day in US timezones. For schedule "civil" dates we use the Y-M-D
 * from the first 10 characters and build a local calendar Date.
 */
export function parseCivilDateFromDatabase(value: string | null | undefined): Date {
  if (value == null || value === "") {
    return new Date(NaN)
  }
  const s = String(value).trim()
  const ymd = s.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (match) {
    const y = Number(match[1])
    const m = Number(match[2])
    const d = Number(match[3])
    return new Date(y, m - 1, d)
  }
  const fallback = new Date(s)
  if (Number.isNaN(fallback.getTime())) {
    return new Date(NaN)
  }
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate())
}

/** Local midnight for the same calendar day as `d` (stable range checks). */
export function startOfLocalCalendarDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

type DateRangeEvent = {
  date: Date
  endDate?: Date
}

/** Inclusive end date; falls back to start when end is missing or before start. */
export function eventEffectiveEndDate(event: DateRangeEvent): Date {
  const start = startOfLocalCalendarDay(event.date)
  if (!event.endDate) return start
  const end = startOfLocalCalendarDay(event.endDate)
  return end.getTime() < start.getTime() ? start : end
}

export function eventIsMultiDay(event: DateRangeEvent): boolean {
  const start = startOfLocalCalendarDay(event.date)
  const end = eventEffectiveEndDate(event)
  return end.getTime() !== start.getTime()
}

/** True when `day` falls on an inclusive start–end range. */
export function eventOccursOnCalendarDay(event: DateRangeEvent, day: Date): boolean {
  const current = startOfLocalCalendarDay(day)
  const start = startOfLocalCalendarDay(event.date)
  const end = eventEffectiveEndDate(event)
  return current >= start && current <= end
}

/** True when any day of the event overlaps the given calendar month. */
export function eventOccursInMonth(event: DateRangeEvent, year: number, month: number): boolean {
  const monthStart = startOfLocalCalendarDay(new Date(year, month, 1))
  const monthEnd = startOfLocalCalendarDay(new Date(year, month + 1, 0))
  const eventStart = startOfLocalCalendarDay(event.date)
  const eventEnd = eventEffectiveEndDate(event)
  return eventStart <= monthEnd && eventEnd >= monthStart
}

/** Still running or not yet started (uses inclusive end date). */
export function eventIsUpcoming(event: DateRangeEvent, today = new Date()): boolean {
  const t = startOfLocalCalendarDay(today)
  return eventEffectiveEndDate(event) >= t
}

export function formatEventDateRangeShort(event: DateRangeEvent): string {
  const start = startOfLocalCalendarDay(event.date)
  const end = eventEffectiveEndDate(event)
  if (end.getTime() === start.getTime()) {
    return start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()}–${end.getDate()}`
  }
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${startStr} – ${endStr}`
}

export function multiDayIndicator(event: DateRangeEvent, currentDay: Date): string {
  if (!eventIsMultiDay(event)) return ""
  const current = startOfLocalCalendarDay(currentDay)
  const start = startOfLocalCalendarDay(event.date)
  const end = eventEffectiveEndDate(event)
  if (current.getTime() === start.getTime()) return " (Day 1)"
  if (current.getTime() === end.getTime()) return " (Final)"
  return " (Cont.)"
}
