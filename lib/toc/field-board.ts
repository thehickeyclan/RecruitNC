import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { TOC_MAX_CONFIRMED_PER_WEIGHT, type TocInvitationStatus } from "@/lib/toc/invitations"

export type TocFieldAthlete = {
  invitationId: string
  athleteId: string
  name: string
  school: string | null
  graduationYear: number | null
  status: TocInvitationStatus
  seed: number | null
  aiSeed?: number | null
  aiSeedScore?: number | null
  aiSeedConfidence?: "High" | "Medium" | "Low" | null
  aiSeedReasons?: string[]
  aiSeedWarnings?: string[]
  seedEvidence?: TocSeedEvidence | null
  jacketSize: string | null
  invitedAt: string | null
  confirmedAt: string | null
}

export type TocSeedEvidence = {
  nchsaa: string[]
  nhsca: string[]
  super32: string[]
  fargo: string[]
  headToHead: { opponent: string; wins: number; losses: number }[]
  summary: {
    stateTitles: number
    statePlacements: number
    nhscaAllAmericanFinishes: number
    fargoAllAmericanFinishes: number
    nhscaWins: number
    nhscaLosses: number
    super32Wins: number
    super32Losses: number
    fargoWins: number
    fargoLosses: number
  }
}

export type TocWeightBoard = {
  weightClass: number
  maxSlots: typeof TOC_MAX_CONFIRMED_PER_WEIGHT
  confirmedCount: number
  invitedCount: number
  openConfirmedSlots: number
  athletes: TocFieldAthlete[]
}

export type TocFieldBoardSummary = {
  totalConfirmed: number
  totalInvited: number
  fullBrackets: number
  partialBrackets: number
}

export type TocFieldBoard = {
  weights: TocWeightBoard[]
  summary: TocFieldBoardSummary
}

/** Apply a complete confirmed-athlete seed order locally for optimistic drag/drop updates. */
export function applyTocSeedOrder(
  board: TocFieldBoard,
  weightClass: number,
  invitationIds: string[],
): TocFieldBoard {
  const seedByInvitationId = new Map(invitationIds.map((id, index) => [id, index + 1]))

  return {
    ...board,
    weights: board.weights.map((weight) => {
      if (weight.weightClass !== weightClass) return weight

      const updated = weight.athletes.map((athlete) => {
        const seed = seedByInvitationId.get(athlete.invitationId)
        return seed == null ? athlete : { ...athlete, seed }
      })
      const confirmed = updated
        .filter((athlete) => athlete.status === "confirmed")
        .sort((a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER))
      const remaining = updated.filter((athlete) => athlete.status !== "confirmed")

      return { ...weight, athletes: [...confirmed, ...remaining] }
    }),
  }
}

type RawInvitation = {
  id: string
  athlete_id: string
  weight_class: number
  status: string
  seed: number | null
  jacket_size: string | null
  invited_at: string | null
  confirmed_at: string | null
  athletes: {
    id: string
    name: string
    highschool: string | null
    graduationyear: number | null
  } | null
}

const STATUS_ORDER: Record<TocInvitationStatus, number> = {
  confirmed: 0,
  invited: 1,
  nominated: 2,
  declined: 3,
  withdrew: 4,
}

function sortAthletes(a: TocFieldAthlete, b: TocFieldAthlete): number {
  const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  if (statusDiff !== 0) return statusDiff
  if (a.seed != null && b.seed != null && a.seed !== b.seed) return a.seed - b.seed
  if (a.seed != null && b.seed == null) return -1
  if (a.seed == null && b.seed != null) return 1
  return a.name.localeCompare(b.name)
}

export function mapInvitationToFieldAthlete(row: RawInvitation): TocFieldAthlete {
  return {
    invitationId: row.id,
    athleteId: row.athlete_id,
    name: row.athletes?.name ?? "Unknown athlete",
    school: row.athletes?.highschool ?? null,
    graduationYear: row.athletes?.graduationyear ?? null,
    status: row.status as TocInvitationStatus,
    seed: row.seed,
    jacketSize: row.jacket_size,
    invitedAt: row.invited_at,
    confirmedAt: row.confirmed_at,
  }
}

/** Group all invitations into per-weight boards (admin-only — includes invited, not just confirmed). */
export function buildTocFieldBoard(invitations: RawInvitation[]): TocFieldBoard {
  const byWeight = new Map<number, TocFieldAthlete[]>()

  for (const row of invitations) {
    const athlete = mapInvitationToFieldAthlete(row)
    const list = byWeight.get(row.weight_class) ?? []
    list.push(athlete)
    byWeight.set(row.weight_class, list)
  }

  let totalConfirmed = 0
  let totalInvited = 0
  let fullBrackets = 0
  let partialBrackets = 0

  const weights: TocWeightBoard[] = TOC_WEIGHT_CLASSES.map((weightClass) => {
    const athletes = (byWeight.get(weightClass) ?? []).sort(sortAthletes)
    const confirmedCount = athletes.filter((a) => a.status === "confirmed").length
    const invitedCount = athletes.filter((a) => a.status === "invited").length
    totalConfirmed += confirmedCount
    totalInvited += invitedCount
    if (confirmedCount >= 8) fullBrackets += 1
    else if (confirmedCount > 0) partialBrackets += 1

    return {
      weightClass,
      maxSlots: TOC_MAX_CONFIRMED_PER_WEIGHT,
      confirmedCount,
      invitedCount,
      openConfirmedSlots: Math.max(0, TOC_MAX_CONFIRMED_PER_WEIGHT - confirmedCount),
      athletes,
    }
  })

  return {
    weights,
    summary: {
      totalConfirmed,
      totalInvited,
      fullBrackets,
      partialBrackets,
    },
  }
}
