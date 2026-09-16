/**
 * Turning a wrestler's results into the two lines that fit in a printed recruiting guide.
 *
 * The guide gives each wrestler about an eighth of a page, so every result has to arrive as a
 * phrase rather than a table. These are pure so the wording can be tested — the book is printed
 * and spiral-bound, and a phrase that reads wrongly cannot be corrected after the fact.
 */

export type NchsaaRow = { year: number; place: number | null; classification?: string | null }

export type TournamentRow = { year: number; placement?: string | null; record?: string | null }

/** 2026 → "'26". Years are always shown short here; the guide's cover carries the full date. */
export const yy = (year: number | string | null | undefined) => `'${String(year ?? "").slice(-2)}`

export function ordinal(place: number): string {
  const mod = place % 100
  if (mod >= 11 && mod <= 13) return `${place}th`
  if (place % 10 === 1) return `${place}st`
  if (place % 10 === 2) return `${place}nd`
  if (place % 10 === 3) return `${place}rd`
  return `${place}th`
}

/**
 * State results as one phrase.
 *
 * Titles are counted rather than listed year by year: "3× NCHSAA champion" is what a coach reads
 * off the page, where three separate champion lines would eat the entry's whole budget. Lower
 * placements follow, newest first, and only the top eight count as a placement at all.
 */
export function nchsaaPhrase(rows: NchsaaRow[]): string | null {
  const placed = rows.filter((r) => r.place != null && r.place >= 1 && r.place <= 8)
  if (placed.length === 0) return null

  const titles = placed.filter((r) => r.place === 1)
  const rest = placed.filter((r) => (r.place as number) > 1).sort((a, b) => b.year - a.year)

  /*
   * The classification is named only when every title was won in the same one.
   *
   * Taking the first row's class and applying it to all of them quietly relabels a wrestler who
   * moved up — a 3A title and a 4A title printed as two 3A titles. "2× NCHSAA champion" with no
   * class is accurate; "2× NCHSAA 3A champion" when one was 4A is not.
   */
  const titleClasses = new Set(
    (titles.length > 0 ? titles : placed).map((r) => (r.classification ?? "").trim()).filter(Boolean),
  )
  const classification = titleClasses.size === 1 ? [...titleClasses][0] : undefined
  const label = ["NCHSAA", classification].filter(Boolean).join(" ")

  const parts: string[] = []
  if (titles.length > 0) {
    const years = titles
      .map((t) => t.year)
      .sort((a, b) => a - b)
      .map((year) => yy(year))
      .join(" ")
    parts.push(titles.length > 1 ? `${titles.length}× ${label} champion ${years}` : `${label} champion ${years}`)
  }
  /*
   * A placer who never won it still has to say which tournament it was.
   *
   * Only the champion phrase carried the "NCHSAA" label, so a wrestler with a runner-up and a
   * fifth printed as "2nd '26 · 5th '25" — on paper, with no surrounding context, that is a
   * placement in nothing at all. The label therefore leads the first placement whenever there is
   * no title in front of it.
   */
  rest.slice(0, titles.length > 0 ? 1 : 2).forEach((r, index) => {
    const prefix = titles.length === 0 && index === 0 ? `${label} ` : ""
    parts.push(`${prefix}${ordinal(r.place as number)} ${yy(r.year)}`)
  })
  return parts.join(" · ")
}

export type GuideWin = {
  opponent: string
  reason: "national-ranked" | "toc-field" | "ranked"
  nationalRankLabel?: string
}

/** Strongest credential first: a national ranking outranks this field, which outranks an NC ranking. */
const REASON_ORDER: Record<GuideWin["reason"], number> = {
  "national-ranked": 0,
  "toc-field": 1,
  ranked: 2,
}

/**
 * The wins worth printing, one opponent each.
 *
 * Wrestlers meet the same opponent repeatedly — a conference rival, then the state final — and
 * the raw list returns every meeting. Printed, that reads as "David Lambright, David Lambright",
 * which looks like a mistake and spends a two-win budget on one name. So each opponent appears
 * once, under the strongest reason they ever qualified by, strongest first.
 */
export function topSignificantWins<T extends GuideWin>(wins: readonly T[], max: number): T[] {
  const best = new Map<string, T>()
  for (const win of wins) {
    const key = win.opponent.trim().toLowerCase()
    if (!key) continue
    const existing = best.get(key)
    if (!existing || REASON_ORDER[win.reason] < REASON_ORDER[existing.reason]) best.set(key, win)
  }
  return [...best.values()].sort((a, b) => REASON_ORDER[a.reason] - REASON_ORDER[b.reason]).slice(0, max)
}

/** "Jesse Farnsworth (NC ranked)" — the opponent and why the win counts, nothing more. */
export function formatWin(win: GuideWin): string {
  const tag =
    win.reason === "national-ranked"
      ? win.nationalRankLabel || "nationally ranked"
      : win.reason === "toc-field"
        ? "TOC field"
        : "NC ranked"
  return `${win.opponent} (${tag})`
}

/**
 * "NHSCA '25 7th All-American (5-2)" — the national line.
 *
 * A placement is the credential; a record without one is context. Most of this field has the
 * latter — 1-2 and 2-2 showings with an empty placement — and printing two of those per
 * tournament would spend a wrestler's whole eighth of a page saying they went to nationals and
 * lost. So placements lead and are kept to two, and a wrestler with none shows their most recent
 * trip only.
 */
export function tournamentPhrase(label: string, rows: TournamentRow[]): string | null {
  const has = (value: string | null | undefined) => Boolean(String(value ?? "").trim())
  const useful = rows.filter((r) => has(r.placement) || has(r.record)).sort((a, b) => b.year - a.year)
  if (useful.length === 0) return null

  const placed = useful.filter((r) => has(r.placement))
  const shown = placed.length > 0 ? placed.slice(0, 2) : useful.slice(0, 1)

  return shown
    .map((r) => {
      const place = String(r.placement ?? "").trim()
      const record = String(r.record ?? "").trim()
      return `${label} ${yy(r.year)}${place ? ` ${place}` : ""}${record ? ` (${record})` : ""}`
    })
    .join(" · ")
}
