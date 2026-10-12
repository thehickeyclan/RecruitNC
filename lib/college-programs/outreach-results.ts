/**
 * Which results go in a coach email, and how they are worded.
 *
 * Picked by rule, never by a model: at most three, the ones a college coach weighs first.
 * National placings lead (an All-American finish travels; a state place needs the state
 * explained), then the best recent state finish, then the Tournament of Champions.
 *
 * Each clause finishes the sentence "I ...", so the template only joins them.
 */

import type { AthleteCredentials } from "@/lib/credentials/athlete-credentials"

export function ordinalPlace(place: number): string {
  const tens = place % 100
  if (tens >= 11 && tens <= 13) return `${place}th`
  const last = place % 10
  return `${place}${last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th"}`
}

const NATIONAL_NAME: Record<string, string> = {
  NHSCA: "NHSCA Nationals",
  "Super 32": "Super 32",
  Fargo: "Fargo Nationals",
}

type Scored = { clause: string; year: number; place: number }

/** Lower place first, then the more recent year. */
function best(a: Scored, b: Scored): number {
  return a.place - b.place || b.year - a.year
}

export function resultClauses(creds: AthleteCredentials, max = 3): string[] {
  // Top eight at a national tournament. Super 32 lives in `national`, not `allAmerican`.
  const national: Scored[] = creds.national
    .filter((r) => r.place != null && r.place >= 1 && r.place <= 8)
    .map((r) => ({
      year: r.year,
      place: r.place as number,
      clause:
        r.place === 1
          ? `won ${NATIONAL_NAME[r.event] ?? r.event} in ${r.year}`
          : `placed ${ordinalPlace(r.place as number)} at ${NATIONAL_NAME[r.event] ?? r.event} in ${r.year}`,
    }))
    .sort(best)

  const statePlaced: Scored[] = creds.state
    .filter((s) => s.place != null && s.place >= 1)
    .map((s) => {
      const where = `the ${s.year} NCHSAA${s.classification ? ` ${s.classification}` : ""} state`
      return {
        year: s.year,
        place: s.place as number,
        clause: s.place === 1 ? `won ${where} title` : `placed ${ordinalPlace(s.place as number)} at ${where} tournament`,
      }
    })
    .sort(best)

  // A qualifier is worth saying only when there is no placing to say instead.
  const qualified = creds.state
    .filter((s) => s.place == null || s.place === 0)
    .sort((a, b) => b.year - a.year)
    .map((s) => `qualified for the ${s.year} NCHSAA${s.classification ? ` ${s.classification}` : ""} state tournament`)

  const toc: Scored[] = creds.toc
    .map((t) => ({
      year: t.year,
      place: t.place,
      clause:
        t.place === 1
          ? `won the ${t.year} NC United Tournament of Champions`
          : `placed ${ordinalPlace(t.place)} at the ${t.year} NC United Tournament of Champions`,
    }))
    .sort(best)

  const picked: string[] = []
  const take = (clause: string | undefined) => {
    if (clause && picked.length < max && !picked.includes(clause)) picked.push(clause)
  }

  // Lead with the single best state finish so the email opens on the result a coach can place,
  // then the best nationals, then whatever is left.
  take(statePlaced[0]?.clause)
  take(national[0]?.clause)
  take(national[1]?.clause)
  take(statePlaced[1]?.clause)
  take(toc[0]?.clause)
  if (statePlaced.length === 0) take(qualified[0])
  return picked
}

/** "sophomore" for a class still in high school, otherwise null. `seniorYear` is the class graduating this school year. */
export function gradeLabel(graduationYear: number | null, seniorYear: number): string | null {
  if (!graduationYear) return null
  return ["senior", "junior", "sophomore", "freshman"][graduationYear - seniorYear] ?? null
}

/** "Campbell University (Buies Creek)" -> "Campbell"; "University of Iowa" stays whole. */
export function spokenSchoolName(name: string): string {
  const base = name.replace(/\s*\([^)]*\)\s*/g, " ").trim()
  return base.replace(/\s+(University|College)$/i, "").trim() || base
}

export function coachSurname(fullName: string): string | null {
  const parts = fullName.trim().replace(/,?\s+(Jr\.?|Sr\.?|II|III|IV)$/i, "").split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : null
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "Oct 24-25" / "Dec 30 - Jan 1". Civil dates read as strings; `new Date("YYYY-MM-DD")` shifts a day west of UTC. */
export function eventDates(start: string, end: string | null): string {
  const parse = (value: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    return m ? { month: Number(m[2]), day: Number(m[3]) } : null
  }
  const from = parse(start)
  if (!from) return start
  const to = end ? parse(end) : null
  const first = `${MONTHS[from.month - 1]} ${from.day}`
  if (!to || (to.month === from.month && to.day === from.day)) return first
  return to.month === from.month ? `${first}-${to.day}` : `${first} - ${MONTHS[to.month - 1]} ${to.day}`
}
