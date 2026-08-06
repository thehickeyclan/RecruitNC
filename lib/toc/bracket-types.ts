/** Tournament of Champions — adaptive 8-person or 16-slot double-elimination draw. */

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
  format: "8-man-de" | "16-slot-de"
  bracketSize?: 8 | 16
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
