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
