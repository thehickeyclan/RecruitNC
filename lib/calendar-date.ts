/**
 * A calendar date, written the way a person reads it: "Sunday, September 13, 2026".
 *
 * `new Date("2026-09-13")` is midnight UTC, which is 8 PM the day before in North Carolina — so a
 * family who booked Sunday's practice was shown "Saturday, September 12" on the confirmation page
 * and in the email. A date with no time is a day on the calendar, not an instant, and is formatted
 * as one. Anything carrying a time is shown in Eastern time, where every NC United event happens.
 */
export function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return ""
  const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (dateOnly) {
    const [, y, m, d] = dateOnly
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).toLocaleDateString("en-US", {
      ...options,
      timeZone: "UTC",
    })
  }

  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return value
  return instant.toLocaleDateString("en-US", { ...options, timeZone: "America/New_York" })
}
