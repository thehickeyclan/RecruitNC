import type { TocFieldAthlete, TocWeightBoard } from "@/lib/toc/field-board"

/** Standard 8-person double-elimination first-round pairings by seed. */
export const TOC_EIGHT_MAN_DE_ROUND1 = [
  { match: 1, top: 1, bottom: 8 },
  { match: 2, top: 4, bottom: 5 },
  { match: 3, top: 2, bottom: 7 },
  { match: 4, top: 3, bottom: 6 },
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

  const lines = [`${board.weightClass} lbs — 8-man double elimination`, ""]

  for (const a of confirmed) {
    lines.push(`Seed ${a.seed ?? "?"}: ${a.name}${a.school ? ` (${a.school})` : ""}`)
  }

  if (confirmed.length === 8 && [...bySeed.keys()].length === 8) {
    lines.push("", "Round 1:")
    for (const m of TOC_EIGHT_MAN_DE_ROUND1) {
      const top = bySeed.get(m.top)
      const bottom = bySeed.get(m.bottom)
      lines.push(
        `  Match ${m.match}: (#${m.top}) ${top?.name ?? "?"} vs (#${m.bottom}) ${bottom?.name ?? "?"}`,
      )
    }
  } else {
    lines.push("", "(Assign seeds 1–8 when the bracket is full to generate Round 1 pairings.)")
  }

  return lines.join("\n")
}
