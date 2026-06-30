/** Tournament of Champions — 8-man double-elimination bracket draw (Phase 1). */

export type TocBracketParticipant = {
  athleteId: string
  invitationId: string
  seed: number
  name: string
  school: string | null
  photoUrl: string | null
  graduationYear: number | null
  isPlaceholder?: boolean
}

export type TocBracketSlot =
  | { kind: "athlete"; athleteId: string }
  | { kind: "feeder"; boutNumber: number; label: string }
  | { kind: "empty"; label: string }

export type TocBracketSide = "winners" | "losers" | "placement"

export type TocBracketBout = {
  id: string
  boutNumber: number
  roundLabel: string
  side: TocBracketSide
  top: TocBracketSlot
  bottom: TocBracketSlot
  winnerAthleteId: string | null
  status: "scheduled" | "complete"
}

export type TocBracketDraw = {
  weightClass: number
  format: "8-man-de"
  lockedAt: string
  confirmedCount: number
  openSpots: number
  isComplete: boolean
  participants: TocBracketParticipant[]
  bouts: TocBracketBout[]
}

export type TocBracketDrawSummary = {
  weightClass: number
  lockedAt: string
  participantCount: number
  confirmedCount: number
  isComplete: boolean
  source: "locked" | "live"
}
