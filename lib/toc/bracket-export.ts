import type { TocFieldAthlete, TocWeightBoard } from "@/lib/toc/field-board"
import { standardSeedPairs } from "@/lib/bracket/single-elim-layout"

/** Standard 8-person double-elimination first-round pairings by seed (#1 top bookend, #2 bottom). */
export const TOC_EIGHT_MAN_DE_ROUND1 = [
  { match: 1, top: 1, bottom: 8 },
  { match: 2, top: 4, bottom: 5 },
  { match: 3, top: 3, bottom: 6 },
  { match: 4, top: 7, bottom: 2 },
] as const

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "Athlete", lastName: "" }
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** TrackWrestling / generic roster import — confirmed wrestlers only, sorted by seed. */
export function buildTocWeightRosterCsv(board: TocWeightBoard, includeInvited = false): string {
  const rows = board.athletes.filter((a) =>
    includeInvited ? a.status === "confirmed" || a.status === "invited" : a.status === "confirmed",
  )

  const sorted = [...rows].sort((a, b) => {
    if (a.seed != null && b.seed != null) return a.seed - b.seed
    if (a.seed != null) return -1
    if (b.seed != null) return 1
    return a.name.localeCompare(b.name)
  })

  const header = ["Weight", "Seed", "Last Name", "First Name", "School", "Status"]
  const lines = [header.join(",")]

  for (const a of sorted) {
    const { firstName, lastName } = splitName(a.name)
    lines.push(
      [
        String(board.weightClass),
        a.seed != null ? String(a.seed) : "",
        csvEscape(lastName),
        csvEscape(firstName),
        csvEscape(a.school ?? ""),
        a.status,
      ].join(","),
    )
  }

  return lines.join("\n")
}

export function buildTocAllWeightsRosterCsv(weights: TocWeightBoard[], includeInvited = false): string {
  const blocks = weights
    .filter((w) => w.athletes.some((a) => (includeInvited ? a.status !== "declined" && a.status !== "withdrew" : a.status === "confirmed")))
    .map((w) => buildTocWeightRosterCsv(w, includeInvited))
    .filter((block) => block.split("\n").length > 1)

  return blocks.join("\n\n")
}

/** Human-readable seed chart for ops — paste into TrackWrestling notes or print for table workers. */
export function buildTocSeedChartText(board: TocWeightBoard): string | null {
  const confirmed = board.athletes
    .filter((a) => a.status === "confirmed")
    .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99) || a.name.localeCompare(b.name))

  if (confirmed.length === 0) return null

  const bySeed = new Map<number, TocFieldAthlete>()
  for (const a of confirmed) {
    if (a.seed != null) bySeed.set(a.seed, a)
  }

  const bracketSize = confirmed.length > 8 ? 16 : 8
  const lines = [`${board.weightClass} lbs — ${bracketSize === 16 ? `${confirmed.length}-person / 16-slot` : "8-person"} double elimination`, ""]

  for (const a of confirmed) {
    lines.push(`Seed ${a.seed ?? "?"}: ${a.name}${a.school ? ` (${a.school})` : ""}`)
  }

  const hasCompleteSeeds = confirmed.every((athlete, index) => bySeed.has(index + 1))
  if (confirmed.length >= 8 && confirmed.length <= 12 && hasCompleteSeeds) {
    lines.push("", bracketSize === 16 ? "Round of 16:" : "Round 1:")
    const pairs = bracketSize === 16
      ? standardSeedPairs(16).map(([top, bottom], index) => ({ match: index + 1, top, bottom }))
      : [...TOC_EIGHT_MAN_DE_ROUND1]
    for (const m of pairs) {
      const top = bySeed.get(m.top)
      const bottom = bySeed.get(m.bottom)
      lines.push(
        `  Match ${m.match}: ${top ? `(#${m.top}) ${top.name}` : "BYE"} vs ${bottom ? `(#${m.bottom}) ${bottom.name}` : "BYE"}`,
      )
    }
  } else {
    lines.push("", "(Assign contiguous seeds once at least eight wrestlers are confirmed to generate opening pairings.)")
  }

  return lines.join("\n")
}
