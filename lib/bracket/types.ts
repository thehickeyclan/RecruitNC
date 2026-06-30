/** Generic tournament bracket display model — any power-of-2 single-elimination size. */

export type BracketSize = 4 | 8 | 16 | 32 | 64

export type BracketSlotDisplay = {
  /** Primary line — wrestler name or feeder label. */
  name: string
  /** School, state, etc. */
  subtitle?: string | null
  seed?: number | null
  isOpen?: boolean
  photoUrl?: string | null
  competitorId?: string | null
}

export type BracketMatchDisplay = {
  id: string
  roundIndex: number
  matchIndex: number
  roundLabel: string
  boutNumber?: number
  top: BracketSlotDisplay
  bottom: BracketSlotDisplay
}

export type BracketTreeDisplay = {
  size: BracketSize
  title?: string
  /** rounds[0] = first competitive round (most matches). */
  rounds: BracketMatchDisplay[][]
}

export type BracketLayoutMatch = BracketMatchDisplay & {
  x: number
  y: number
  width: number
  height: number
  centerY: number
}

export type BracketConnector = {
  id: string
  path: string
}

export type BracketLayout = {
  width: number
  height: number
  slotHeight: number
  matchWidth: number
  roundGap: number
  matches: BracketLayoutMatch[]
  connectors: BracketConnector[]
  roundLabels: { roundIndex: number; label: string; x: number }[]
}

export type BracketTheme = {
  bg?: string
  slotBg?: string
  slotBorder?: string
  slotOpenText?: string
  slotText?: string
  slotSubtext?: string
  seedBg?: string
  seedOpenBg?: string
  connector?: string
  roundLabel?: string
  highlight?: string
}
