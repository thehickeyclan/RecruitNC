import { namesLikelySamePerson } from "@/lib/athlete-name-match"

/**
 * Wins worth showing on a profile: the ones over somebody the reader has heard of.
 *
 * A match list is long and mostly undifferentiated — a state champion's 55 wins look the same as
 * anybody else's until you know who they were against. This picks out the two kinds that carry
 * weight in North Carolina: a win over a wrestler in the Tournament of Champions field, and a win
 * over a ranked prospect.
 *
 * Unpublished classes count. The 2029 rankings are not public yet, but a win over the boy we
 * privately have at #3 in that class is no less real, and hiding it would make the section less
 * true rather than more careful. Only the fact of the ranking is used here, never the number, so
 * nothing unpublished is disclosed by showing it.
 */

export type Bout = {
  opponent?: string | null
  opponent_name?: string | null
  opponent_school?: string | null
  win_loss?: string | null
  result?: string | null
  date?: string | null
  venue?: string | null
  weight?: number | string | null
}

export type RankedOpponent = {
  name: string
  /** Kept for ordering and for the admin view; never rendered on a public profile. */
  ranking: number | null
  graduationYear: number | null
}

export type OpponentIndex = {
  /** Names of wrestlers in the announced TOC field. */
  tocField: readonly string[]
  /** Every athlete carrying a prospect ranking, published or not. */
  ranked: readonly RankedOpponent[]
}

export type SignificantWin = {
  opponent: string
  opponentSchool: string | null
  event: string | null
  date: string | null
  result: string | null
  weight: number | null
  /** Why it earned its place. A TOC opponent outranks a ranking when both are true. */
  reason: "toc-field" | "ranked"
  opponentGraduationYear: number | null
}

function opponentName(bout: Bout): string {
  return String(bout.opponent ?? bout.opponent_name ?? "").trim()
}

/** A win, however the row spells it. */
export function isWin(bout: Bout): boolean {
  const outcome = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return outcome === "W" || outcome.startsWith("W ") || outcome.includes("WIN")
}

function toWeight(value: Bout["weight"]): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * The significant wins in a bout list, newest first.
 *
 * Bouts store an opponent's name rather than an id, so this matches on the name — which is why it
 * uses the shared matcher rather than comparing strings. Getting this wrong credits a wrestler
 * with a win over somebody they never met.
 */
export function findSignificantWins(bouts: readonly Bout[], index: OpponentIndex): SignificantWin[] {
  const wins: SignificantWin[] = []
  const seen = new Set<string>()

  for (const bout of bouts) {
    if (!isWin(bout)) continue
    const name = opponentName(bout)
    if (!name) continue

    const inField = index.tocField.some((fieldName) => namesLikelySamePerson(fieldName, name))
    const ranked = inField ? null : index.ranked.find((r) => namesLikelySamePerson(r.name, name))
    if (!inField && !ranked) continue

    // One entry per opponent per day: the same bout is sometimes stored twice.
    const key = `${name.toLowerCase()}|${bout.date ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)

    wins.push({
      opponent: name,
      opponentSchool: bout.opponent_school ?? null,
      event: bout.venue ?? null,
      date: bout.date ?? null,
      result: bout.result ?? null,
      weight: toWeight(bout.weight),
      reason: inField ? "toc-field" : "ranked",
      opponentGraduationYear: ranked?.graduationYear ?? null,
    })
  }

  return wins.sort((a, b) => {
    // TOC opponents first, then by date, newest first. Undated rows sink rather than jump.
    if (a.reason !== b.reason) return a.reason === "toc-field" ? -1 : 1
    const at = a.date ? Date.parse(a.date) : Number.NaN
    const bt = b.date ? Date.parse(b.date) : Number.NaN
    if (Number.isNaN(at) && Number.isNaN(bt)) return 0
    if (Number.isNaN(at)) return 1
    if (Number.isNaN(bt)) return -1
    return bt - at
  })
}
