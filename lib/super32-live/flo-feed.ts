/**
 * Pulls Super 32 results straight from Flo's public results feed (the one flowrestling.org's
 * Results tab reads) and writes them in the Flo CSV export's shape, so the usual pipeline takes
 * it unchanged. Byes are not in the feed; nothing downstream needs them.
 */
const API = "https://prod-web-api.flowrestling.org/api/event-hub"
export const FLO_EVENT_ID = "15966539"

type Athlete = { name: string; team?: { abbr?: string; name?: string } | null; isWinner: boolean; score: number | null }
type Bout = { athlete1: Athlete | null; athlete2: Athlete | null; round: string; weightClass: string; winType: string | null; details: string | null }

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, cache: "no-store" })
  if (!r.ok) throw new Error(`Flo ${r.status} for ${url}`)
  return (await r.json()) as T
}

/** "Joseph “The Rooster” Cervantes" -> "Joseph Cervantes": the export carries no nicknames. */
export function cleanName(n: string): string {
  return n.replace(/\s*[“"][^”"]*[”"]\s*/g, " ").replace(/\s+/g, " ").trim()
}

const cell = (v: string) => `"=""${v.replace(/"/g, "'")}"""`

export function boutToCsvLine(b: Bout, date: string): string | null {
  const a = b.athlete1, c = b.athlete2
  if (!a || !c || !a.name || !c.name) return null
  const w = a.isWinner ? a : c.isWinner ? c : null
  if (!w) return null
  const l = w === a ? c : a
  const score = w.score !== null && l.score !== null ? `${w.score}-${l.score}` : ""
  const result = [score, (b.details ?? "").trim()].filter(Boolean).join(" ")
  const team = (x: Athlete) => x.team?.abbr ?? x.team?.name ?? ""
  return [date, b.weightClass, b.round, cleanName(w.name), team(w), result, (b.winType ?? "").toUpperCase(), cleanName(l.name), team(l), "Greensboro", "NC", "2026 Defense Soap Super 32"].map(cell).join(",")
}

/** Every finished bout in every division and weight, as a Flo-export CSV. */
export async function fetchFloResultsCsv(eventId = FLO_EVENT_ID, date = "10/24/2026"): Promise<{ csv: string; bouts: number; weights: number }> {
  const base = `${API}/${eventId}/results`
  const divs = await get<{ data: { options: Array<{ value: string; label: string }> } }>(`${base}/filters/event-division`)
  const lines = new Set<string>()
  let weights = 0
  for (const d of divs.data.options) {
    const filters = encodeURIComponent(JSON.stringify([{ id: "event-division", type: "string", value: d.value, sport: "wrestling" }]))
    const wcs = await get<{ data: { options: Array<{ value: string; label: string }> } }>(`${base}/filters/event-weight-class?filters=${filters}`)
    for (const wc of wcs.data.options) {
      weights += 1
      const group = encodeURIComponent(JSON.stringify({ id: "event-weight-class", type: "string", value: wc.value }))
      const res = await get<{ data: Array<{ items: Array<{ items: Bout[] }> }> }>(`${base}/rounds/event-weight-class/items?filters=${filters}&groupFilter=${group}`)
      for (const g of res.data ?? []) for (const round of g.items ?? []) for (const b of round.items ?? []) {
        const line = boutToCsvLine(b, date)
        if (line) lines.add(line)
      }
    }
  }
  const header = ["Date", "Weight", "Round", "Winning Wrestler", "Winning Team", "Result", "Win Type", "Losing Wrestler", "Losing Team", "City", "State", "Event"].map(cell).join(",")
  return { csv: [header, ...lines].join("\n") + "\n", bouts: lines.size, weights }
}
