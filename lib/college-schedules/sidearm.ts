/**
 * Read a college wrestling schedule off a Sidearm Sports athletics site.
 *
 * Every North Carolina program runs Sidearm — NC State, Duke, UNC, App State, Campbell, Davidson,
 * Mount Olive, UNC Pembroke — on the same `/sports/wrestling/schedule` path, so one parser covers
 * the lot. The page renders from a Nuxt payload embedded in the HTML, which means a plain server
 * fetch is enough and no headless browser is needed on a cron.
 *
 * The payload is a flat array where every value is an index into that same array, so an event is
 * a tree of integers until it is resolved. That is the whole trick here.
 */

export type SidearmScheduleEvent = {
  /** ISO date, "2026-01-17". */
  date: string
  /** "19:00", or null when only a date has been announced. */
  startTime: string | null
  opponent: string | null
  homeAway: "home" | "away" | "neutral"
  location: string | null
  /** Broadcaster, "ACCNX" / "FloWrestling". */
  tv: string | null
  streamUrl: string | null
  /** "W" or "L" once wrestled; null while the meet is still ahead. */
  outcome: "W" | "L" | null
  teamScore: number | null
  opponentScore: number | null
  /** Set when the row is an open or an invitational rather than a dual. */
  eventName: string | null
  status: "scheduled" | "postponed" | "cancelled"
}

/**
 * An event rather than an opponent.
 *
 * Shared with the classic parser so the two layouts never disagree about what a fixture is.
 * The Nuxt payload alone is not enough to tell: an open is given a mascot and a logo exactly
 * like a team, so "Southeast Open" arrived as somebody NC State wrestled.
 */
export function looksLikeTournament(name: string): boolean {
  return /\b(open|invitational|championships?|duals|classic|tournament|showcase|scramble|challenge|wrestle-?offs?)\b/i.test(
    name,
  )
}

type Payload = unknown[]

/** Pull the Nuxt payload out of the page. */
export function extractNuxtPayload(html: string): Payload | null {
  const match = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Resolve an index into its value, following references all the way down.
 *
 * Depth-limited and cycle-guarded: the payload is a graph, not a tree — an opponent's logo object
 * is shared between every meet against them — and a naive walk never returns.
 */
function resolve(payload: Payload, index: unknown, depth = 0, seen: Set<number> = new Set()): unknown {
  if (depth > 8) return null
  if (typeof index !== "number") return index
  if (index < 0 || index >= payload.length) return null
  if (seen.has(index)) return null

  const value = payload[index]
  if (Array.isArray(value)) {
    const next = new Set(seen).add(index)
    return value.map((entry) => resolve(payload, entry, depth + 1, next))
  }
  if (value && typeof value === "object") {
    const next = new Set(seen).add(index)
    const out: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = resolve(payload, entry, depth + 1, next)
    }
    return out
  }
  return value
}

function text(value: unknown): string | null {
  const trimmed = typeof value === "string" ? value.trim() : ""
  return trimmed ? trimmed : null
}

function score(value: unknown): number | null {
  const parsed = Number(String(value ?? "").trim())
  return Number.isFinite(parsed) ? parsed : null
}

/** "H" / "A" / "N", falling back to the "vs" / "at" the page prints. */
function homeAwayOf(indicator: unknown, atVs: unknown): SidearmScheduleEvent["homeAway"] {
  const flag = String(indicator ?? "").trim().toUpperCase()
  if (flag === "H") return "home"
  if (flag === "A") return "away"
  if (flag === "N") return "neutral"
  return String(atVs ?? "").trim().toLowerCase() === "at" ? "away" : "home"
}

/**
 * A meet that has been wrestled carries W or L; anything else is still ahead.
 *
 * Sidearm uses "N" for not-yet-played, and leaves the scores as empty strings rather than nulls —
 * which is why an empty score must not be read as nil-nil.
 */
function outcomeOf(status: unknown): "W" | "L" | null {
  const flag = String(status ?? "").trim().toUpperCase()
  return flag === "W" || flag === "L" ? flag : null
}

function statusOf(value: unknown): SidearmScheduleEvent["status"] {
  const flag = String(value ?? "").trim().toLowerCase()
  if (flag.includes("cancel")) return "cancelled"
  if (flag.includes("postpone")) return "postponed"
  return "scheduled"
}

/**
 * An event object is one with a date and the shape of a fixture.
 *
 * Matched structurally rather than by position, because the payload holds the whole site — news,
 * staff, promotions — and the schedule's offset moves between pages and redesigns.
 */
function looksLikeEvent(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const keys = Object.keys(value as object)
  return keys.includes("date") && keys.includes("opponent") && keys.includes("result") && keys.includes("at_vs")
}

export function parseSidearmSchedule(html: string): SidearmScheduleEvent[] {
  const payload = extractNuxtPayload(html)
  if (!payload) return []

  const events: SidearmScheduleEvent[] = []
  const seenKeys = new Set<string>()

  for (let index = 0; index < payload.length; index += 1) {
    const raw = payload[index]
    if (!looksLikeEvent(raw)) continue

    const event = resolve(payload, index) as Record<string, unknown> | null
    if (!event) continue

    const iso = text(event.date)
    if (!iso) continue
    const date = iso.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue

    const opponentBlock = (event.opponent ?? null) as Record<string, unknown> | null
    const resultBlock = (event.result ?? null) as Record<string, unknown> | null
    const mediaBlock = (event.media ?? null) as Record<string, unknown> | null
    const videoBlock = (mediaBlock?.video ?? null) as Record<string, unknown> | null

    const title = text(opponentBlock?.title)
    // Sidearm puts opens and invitationals in the opponent slot with no mascot behind them; the
    // schema wants those in `event_name` so a tournament is never printed as somebody's opponent.
    const isTournament = !!title && (looksLikeTournament(title) || !text(opponentBlock?.mascot))

    const outcome = outcomeOf(resultBlock?.status)
    const startIso = iso.length > 10 ? iso.slice(11, 16) : null

    const parsed: SidearmScheduleEvent = {
      date,
      startTime: startIso && startIso !== "00:00" ? startIso : null,
      opponent: isTournament ? null : title,
      homeAway: homeAwayOf(event.location_indicator, event.at_vs),
      location: text(event.location) ?? text(opponentBlock?.location),
      tv: text(mediaBlock?.tv),
      streamUrl: text(videoBlock?.url),
      // Scores travel with the outcome or not at all. A tournament finish can leave a number in
      // these fields with no W or L behind it, and a bare "30" is not a result anyone can read.
      outcome,
      teamScore: outcome ? score(resultBlock?.team_score) : null,
      opponentScore: outcome ? score(resultBlock?.opponent_score) : null,
      eventName: isTournament ? title : null,
      status: statusOf(event.status),
    }

    // The payload repeats an event wherever it is referenced; one row per date per fixture.
    const key = `${parsed.date}|${parsed.opponent ?? parsed.eventName ?? ""}|${parsed.startTime ?? ""}`
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    events.push(parsed)
  }

  return events.sort((a, b) => a.date.localeCompare(b.date))
}
