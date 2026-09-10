/** Tournament of Champions — adaptive 8-person or 16-slot double-elimination draw. */

export type TocBracketParticipant = {
  athleteId: string
  invitationId: string
  seed: number
  name: string
  /**
   * Club, never the high school.
   *
   * TOC wrestlers compete unattached, and the public field page has never named a school —
   * `public-announced-field.ts` rule 3, with a test asserting no school reaches that payload.
   * The bracket carried one anyway, which nobody minded while brackets were admin-only and which
   * would have put a school beside every name the moment they went public.
   */
  club: string | null
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
  previewFieldSize?: number
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
  athleteFieldLocked?: boolean
  athleteFieldLockedAt?: string | null
}

/**
 * No bracket payload may name a high school.
 *
 * TOC wrestlers compete unattached. The public field page has enforced that since it was written
 * and the bracket did not, which nobody noticed while brackets were admin-only — it would have
 * put a school beside all eighty names the minute they went public. Affiliation is the club, or
 * "Unaffiliated", and there is no third option.
 */
export function assertNoSchoolInDraw(draw: { participants: readonly Record<string, unknown>[] }): void {
  for (const participant of draw.participants) {
    if ("school" in participant || "highschool" in participant) {
      throw new Error(`Bracket participant carries a school: ${JSON.stringify(participant)}`)
    }
  }
}
