import { TOC_EIGHT_MAN_DE_ROUND1 } from "@/lib/toc/bracket-export"
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

function openSlot(seed: number): TocBracketSlot {
  return { kind: "empty", label: `Seed ${seed} · Open` }
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
    bout(weightClass, 5, "Winners semifinals", "winners", feederSlot(1, "Winner Bout 1"), feederSlot(2, "Winner Bout 2")),
    bout(weightClass, 6, "Winners semifinals", "winners", feederSlot(3, "Winner Bout 3"), feederSlot(4, "Winner Bout 4")),
    bout(weightClass, 7, "Winners final", "winners", feederSlot(5, "Winner Bout 5"), feederSlot(6, "Winner Bout 6")),
    bout(weightClass, 8, "Consolation R1", "losers", feederSlot(1, "Loser Bout 1"), feederSlot(2, "Loser Bout 2")),
    bout(weightClass, 9, "Consolation R1", "losers", feederSlot(3, "Loser Bout 3"), feederSlot(4, "Loser Bout 4")),
    bout(weightClass, 10, "Consolation R2", "losers", feederSlot(5, "Winner Bout 5"), feederSlot(8, "Winner Bout 8")),
    bout(weightClass, 11, "Consolation R2", "losers", feederSlot(6, "Winner Bout 6"), feederSlot(9, "Winner Bout 9")),
    bout(weightClass, 12, "Consolation semifinals", "losers", feederSlot(10, "Winner Bout 10"), feederSlot(11, "Winner Bout 11")),
    bout(weightClass, 13, "Consolation final", "losers", feederSlot(7, "Loser Bout 7"), feederSlot(12, "Winner Bout 12")),
    bout(weightClass, 14, "Championship", "placement", feederSlot(7, "Winner Bout 7"), feederSlot(13, "Winner Bout 13")),
    bout(weightClass, 15, "3rd place", "placement", feederSlot(7, "Loser Bout 7"), feederSlot(13, "Loser Bout 13")),
  ]
}

/** At least one confirmed wrestler with a seed — unique seeds in 1–8. */
export function validatePartialBracketPublish(participants: TocBracketParticipant[]): string | null {
  if (participants.length === 0) {
    return "Confirm at least one wrestler and assign a seed (1–8) to show this bracket."
  }

  const seeds = participants.map((p) => p.seed)
  if (seeds.some((s) => s < 1 || s > TOC_MAX_CONFIRMED_PER_WEIGHT)) {
    return "Seeds must be between 1 and 8."
  }
  if (new Set(seeds).size !== seeds.length) {
    return "Each seed 1–8 can only be used once."
  }

  return null
}

export function validateBracketParticipants(participants: TocBracketParticipant[]): string | null {
  const real = participants.filter((p) => !isPlaceholderParticipant(p))
  if (real.length !== TOC_MAX_CONFIRMED_PER_WEIGHT) {
    return `Need exactly ${TOC_MAX_CONFIRMED_PER_WEIGHT} confirmed wrestlers (have ${real.length}).`
  }

  const seeds = real.map((p) => p.seed).sort((a, b) => a - b)
  const expected = Array.from({ length: TOC_MAX_CONFIRMED_PER_WEIGHT }, (_, i) => i + 1)
  for (let i = 0; i < expected.length; i++) {
    if (seeds[i] !== expected[i]) {
      return "Assign unique seeds 1–8 to every confirmed wrestler before the draw is complete."
    }
  }

  return null
}

export function buildEightManDeDraw(
  weightClass: number,
  seededParticipants: TocBracketParticipant[],
  lockedAt: string,
): TocBracketDraw {
  const publishError = validatePartialBracketPublish(seededParticipants)
  if (publishError) throw new Error(publishError)

  const real = seededParticipants.filter((p) => !isPlaceholderParticipant(p))
  const bySeed = new Map<number, TocBracketParticipant>()
  for (const p of real) bySeed.set(p.seed, p)

  const participants = Array.from({ length: TOC_MAX_CONFIRMED_PER_WEIGHT }, (_, i) => {
    const seed = i + 1
    return bySeed.get(seed) ?? placeholderParticipant(weightClass, seed)
  })

  const isComplete = validateBracketParticipants(real) == null

  return {
    weightClass,
    format: "8-man-de",
    lockedAt,
    confirmedCount: real.length,
    openSpots: TOC_MAX_CONFIRMED_PER_WEIGHT - real.length,
    isComplete,
    participants,
    bouts: buildEightManDeBouts(weightClass, bySeed),
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
