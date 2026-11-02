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

/**
 * Two shapes reach this parser.
 *
 * The Trackwrestling export is positional — date, weight, round, winner, team, result, type,
 * loser, team — with every cell written ="value". The collected files are an ordinary CSV with a
 * named header: `tournament,weight,round,bout_number,winner_name,winner_team,loser_name,
 * loser_team,result_type,score,time`, which is what the girls' brackets and the Southeast
 * regionals already use. Reading the header when there is one means a new file loads without a
 * new importer, and a column order that changes cannot silently shift everybody's team into the
 * score.
 */
export function parseSuper32Csv(text: string): Super32Row[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return []
  const header = parseTrackwrestlingCells(lines[0]!).map((h) => h.toLowerCase().trim())
  const at = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n)
      if (i >= 0) return i
    }
    return -1
  }
  const iWinner = at("winner_name", "winning wrestler")
  const iLoser = at("loser_name", "losing wrestler")

  // Named header: map by name. Otherwise the positional Trackwrestling layout.
  if (iWinner >= 0 && iLoser >= 0) {
    const iWeight = at("weight", "weight_class")
    const iRound = at("round")
    const iWinTeam = at("winner_team", "winner_state", "winning team")
    const iLoseTeam = at("loser_team", "loser_state", "losing team")
    const iType = at("result_type", "win type", "win_type")
    const iScore = at("score", "result")
    const iTime = at("time")
    const iDate = at("date", "event_date")
    return lines.slice(1).map(parseTrackwrestlingCells).flatMap((c) => {
      const winner = (c[iWinner] ?? "").trim()
      if (!winner) return []
      return [{
        date: iDate >= 0 ? (c[iDate] ?? "") : "",
        weight: iWeight >= 0 ? (c[iWeight] ?? "") : "",
        round: iRound >= 0 ? (c[iRound] ?? "") : "",
        winner,
        winnerTeam: iWinTeam >= 0 ? (c[iWinTeam] ?? "") : "",
        // The score and the clock are one field downstream, as they are on a profile line.
        result: [iScore >= 0 ? c[iScore] : "", iTime >= 0 ? c[iTime] : ""].map((x) => (x ?? "").trim()).filter(Boolean).join(" "),
        winType: iType >= 0 ? (c[iType] ?? "") : "",
        loser: (c[iLoser] ?? "").trim(),
        loserTeam: iLoseTeam >= 0 ? (c[iLoseTeam] ?? "") : "",
      }]
    })
  }

  return lines
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
/**
 * The eleven high school girls' weights.
 *
 * A different slate from the boys', and it overlaps in three places (106, 132, 138) where the
 * girls' bracket is simply the smaller of the two components. The hard part is 95, 100 and 112,
 * which the girls share with a youth division: at 100 the two brackets hold twenty-eight
 * wrestlers each, so size cannot tell them apart and the names have to.
 */
export const SUPER32_GIRLS_WEIGHTS = new Set([
  "95", "100", "106", "112", "118", "124", "132", "138", "148", "160", "200",
])

/**
 * Enough of a first-name signal to tell a girls' bracket from a boys' one, in aggregate.
 *
 * Not a claim about any one wrestler - a name says nothing reliable about a person, and nothing
 * here is used to decide an individual's gender. It is used only to choose between two whole
 * brackets at one weight, where the answer is lopsided: on the 2025 file every girls' bracket
 * scores 54% or higher and every other bracket 30% or lower, so the threshold sits in a gap
 * forty points wide. A bracket is never classified on this alone - it must also be at one of the
 * eleven girls' weights.
 */
const FEMININE_ENDING = /(a|ah|ia|ya|ee|ie|y|yn|lyn|ette|elle|een|ina|ana|essa|issa)$/
const MASCULINE_FIRST_NAMES = new Set(
  `aiden aidan jack james john michael william david daniel joseph matthew anthony brady brayden braxton bryson
   caleb cameron carter chase christian cody colton connor cooper dominic dylan easton eli elijah ethan evan
   gabriel gavin grayson henry hunter isaac jace jackson jacob jaxon jayden jeremiah jonathan jordan joshua
   julian kaden kayden landon leo levi liam lincoln logan lucas luke mason nathan nicholas noah nolan oliver
   owen parker ryan samuel sawyer sebastian thomas tyler wyatt xavier zachary zane beau brison atticus abram
   brixton camron benjamin avery angel alonzo antonio`.split(/\s+/),
)
const FEMININE_FIRST_NAMES = new Set(
  `abigail addison alexandria allie alysa bella breanna brianna cassidy emma olivia ava sophia isabella mia
   charlotte amelia harper evelyn abby grace chloe lily zoey zoe nora riley aubrey ella scarlett victoria
   madison luna hazel violet aurora savannah audrey brooklyn claire skylar paisley everly anna caroline nova
   genesis emilia kennedy maya willow kinsley naomi aaliyah elena sarah ariana allison gabriella alice madelyn
   cora ruby eva serenity autumn adeline hailey gianna valentina isla eliana quinn nevaeh ivy sadie piper lydia
   alexa josephine emery julia delilah arianna vivian kaylee sophie brielle madeline peyton rylee clara hadley
   melanie mackenzie reagan adalynn liliana aubree jade katherine isabelle natalie raelynn maria athena ximena
   arya leilani taylor faith rose kylie alexandra mary margaret lyla ashley amaya eliza bailey andrea khloe
   jasmine melody iris isabel norah annabelle valeria kayla sara`.split(/\s+/),
)

export function feminineNameShare(names: readonly string[]): number {
  let score = 0
  let counted = 0
  for (const name of names) {
    const first = String(name ?? "").trim().toLowerCase().split(/\s+/)[0]
    if (!first) continue
    counted += 1
    if (FEMININE_FIRST_NAMES.has(first)) score += 1
    else if (MASCULINE_FIRST_NAMES.has(first)) continue
    else if (FEMININE_ENDING.test(first)) score += 0.75
  }
  return counted ? score / counted : 0
}

/** Within a weight, everyone linked by a chain of bouts is one bracket. */
function componentsAtWeight(weightRows: readonly Super32Row[]): Super32Row[][] {
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
  const byRoot = new Map<string, Super32Row[]>()
  for (const row of weightRows) {
    const root = find(entrant(row.winner, row.winnerTeam))
    byRoot.set(root, [...(byRoot.get(root) ?? []), row])
  }
  return [...byRoot.values()].sort((a, b) => b.length - a.length)
}

const entrantsOf = (rows: readonly Super32Row[]): string[] => [
  ...new Set(rows.flatMap((r) => [r.winner, r.loser]).filter(Boolean) as string[]),
]

/**
 * The high school girls' bracket at each girls' weight.
 *
 * Two tests, and a bracket has to pass both: the weight is one of the eleven, and the names in
 * it are mostly girls' names. The weight alone is not enough, because 95, 100 and 112 also carry
 * a youth boys' bracket; the names alone are not enough either, and on the 2025 file would have
 * taken a thirteen-man bracket at 175 that is not a girls' weight at all.
 *
 * The export carries no age or grade, so if the event ever runs a separate middle school girls'
 * division at these weights this cannot see it. The division has to come from the source then.
 */
export function girlsBracketRows(rows: readonly Super32Row[]): Super32Row[] {
  const out: Super32Row[] = []
  const byWeight = new Map<string, Super32Row[]>()
  for (const row of rows) {
    if (!SUPER32_GIRLS_WEIGHTS.has(row.weight)) continue
    byWeight.set(row.weight, [...(byWeight.get(row.weight) ?? []), row])
  }
  for (const weightRows of byWeight.values()) {
    const scored = componentsAtWeight(weightRows)
      .map((component) => ({ component, share: feminineNameShare(entrantsOf(component)) }))
      .filter((c) => c.share >= 0.4)
      .sort((a, b) => b.share - a.share)
    if (scored[0]) out.push(...scored[0].component)
  }
  return out
}

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
