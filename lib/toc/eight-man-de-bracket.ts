import { TOC_EIGHT_MAN_DE_ROUND1 } from "@/lib/toc/bracket-export"
import { standardSeedPairs } from "@/lib/bracket/single-elim-layout"
import type { TocBracketBout, TocBracketDraw, TocBracketParticipant, TocBracketSlot } from "@/lib/toc/bracket-types"
import { TOC_MAX_CONFIRMED_PER_WEIGHT } from "@/lib/toc/invitations"

export function isPlaceholderParticipant(participant: TocBracketParticipant): boolean {
  return participant.isPlaceholder === true || participant.athleteId.startsWith("__toc_open_")
}

function athleteSlot(athleteId: string): TocBracketSlot {
  return { kind: "athlete", athleteId }
}

function feederSlot(boutNumber: number, label: string): TocBracketSlot {
  return { kind: "feeder", boutNumber, label }
}

function openSlot(seed: number, label = "Open"): TocBracketSlot {
  return { kind: "empty", label: `Seed ${seed} · ${label}` }
}

function bout(
  weightClass: number,
  boutNumber: number,
  roundLabel: string,
  side: TocBracketBout["side"],
  top: TocBracketSlot,
  bottom: TocBracketSlot,
): TocBracketBout {
  return {
    id: `toc-${weightClass}-b${boutNumber}`,
    boutNumber,
    roundLabel,
    side,
    top,
    bottom,
    winnerAthleteId: null,
    status: "scheduled",
  }
}

export function placeholderParticipant(weightClass: number, seed: number): TocBracketParticipant {
  return {
    athleteId: `__toc_open_${weightClass}_${seed}__`,
    invitationId: `__toc_open_${weightClass}_${seed}__`,
    seed,
    name: "Open spot",
    school: null,
    photoUrl: null,
    graduationYear: null,
    isPlaceholder: true,
  }
}

function seedSlot(bySeed: Map<number, TocBracketParticipant>, seed: number): TocBracketSlot {
  const wrestler = bySeed.get(seed)
  if (wrestler && !isPlaceholderParticipant(wrestler)) return athleteSlot(wrestler.athleteId)
  return openSlot(seed)
}

function byeSeedSlot(bySeed: Map<number, TocBracketParticipant>, seed: number): TocBracketSlot {
  const wrestler = bySeed.get(seed)
  if (wrestler && !isPlaceholderParticipant(wrestler)) return athleteSlot(wrestler.athleteId)
  return openSlot(seed, "Bye")
}

/** Standard 8-man DE bout template — open seeds show as TBD in round 1. */
function buildEightManDeBouts(weightClass: number, bySeed: Map<number, TocBracketParticipant>): TocBracketBout[] {
  const r1 = TOC_EIGHT_MAN_DE_ROUND1.map((pair, index) =>
    bout(
      weightClass,
      index + 1,
      "Round 1",
      "winners",
      seedSlot(bySeed, pair.top),
      seedSlot(bySeed, pair.bottom),
    ),
  )

  return [
    ...r1,
    bout(weightClass, 5, "Consolation R1", "losers", feederSlot(1, "Loser Bout 1"), feederSlot(2, "Loser Bout 2")),
    bout(weightClass, 6, "Consolation R1", "losers", feederSlot(3, "Loser Bout 3"), feederSlot(4, "Loser Bout 4")),
    bout(weightClass, 7, "Winners semifinals", "winners", feederSlot(1, "Winner Bout 1"), feederSlot(2, "Winner Bout 2")),
    bout(weightClass, 8, "Winners semifinals", "winners", feederSlot(3, "Winner Bout 3"), feederSlot(4, "Winner Bout 4")),
    bout(weightClass, 9, "Consolation semifinals", "losers", feederSlot(8, "Loser Bout 8"), feederSlot(5, "Winner Bout 5")),
    bout(weightClass, 10, "Consolation semifinals", "losers", feederSlot(6, "Winner Bout 6"), feederSlot(7, "Loser Bout 7")),
    bout(weightClass, 11, "Championship", "placement", feederSlot(7, "Winner Bout 7"), feederSlot(8, "Winner Bout 8")),
    bout(weightClass, 12, "3rd place", "placement", feederSlot(9, "Winner Bout 9"), feederSlot(10, "Winner Bout 10")),
  ]
}

/** 16-slot true double-elimination flow used only when a weight has 9–12 wrestlers. */
function buildSixteenSlotDeBouts(
  weightClass: number,
  bySeed: Map<number, TocBracketParticipant>,
  fieldSize: number,
): TocBracketBout[] {
  const r1 = standardSeedPairs(16).map((pair, index) =>
    bout(
      weightClass,
      index + 1,
      "Round of 16",
      "winners",
      pair[0] <= fieldSize ? seedSlot(bySeed, pair[0]) : byeSeedSlot(bySeed, pair[0]),
      pair[1] <= fieldSize ? seedSlot(bySeed, pair[1]) : byeSeedSlot(bySeed, pair[1]),
    ),
  )

  return [
    ...r1,
    bout(weightClass, 9, "Quarterfinals", "winners", feederSlot(1, "Winner Bout 1"), feederSlot(2, "Winner Bout 2")),
    bout(weightClass, 10, "Quarterfinals", "winners", feederSlot(3, "Winner Bout 3"), feederSlot(4, "Winner Bout 4")),
    bout(weightClass, 11, "Quarterfinals", "winners", feederSlot(5, "Winner Bout 5"), feederSlot(6, "Winner Bout 6")),
    bout(weightClass, 12, "Quarterfinals", "winners", feederSlot(7, "Winner Bout 7"), feederSlot(8, "Winner Bout 8")),
    bout(weightClass, 13, "Winners semifinals", "winners", feederSlot(9, "Winner Bout 9"), feederSlot(10, "Winner Bout 10")),
    bout(weightClass, 14, "Winners semifinals", "winners", feederSlot(11, "Winner Bout 11"), feederSlot(12, "Winner Bout 12")),
    bout(weightClass, 15, "Championship", "placement", feederSlot(13, "Winner Bout 13"), feederSlot(14, "Winner Bout 14")),
    bout(weightClass, 16, "Consolation R1", "losers", feederSlot(1, "Loser Bout 1"), feederSlot(2, "Loser Bout 2")),
    bout(weightClass, 17, "Consolation R1", "losers", feederSlot(3, "Loser Bout 3"), feederSlot(4, "Loser Bout 4")),
    bout(weightClass, 18, "Consolation R1", "losers", feederSlot(5, "Loser Bout 5"), feederSlot(6, "Loser Bout 6")),
    bout(weightClass, 19, "Consolation R1", "losers", feederSlot(7, "Loser Bout 7"), feederSlot(8, "Loser Bout 8")),
    bout(weightClass, 20, "Consolation R2", "losers", feederSlot(9, "Loser Bout 9"), feederSlot(17, "Winner Bout 17")),
    // Bouts 21/23 and 24/25 are crossed against the obvious pairing on purpose. Collapsed to a
    // nine-man field this reproduces the printed TOC schema: the pigtail loser meets the loser of
    // the 7v2 quarterfinal, and — the part that matters — the pigtail winner and pigtail loser end
    // up in different consolation quarters, so 8 and 9 cannot be made to wrestle each other again
    // two matches after they first did. Pairing them straight through allows exactly that.
    bout(weightClass, 21, "Consolation R2", "losers", feederSlot(12, "Loser Bout 12"), feederSlot(16, "Winner Bout 16")),
    bout(weightClass, 22, "Consolation R2", "losers", feederSlot(11, "Loser Bout 11"), feederSlot(19, "Winner Bout 19")),
    bout(weightClass, 23, "Consolation R2", "losers", feederSlot(10, "Loser Bout 10"), feederSlot(18, "Winner Bout 18")),
    bout(weightClass, 24, "Consolation R3", "losers", feederSlot(20, "Winner Bout 20"), feederSlot(23, "Winner Bout 23")),
    bout(weightClass, 25, "Consolation R3", "losers", feederSlot(22, "Winner Bout 22"), feederSlot(21, "Winner Bout 21")),
    bout(weightClass, 26, "Consolation semifinals", "losers", feederSlot(14, "Loser Bout 14"), feederSlot(24, "Winner Bout 24")),
    bout(weightClass, 27, "Consolation semifinals", "losers", feederSlot(25, "Winner Bout 25"), feederSlot(13, "Loser Bout 13")),
    bout(weightClass, 28, "3rd place", "placement", feederSlot(26, "Winner Bout 26"), feederSlot(27, "Winner Bout 27")),
  ]
}

/** At least one confirmed wrestler with a seed — unique seeds in the supported 1–12 field. */
export function validatePartialBracketPublish(participants: TocBracketParticipant[]): string | null {
  if (participants.length === 0) {
    return `Confirm at least one wrestler and assign a seed (1–${TOC_MAX_CONFIRMED_PER_WEIGHT}) to show this bracket.`
  }

  const seeds = participants.map((p) => p.seed)
  if (seeds.some((s) => s < 1 || s > TOC_MAX_CONFIRMED_PER_WEIGHT)) {
    return `Seeds must be between 1 and ${TOC_MAX_CONFIRMED_PER_WEIGHT}.`
  }
  if (new Set(seeds).size !== seeds.length) {
    return `Each seed 1–${TOC_MAX_CONFIRMED_PER_WEIGHT} can only be used once.`
  }

  return null
}

export function validateBracketParticipants(participants: TocBracketParticipant[]): string | null {
  const real = participants.filter((p) => !isPlaceholderParticipant(p))
  if (real.length < 8 || real.length > TOC_MAX_CONFIRMED_PER_WEIGHT) {
    return `Need between 8 and ${TOC_MAX_CONFIRMED_PER_WEIGHT} confirmed wrestlers (have ${real.length}).`
  }

  const seeds = real.map((p) => p.seed).sort((a, b) => a - b)
  const expected = Array.from({ length: real.length }, (_, i) => i + 1)
  for (let i = 0; i < expected.length; i++) {
    if (seeds[i] !== expected[i]) {
      return `Assign contiguous unique seeds 1–${real.length} to every confirmed wrestler before the draw is complete.`
    }
  }

  return null
}

export function buildEightManDeDraw(
  weightClass: number,
  seededParticipants: TocBracketParticipant[],
  lockedAt: string,
  /**
   * How many wrestlers the weight actually holds, when that is known and larger than the number
   * seeded so far. Not restricted to the admin's 8/10/12 preview tiers: a real field can be nine,
   * and rounding nine up to ten invents a tenth wrestler who shows as TBD in the bracket.
   */
  requestedFieldSize?: number,
): TocBracketDraw {
  const publishError = validatePartialBracketPublish(seededParticipants)
  if (publishError) throw new Error(publishError)

  const real = seededParticipants.filter((p) => !isPlaceholderParticipant(p))
  const bySeed = new Map<number, TocBracketParticipant>()
  for (const p of real) bySeed.set(p.seed, p)

  const fieldSize = Math.max(real.length, requestedFieldSize ?? real.length)
  const bracketSize = fieldSize > 8 ? 16 : 8
  const participants = Array.from({ length: bracketSize }, (_, i) => {
    const seed = i + 1
    return bySeed.get(seed) ?? placeholderParticipant(weightClass, seed)
  })

  const isComplete = validateBracketParticipants(real) == null

  return {
    weightClass,
    format: bracketSize === 16 ? "16-slot-de" : "8-man-de",
    bracketSize,
    previewFieldSize: requestedFieldSize,
    lockedAt,
    confirmedCount: real.length,
    openSpots: Math.max(0, (requestedFieldSize ?? (bracketSize === 8 ? 8 : TOC_MAX_CONFIRMED_PER_WEIGHT)) - real.length),
    isComplete: requestedFieldSize == null ? isComplete : real.length === requestedFieldSize && isComplete,
    participants,
    bouts: bracketSize === 16 ? buildSixteenSlotDeBouts(weightClass, bySeed, fieldSize) : buildEightManDeBouts(weightClass, bySeed),
  }
}

export function resolveSlotLabel(
  slot: TocBracketSlot,
  participantByAthleteId: Map<string, TocBracketParticipant>,
): { primary: string; secondary?: string; seed?: number; photoUrl?: string | null; isOpen?: boolean } {
  if (slot.kind === "empty") {
    return { primary: slot.label, isOpen: true }
  }
  if (slot.kind === "athlete") {
    const p = participantByAthleteId.get(slot.athleteId)
    if (!p || isPlaceholderParticipant(p)) return { primary: "Open spot", isOpen: true }
    return {
      primary: p.name,
      secondary: p.school ?? undefined,
      seed: p.seed,
      photoUrl: p.photoUrl,
    }
  }
  return { primary: slot.label }
}

export function roundOneBouts(draw: TocBracketDraw): TocBracketBout[] {
  return draw.bouts.filter((b) => b.roundLabel === "Round 1")
}

export function boutsBySide(draw: TocBracketDraw, side: TocBracketBout["side"]): TocBracketBout[] {
  return draw.bouts.filter((b) => b.side === side)
}
