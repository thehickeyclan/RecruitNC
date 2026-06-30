import type {
  BracketConnector,
  BracketLayout,
  BracketLayoutMatch,
  BracketMatchDisplay,
  BracketSize,
  BracketSlotDisplay,
  BracketTreeDisplay,
} from "@/lib/bracket/types"

export const BRACKET_SIZES: BracketSize[] = [4, 8, 16, 32, 64]

export function isBracketSize(n: number): n is BracketSize {
  return BRACKET_SIZES.includes(n as BracketSize)
}

/** Vertical center Y for match `matchIndex` in round `roundIndex` (0 = first round). */
export function matchCenterY(
  roundIndex: number,
  matchIndex: number,
  slotHeight: number,
  matchGap: number,
): number {
  const matchBlock = slotHeight * 2
  const stride = (matchBlock + matchGap) * 2 ** roundIndex
  return matchIndex * stride + stride / 2
}

export function totalBracketHeight(size: BracketSize, slotHeight: number, matchGap: number): number {
  const matchBlock = slotHeight * 2
  const firstRoundMatches = size / 2
  return firstRoundMatches * (matchBlock + matchGap) - matchGap
}

export function roundLabelsForSize(size: BracketSize): string[] {
  const rounds = Math.log2(size)
  if (size === 4) return ["Semifinals", "Final"]
  if (size === 8) return ["Quarterfinals", "Semifinals", "Final"]
  if (size === 16) return ["Round of 16", "Quarterfinals", "Semifinals", "Final"]
  if (size === 32) return ["Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"]
  return ["Round of 64", "Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"]
}

function connectorPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  midX: number,
): string {
  return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`
}

function isStandardSingleElimTree(tree: BracketTreeDisplay): boolean {
  for (let i = 1; i < tree.rounds.length; i++) {
    if (tree.rounds[i].length !== tree.rounds[i - 1].length / 2) return false
  }
  return true
}

/** Column layout when rounds don't halve (e.g. wrestling consolation). */
export function layoutColumnBracket(
  tree: BracketTreeDisplay,
  options?: {
    slotHeight?: number
    matchWidth?: number
    roundGap?: number
    padding?: number
  },
): BracketLayout {
  const slotHeight = options?.slotHeight ?? 36
  const matchWidth = options?.matchWidth ?? 220
  const roundGap = options?.roundGap ?? 44
  const padding = options?.padding ?? 20
  const matchBlock = slotHeight * 2
  const matchGap = 8
  const maxMatches = Math.max(...tree.rounds.map((r) => r.length))
  const totalHeight = maxMatches * (matchBlock + matchGap) - matchGap

  const matches: BracketLayoutMatch[] = []
  const connectors: BracketConnector[] = []
  const roundLabels: BracketLayout['roundLabels'] = []

  for (let roundIndex = 0; roundIndex < tree.rounds.length; roundIndex++) {
    const round = tree.rounds[roundIndex]
    const x = padding + roundIndex * (matchWidth + roundGap)
    const label = round[0]?.roundLabel ?? `Round ${roundIndex + 1}`
    roundLabels.push({ roundIndex, label, x: x + matchWidth / 2 })

    const colHeight = round.length * (matchBlock + matchGap) - matchGap
    const colOffset = (totalHeight - colHeight) / 2

    for (let matchIndex = 0; matchIndex < round.length; matchIndex++) {
      const match = round[matchIndex]
      const y = padding + colOffset + matchIndex * (matchBlock + matchGap)
      const centerY = y + matchBlock / 2

      matches.push({
        ...match,
        x,
        y,
        width: matchWidth,
        height: matchBlock,
        centerY,
      })

      if (roundIndex < tree.rounds.length - 1) {
        const nextRound = tree.rounds[roundIndex + 1]
        const nextMatchIndex = Math.min(matchIndex, nextRound.length - 1)
        const nextX = padding + (roundIndex + 1) * (matchWidth + roundGap)
        const nextColHeight = nextRound.length * (matchBlock + matchGap) - matchGap
        const nextColOffset = (totalHeight - nextColHeight) / 2
        const nextY = padding + nextColOffset + nextMatchIndex * (matchBlock + matchGap)
        const nextCenterY = nextY + matchBlock / 2
        const exitX = x + matchWidth
        const enterX = nextX
        const midX = exitX + roundGap / 2

        connectors.push({
          id: `c-${match.id}`,
          path: connectorPath(exitX, centerY, enterX, nextCenterY, midX),
        })
      }
    }
  }

  const width =
    padding * 2 + tree.rounds.length * matchWidth + Math.max(0, tree.rounds.length - 1) * roundGap + 40

  return {
    width,
    height: totalHeight + padding * 2,
    slotHeight,
    matchWidth,
    roundGap,
    matches,
    connectors,
    roundLabels,
  }
}

export function layoutBracketTree(
  tree: BracketTreeDisplay,
  options?: Parameters<typeof layoutSingleElimBracket>[1],
): BracketLayout {
  return isStandardSingleElimTree(tree) ? layoutSingleElimBracket(tree, options) : layoutColumnBracket(tree, options)
}

export function layoutSingleElimBracket(
  tree: BracketTreeDisplay,
  options?: {
    slotHeight?: number
    matchWidth?: number
    roundGap?: number
    padding?: number
  },
): BracketLayout {
  const slotHeight = options?.slotHeight ?? 36
  const matchWidth = options?.matchWidth ?? 220
  const roundGap = options?.roundGap ?? 44
  const padding = options?.padding ?? 20
  const matchBlock = slotHeight * 2
  const matchGap = 8
  const totalHeight = totalBracketHeight(tree.size, slotHeight, matchGap)

  const matches: BracketLayoutMatch[] = []
  const connectors: BracketConnector[] = []
  const roundLabels: BracketLayout['roundLabels'] = []

  for (let roundIndex = 0; roundIndex < tree.rounds.length; roundIndex++) {
    const round = tree.rounds[roundIndex]
    const x = padding + roundIndex * (matchWidth + roundGap)
    const label = round[0]?.roundLabel ?? roundLabelsForSize(tree.size)[roundIndex] ?? `Round ${roundIndex + 1}`
    roundLabels.push({ roundIndex, label, x: x + matchWidth / 2 })

    for (let matchIndex = 0; matchIndex < round.length; matchIndex++) {
      const match = round[matchIndex]
      const centerY = matchCenterY(roundIndex, matchIndex, slotHeight, matchGap)
      const y = centerY - matchBlock / 2

      const layoutMatch: BracketLayoutMatch = {
        ...match,
        x,
        y,
        width: matchWidth,
        height: matchBlock,
        centerY,
      }
      matches.push(layoutMatch)

      if (roundIndex < tree.rounds.length - 1) {
        const nextRoundIndex = roundIndex + 1
        const nextMatchIndex = Math.floor(matchIndex / 2)
        const nextX = padding + nextRoundIndex * (matchWidth + roundGap)
        const nextCenterY = matchCenterY(nextRoundIndex, nextMatchIndex, slotHeight, matchGap)
        const exitX = x + matchWidth
        const enterX = nextX
        const midX = exitX + roundGap / 2

        connectors.push({
          id: `c-${match.id}`,
          path: connectorPath(exitX, centerY, enterX, nextCenterY, midX),
        })
      }
    }
  }

  const width =
    padding * 2 + tree.rounds.length * matchWidth + Math.max(0, tree.rounds.length - 1) * roundGap + 80

  return {
    width,
    height: totalHeight + padding * 2,
    slotHeight,
    matchWidth,
    roundGap,
    matches,
    connectors,
    roundLabels,
  }
}

/** Build empty single-elim skeleton for any bracket size (TBD slots). */
export function buildEmptySingleElimTree(size: BracketSize, title?: string): BracketTreeDisplay {
  const labels = roundLabelsForSize(size)
  const rounds: BracketMatchDisplay[][] = []
  let roundSize = size / 2

  for (let r = 0; r < labels.length; r++) {
    const round: BracketMatchDisplay[] = []
    for (let m = 0; m < roundSize; m++) {
      round.push({
        id: `r${r}-m${m}`,
        roundIndex: r,
        matchIndex: m,
        roundLabel: labels[r],
        top: { name: "TBD", isOpen: true },
        bottom: { name: "TBD", isOpen: true },
      })
    }
    rounds.push(round)
    roundSize = Math.max(1, roundSize / 2)
  }

  return { size, title, rounds }
}

/** Standard seed line for first round: 1v8, 4v5, 2v7, 3v6 scaled to size. */
export function standardSeedPairs(size: BracketSize): Array<[number, number]> {
  if (size === 4) return [[1, 4], [2, 3]]
  if (size === 8) return [[1, 8], [4, 5], [2, 7], [3, 6]]
  // Recursive bracket seeding for larger sizes
  const pairs: Array<[number, number]> = []
  const half = size / 2
  for (let i = 1; i <= half; i++) {
    pairs.push([i, size + 1 - i])
  }
  // Reorder for standard bracket layout (1-8, 4-5, 2-7, 3-6 pattern extended)
  if (size === 16) {
    return [
      [1, 16], [8, 9], [4, 13], [5, 12],
      [2, 15], [7, 10], [3, 14], [6, 11],
    ]
  }
  if (size === 32) {
    return Array.from({ length: 16 }, (_, i) => {
      const seeds = standardSixteenSeedOrder()
      const a = seeds[i * 2]
      const b = seeds[i * 2 + 1]
      return [a, b] as [number, number]
    })
  }
  return pairs
}

function standardSixteenSeedOrder(): number[] {
  return [
    1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11,
    17, 32, 24, 25, 20, 29, 21, 28, 18, 31, 23, 26, 19, 30, 22, 27,
  ]
}

export type SeededCompetitor = {
  id: string
  seed: number
  name: string
  subtitle?: string | null
  photoUrl?: string | null
  isPlaceholder?: boolean
}

export function buildSingleElimTreeFromSeeds(
  size: BracketSize,
  competitors: SeededCompetitor[],
  title?: string,
): BracketTreeDisplay {
  const bySeed = new Map<number, SeededCompetitor>()
  for (const c of competitors) bySeed.set(c.seed, c)

  const open = (seed: number): BracketSlotDisplay => ({
    name: "TBD",
    seed,
    isOpen: true,
  })

  const fromCompetitor = (c: SeededCompetitor): BracketSlotDisplay => ({
    name: c.isPlaceholder ? "TBD" : c.name,
    subtitle: c.subtitle,
    seed: c.seed,
    isOpen: c.isPlaceholder,
    photoUrl: c.photoUrl,
    competitorId: c.id,
  })

  const labels = roundLabelsForSize(size)
  const pairs = standardSeedPairs(size)
  const rounds: BracketMatchDisplay[][] = []

  // Round 0 — seeded
  rounds.push(
    pairs.map(([topSeed, bottomSeed], matchIndex) => {
      const topC = bySeed.get(topSeed)
      const bottomC = bySeed.get(bottomSeed)
      return {
        id: `r0-m${matchIndex}`,
        roundIndex: 0,
        matchIndex,
        roundLabel: labels[0],
        top: topC ? fromCompetitor(topC) : open(topSeed),
        bottom: bottomC ? fromCompetitor(bottomC) : open(bottomSeed),
      }
    }),
  )

  // Later rounds — feeders until results exist
  let roundSize = pairs.length / 2
  for (let r = 1; r < labels.length; r++) {
    const round: BracketMatchDisplay[] = []
    for (let m = 0; m < roundSize; m++) {
      const feederA = r === 1 ? `Winner R1-${m * 2 + 1}` : `Winner R${r}-${m * 2 + 1}`
      const feederB = r === 1 ? `Winner R1-${m * 2 + 2}` : `Winner R${r}-${m * 2 + 2}`
      round.push({
        id: `r${r}-m${m}`,
        roundIndex: r,
        matchIndex: m,
        roundLabel: labels[r],
        top: { name: feederA, isOpen: true },
        bottom: { name: feederB, isOpen: true },
      })
    }
    rounds.push(round)
    roundSize = Math.max(1, roundSize / 2)
  }

  return { size, title, rounds }
}
