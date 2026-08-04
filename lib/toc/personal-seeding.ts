import type { TocBracketParticipant } from "@/lib/toc/bracket-types"
import type { TocFieldBoard } from "@/lib/toc/field-board"

export type TocPersonalSeedOrders = Record<string, string[]>

export function readTocPersonalSeedOrders(appMetadata: Record<string, unknown>): TocPersonalSeedOrders {
  const raw = appMetadata.toc_personal_seed_orders
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter(([, value]) => Array.isArray(value))
      .map(([weight, value]) => [
        weight,
        (value as unknown[]).filter((id): id is string => typeof id === "string"),
      ]),
  )
}

export function applyPersonalSeedOrderToParticipants(
  participants: TocBracketParticipant[],
  invitationIds: string[] | undefined,
): TocBracketParticipant[] {
  if (!invitationIds?.length) return participants
  const byId = new Map(participants.map((participant) => [participant.invitationId, participant]))
  const ordered = invitationIds.map((id) => byId.get(id)).filter((row): row is TocBracketParticipant => Boolean(row))
  const seen = new Set(ordered.map((row) => row.invitationId))
  ordered.push(...participants.filter((row) => !seen.has(row.invitationId)).sort((a, b) => a.seed - b.seed))
  return ordered.map((participant, index) => ({ ...participant, seed: index + 1 }))
}

export function applyPersonalSeedOrdersToFieldBoard(
  board: TocFieldBoard,
  orders: TocPersonalSeedOrders,
): TocFieldBoard {
  return {
    ...board,
    weights: board.weights.map((weight) => {
      const order = orders[String(weight.weightClass)]
      if (!order?.length) return weight

      const orderIndex = new Map(order.map((id, index) => [id, index]))
      const confirmed = weight.athletes
        .filter((athlete) => athlete.status === "confirmed")
        .sort((a, b) => {
          const aIndex = orderIndex.get(a.invitationId)
          const bIndex = orderIndex.get(b.invitationId)
          if (aIndex != null && bIndex != null) return aIndex - bIndex
          if (aIndex != null) return -1
          if (bIndex != null) return 1
          return (a.seed ?? 99) - (b.seed ?? 99)
        })
        .map((athlete, index) => ({ ...athlete, seed: index + 1 }))
      const other = weight.athletes.filter((athlete) => athlete.status !== "confirmed")
      return { ...weight, athletes: [...confirmed, ...other] }
    }),
  }
}
