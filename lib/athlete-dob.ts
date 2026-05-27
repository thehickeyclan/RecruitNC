/** Normalize athlete DOB to MM/DD/YYYY (AAU entry packet / roster format). */
export function parseAthleteDobInput(
  raw: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  const s = typeof raw === "string" ? raw.trim() : ""
  if (!s) {
    return { ok: false, error: "Athlete date of birth is required." }
  }

  let date: Date | null = null

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10)
    const m = parseInt(isoMatch[2], 10)
    const d = parseInt(isoMatch[3], 10)
    date = new Date(y, m - 1, d)
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return { ok: false, error: "Enter a valid date of birth." }
    }
  } else {
    const mdyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
    if (mdyMatch) {
      const m = parseInt(mdyMatch[1], 10)
      const d = parseInt(mdyMatch[2], 10)
      const y = parseInt(mdyMatch[3], 10)
      date = new Date(y, m - 1, d)
      if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
        return { ok: false, error: "Enter a valid date of birth." }
      }
    }
  }

  if (!date) {
    return { ok: false, error: "Enter a valid date of birth." }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date > today) {
    return { ok: false, error: "Date of birth cannot be in the future." }
  }

  const year = date.getFullYear()
  if (year < 1990 || year > today.getFullYear()) {
    return { ok: false, error: "Enter the athlete's correct date of birth." }
  }

  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const yyyy = String(date.getFullYear())
  return { ok: true, value: `${mm}/${dd}/${yyyy}` }
}
