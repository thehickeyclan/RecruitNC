/**
 * The three sentences under a wrestler's name, and the facts they are built from.
 *
 *   Luke Richards competes for Cardinal Gibbons and is part of the RAW club.
 *   He is a state placer who competes nationally, year-round, in folkstyle, freestyle and Greco-Roman.
 *   He last competed at 132 lbs at the I-64 Fall Duals on Oct 10, 2026.
 *
 * Matt's wording (11 October 2026), assembled here from results rather than written by a model:
 * every clause appears only when the record supports it, so the summary cannot say a thing the
 * page below does not show. He or she comes from the profile's gender and the surname stands in
 * when it is not set - never "they" (the scouting report's rule).
 *
 * Accolades name the event (Matt, 25 Oct 2026): NHSCA, Super 32 and Fargo All-American or champion,
 * each with its count, then the state finish. "Year-round" is two or more
 * events outside the North Carolina season (November to February) in the last twelve months.
 */
export type SummaryRow = {
  event: string
  year: number
  /** ISO day, or the bare year when the source records no date. */
  sortKey?: string | null
  placement: string | null
  isDuals?: boolean
}

export type Accolades = {
  /** Top-eight finishes at NHSCA Nationals, Fargo or the Super 32. */
  allAmericans: number
  /** Titles among them. */
  nationalTitles: number
  /** Best NCHSAA finish as a place; null when he has never placed. */
  bestStatePlace: number | null
  /** "7A" for the best finish, when the event names one. */
  bestStateClass: string | null
  /**
   * Whose championship the best finish was: SCHSL, SCISA, NCISA, NCHSAA. Read from the event, so
   * a South Carolina champion is never called an NCHSAA one (17 Oct 2026). Absent means NCHSAA.
   */
  bestStateAssociation?: string | null
  statePlacings: number
  stateTitles: number
  /** Reached the state tournament without placing. */
  stateQualifier: boolean
  /** Top-eight finishes and titles by event, so the summary can name each one. */
  byEvent?: Record<NationalEvent, { aa: number; titles: number }>
}

export type NationalEvent = "nhsca" | "super32" | "fargo"
const EVENT_NAME: Record<NationalEvent, { aa: string; title: string }> = {
  nhsca: { aa: "NHSCA All-American", title: "NHSCA national champion" },
  super32: { aa: "Super 32 All-American", title: "Super 32 champion" },
  fargo: { aa: "Fargo All-American", title: "Fargo national champion" },
}
const eventOf = (event: string): NationalEvent | null =>
  /super 32(?!.*early)/i.test(event) ? "super32" : /fargo/i.test(event) ? "fargo" : /nhsca(?!.*duals)/i.test(event) ? "nhsca" : null

export type SummaryPart = { text: string; strong?: boolean }
export type SummarySentence = SummaryPart[]

const placeNumber = (placement: string | null): number | null => {
  if (!placement) return null
  if (/champion/i.test(placement)) return 1
  const m = placement.match(/^(\d+)(st|nd|rd|th)\b/i)
  return m ? Number(m[1]) : null
}

const isAllAmericanEvent = (event: string) => /fargo|nhsca(?!.*duals)|super 32(?!.*early)/i.test(event)

export function accoladesFrom(input: { stateRows: readonly SummaryRow[]; tournamentRows: readonly SummaryRow[] }): Accolades {
  const out: Accolades = { allAmericans: 0, nationalTitles: 0, bestStatePlace: null, bestStateClass: null, statePlacings: 0, stateTitles: 0, stateQualifier: false, byEvent: { nhsca: { aa: 0, titles: 0 }, super32: { aa: 0, titles: 0 }, fargo: { aa: 0, titles: 0 } } }
  for (const row of input.tournamentRows) {
    if (row.isDuals || /\(OF\)|overflow/i.test(row.event) || !isAllAmericanEvent(row.event)) continue
    const place = placeNumber(row.placement)
    if (place == null || place > 8) continue
    out.allAmericans += 1
    if (place === 1) out.nationalTitles += 1
    const ev = eventOf(row.event)
    if (ev) { out.byEvent![ev].aa += 1; if (place === 1) out.byEvent![ev].titles += 1 }
  }
  for (const row of input.stateRows) {
    const place = placeNumber(row.placement)
    if (place == null || place > 6) {
      out.stateQualifier = true
      continue
    }
    out.statePlacings += 1
    if (place === 1) out.stateTitles += 1
    if (out.bestStatePlace == null || place < out.bestStatePlace) {
      out.bestStatePlace = place
      out.bestStateClass = row.event.match(/\b(\d+A)\b/i)?.[1]?.toUpperCase() ?? null
      out.bestStateAssociation = row.event.match(/\b(SCHSL|SCISA|NCISAA?|NCHSAA)\b/i)?.[1]?.toUpperCase().replace("NCISAA", "NCISA") ?? null
    }
  }
  return out
}

const TIMES = ["", "", "two-time", "three-time", "four-time", "five-time"]
const times = (n: number) => (n >= 2 ? `${TIMES[n] ?? `${n}-time`} ` : "")

/**
 * Each national event by name (NHSCA, Super 32, Fargo), a title over All-American, then the state
 * finish: ["two-time NHSCA All-American", "Super 32 All-American", "two-time NCHSAA 8A state champion"].
 */
export function accoladePhrases(a: Accolades): string[] {
  const out: string[] = []
  if (a.byEvent) {
    for (const ev of ["nhsca", "super32", "fargo"] as const) {
      const { aa, titles } = a.byEvent[ev]
      if (titles > 0) out.push(`${times(titles)}${EVENT_NAME[ev].title}`)
      else if (aa > 0) out.push(`${times(aa)}${EVENT_NAME[ev].aa}`)
    }
  } else if (a.nationalTitles > 0) out.push(`${times(a.nationalTitles)}national champion`)
  else if (a.allAmericans > 0) out.push(`${times(a.allAmericans)}All-American`)
  const cls = a.bestStateClass ? ` ${a.bestStateClass}` : ""
  const assoc = a.bestStateAssociation || "NCHSAA"
  if (a.bestStatePlace === 1) out.push(`${times(a.stateTitles)}${assoc}${cls} state champion`)
  else if (a.bestStatePlace === 2) out.push(`${assoc}${cls} state runner-up`)
  else if (a.bestStatePlace != null) out.push(`${times(a.statePlacings)}state placer`)
  else if (a.stateQualifier) out.push("state qualifier")
  return out
}

const USUAL_DAY: Array<[RegExp, string]> = [
  [/state championships|nchsaa/i, "02-21"],
  [/nhsca/i, "03-28"],
  [/early entry/i, "09-05"],
  [/super 32/i, "10-20"],
  [/journeymen/i, "10-04"],
  [/fargo/i, "07-15"],
]

function rowDay(row: SummaryRow): number | null {
  const key = String(row.sortKey ?? "")
  const iso = /^\d{4}-\d{2}-\d{2}/.test(key) ? key.slice(0, 10) : `${row.year}-${USUAL_DAY.find(([re]) => re.test(row.event))?.[1] ?? "06-30"}`
  const ms = Date.parse(`${iso}T12:00:00Z`)
  return Number.isFinite(ms) ? ms : null
}

/** Events outside November to February in the last twelve months: the post and preseason. */
export function offSeasonEvents(rows: readonly SummaryRow[], now: Date = new Date()): number {
  const seen = new Set<string>()
  for (const row of rows) {
    const ms = rowDay(row)
    if (ms == null || ms > now.getTime() + 86_400_000 || now.getTime() - ms > 365 * 86_400_000) continue
    const month = new Date(ms).getUTCMonth() + 1
    if (month >= 11 || month <= 2) continue
    seen.add(`${row.event.replace(/\s*\(OF\)\s*$/i, "")}|${row.year}`)
  }
  return seen.size
}

export const YEAR_ROUND_MIN_EVENTS = 2

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`)
const STYLE_WORD: Record<string, string> = { folkstyle: "folkstyle", freestyle: "freestyle", greco: "Greco-Roman" }
// By sound, not spelling: "an NCHSAA" or "an SCHSL state champion" (letters said aloud), "an All-American", "a state placer".
const article = (phrase: string) => (/^(all-american|nchsaa|ncisa|nhsca|schsl|scisa|[aeiou])/i.test(phrase) && !/^(one|uni)/i.test(phrase) ? "an" : "a")

/** "the RAW club", "Triangle Wrestling Academy": a bare name gets "the ... club". */
function clubPhrase(club: string): string {
  return /club|academy|wrestling|\bwc\b|training|school/i.test(club) ? club : `the ${club} club`
}

/** "the I-64 Fall Duals", "Fargo", "the NCHSAA State Championships". */
function eventPhrase(event: string): string {
  if (/^the\s/i.test(event)) return event
  return /duals|championships?|classic|tournament|open|invitational|nationals|series/i.test(event) && !/^fargo|^super 32/i.test(event) ? `the ${event}` : event
}

function dayPhrase(date: string | null | undefined, year: number | null | undefined): string | null {
  if (date && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    return `on ${new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`
  }
  return year ? `in ${year}` : null
}

export function summarySentences(input: {
  name: string
  gender?: string | null
  school?: string | null
  club?: string | null
  accolades: Accolades
  scope: "national" | "in-state" | null
  /** The wrestler's state by name, for "competes in South Carolina"; North Carolina when absent. */
  stateName?: string | null
  styles: readonly string[]
  offSeasonEvents: number
  lastCompeted?: { weight?: string | number | null; event?: string | null; date?: string | null; year?: number | null } | null
}): SummarySentence[] {
  const name = input.name.trim()
  const words = name.split(/\s+/)
  const g = String(input.gender ?? "").toLowerCase()
  const subject = /^(m|male|boy)/.test(g) ? "He" : /^(f|female|girl)/.test(g) ? "She" : (words[words.length - 1] ?? name)
  const out: SummarySentence[] = []
  const s = (text: string): SummaryPart => ({ text, strong: true })
  const school = (input.school ?? "").trim()
  const club = (input.club ?? "").trim()

  if (school || club) {
    const parts: SummaryPart[] = [{ text: `${name} ` }]
    if (school) parts.push({ text: "competes for " }, s(school))
    if (school && club) parts.push({ text: " and is part of " }, s(clubPhrase(club)))
    else if (club) parts.push({ text: "is part of " }, s(clubPhrase(club)))
    parts.push({ text: "." })
    out.push(parts)
  }

  const accolades = accoladePhrases(input.accolades)
  const styles = input.styles.map((st) => STYLE_WORD[st] ?? st)
  if (accolades.length || input.scope || styles.length) {
    const parts: SummaryPart[] = [{ text: out.length ? `${subject} ` : `${name} ` }]
    const competes: SummaryPart[] = []
    if (input.scope) {
      competes.push({ text: "competes " }, s(input.scope === "national" ? "nationally" : `in ${input.stateName || "North Carolina"}`))
      if (input.offSeasonEvents >= YEAR_ROUND_MIN_EVENTS) competes.push({ text: ", " }, s("year-round"), { text: styles.length ? "," : "" })
      if (styles.length) competes.push({ text: " in " }, s(list(styles)))
    } else if (styles.length) {
      competes.push({ text: "wrestles " }, s(list(styles)))
    }
    if (accolades.length) {
      // "is a two-time NHSCA All-American, a Super 32 All-American and an NCHSAA 8A state champion"
      parts.push({ text: "is " })
      accolades.forEach((acc, i) => {
        if (i > 0) parts.push({ text: i === accolades.length - 1 ? " and " : ", " })
        parts.push({ text: `${article(acc)} ` }, s(acc))
      })
      if (competes.length) parts.push({ text: " who " }, ...competes)
    } else {
      parts.push(...competes)
    }
    parts.push({ text: "." })
    out.push(parts)
  }

  const last = input.lastCompeted
  if (last?.weight) {
    const parts: SummaryPart[] = [{ text: `${out.length ? subject : name} last competed at ` }, s(`${last.weight} lbs`)]
    if (last.event) parts.push({ text: " at " }, s(eventPhrase(String(last.event))))
    const day = dayPhrase(last.date, last.year)
    if (day) parts.push({ text: ` ${day}` })
    parts.push({ text: "." })
    out.push(parts)
  }
  return out
}

export const sentenceText = (sentence: SummarySentence) => sentence.map((p) => p.text).join("")
