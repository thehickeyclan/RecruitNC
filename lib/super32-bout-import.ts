/**
 * Super 32 bouts, narrowed to the North Carolina boys' high school field.
 *
 * The Trackwrestling export is the whole event: high school boys, girls, middle school and
 * elementary brackets, with no division column. Weights overlap — 2025 ran a 173-man boys' 132
 * and a 48-man 132 for another division under the same label — so neither the weight nor the
 * wrestler's age on our side is enough on its own.
 *
 * The high school bracket is found the way the Early Entry import found VA's two brackets: within
 * a weight, everyone linked by a chain of bouts is one bracket, and at each high school weight the
 * boys' field is the largest of them by a wide margin. On the 2025 file this yields 91 North
 * Carolina entrants, the same count as the verified 2025 records list.
 */

/** The fourteen boys' high school weights. Every other label in the file is a youth or girls' weight. */
export const SUPER32_HS_WEIGHTS = new Set([
  "106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285",
])

export type Super32Row = {
  date: string
  weight: string
  round: string
  winner: string
  winnerTeam: string
  result: string
  winType: string
  loser: string
  loserTeam: string
}

/** Excel exports every cell as ="value". */
export function parseTrackwrestlingCells(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1 } else inQuotes = !inQuotes
      continue
    }
    if (ch === "," && !inQuotes) { out.push(cur); cur = ""; continue }
    cur += ch
  }
  out.push(cur)
  return out.map((cell) => cell.replace(/^=/, "").replace(/^"|"$/g, "").trim())
}

export function parseSuper32Csv(text: string): Super32Row[] {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1)
    .map(parseTrackwrestlingCells)
    .filter((cells) => cells.length >= 9)
    .map(([date, weight, round, winner, winnerTeam, result, winType, loser, loserTeam]) => ({
      date: date ?? "",
      weight: weight ?? "",
      round: round ?? "",
      winner: winner ?? "",
      winnerTeam: winnerTeam ?? "",
      result: result ?? "",
      winType: winType ?? "",
      loser: loser ?? "",
      loserTeam: loserTeam ?? "",
    }))
}

/** A wrestler is identified by name and state: two brackets can hold the same name. */
const entrant = (name: string, team: string) => `${name.trim().toLowerCase()}|${team.trim().toUpperCase()}`

/**
 * The rows of the boys' high school bracket at each high school weight, byes included (they
 * carry the bracket's shape and are dropped by the caller).
 */
export function highSchoolBracketRows(rows: readonly Super32Row[]): Super32Row[] {
  const out: Super32Row[] = []
  const byWeight = new Map<string, Super32Row[]>()
  for (const row of rows) {
    if (!SUPER32_HS_WEIGHTS.has(row.weight)) continue
    byWeight.set(row.weight, [...(byWeight.get(row.weight) ?? []), row])
  }
  for (const weightRows of byWeight.values()) {
    const parent = new Map<string, string>()
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x)
      let root = x
      while (parent.get(root) !== root) root = parent.get(root)!
      parent.set(x, root)
      return root
    }
    for (const row of weightRows) {
      const a = find(entrant(row.winner, row.winnerTeam))
      if (row.loser) parent.set(a, find(entrant(row.loser, row.loserTeam)))
    }
    const size = new Map<string, number>()
    for (const key of parent.keys()) size.set(find(key), (size.get(find(key)) ?? 0) + 1)
    const largest = [...size.entries()].sort((x, y) => y[1] - x[1])[0]?.[0]
    for (const row of weightRows) {
      if (find(entrant(row.winner, row.winnerTeam)) === largest) out.push(row)
    }
  }
  return out
}
