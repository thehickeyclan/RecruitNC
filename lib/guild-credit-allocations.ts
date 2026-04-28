import type { SupabaseClient } from "@supabase/supabase-js"
import type { ParentSpartanFundraisingAthleteRow } from "@/lib/parent-spartan-fundraising-totals"

export type GuildAllocationStatus = "pending" | "guild_applied" | "failed"

export type GuildCreditAllocationRow = {
  id: string
  user_id: string
  athlete_id: string
  amount_cents: number
  status: GuildAllocationStatus
  idempotency_key: string
  guild_credit_ids: string[] | null
  guild_balance_cents_after: number | null
  error_message: string | null
  campaign: string
  created_at: string
  updated_at: string
}

/** Sum of allocations that reserve fundraising notional balance (pending or completed grant). */
export async function sumReservedGuildAllocationCentsByAthlete(
  admin: SupabaseClient,
  userId: string,
  athleteId: string,
): Promise<number> {
  const { data, error } = await admin
    .from("guild_credit_allocations")
    .select("amount_cents")
    .eq("user_id", userId)
    .eq("athlete_id", athleteId)
    .in("status", ["pending", "guild_applied"])

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return 0
    }
    throw new Error(error.message)
  }
  return (data ?? []).reduce((s, r) => s + Number((r as { amount_cents: number }).amount_cents), 0)
}

export function computeGuildAllocatableCents(
  athlete: ParentSpartanFundraisingAthleteRow,
  reservedCents: number,
): number {
  return allocatableToGuildFromNet(athlete.netAfterReimbursementsCents, reservedCents, athlete.codeUnavailable)
}

/** Client + server: same math as computeGuildAllocatableCents without full athlete row. */
export function allocatableToGuildFromNet(
  netAfterReimbursementsCents: number,
  reservedCents: number,
  codeUnavailable?: boolean,
): number {
  if (codeUnavailable || netAfterReimbursementsCents <= 0) return 0
  return Math.max(0, netAfterReimbursementsCents - reservedCents)
}

/** One query: reserved cents per athlete for Guild cap math. */
export async function fetchGuildReservedCentsByAthleteId(
  admin: SupabaseClient,
  userId: string,
): Promise<Map<string, number>> {
  const { data, error } = await admin
    .from("guild_credit_allocations")
    .select("athlete_id, amount_cents")
    .eq("user_id", userId)
    .in("status", ["pending", "guild_applied"])

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return new Map()
    }
    throw new Error(error.message)
  }
  const map = new Map<string, number>()
  for (const r of data ?? []) {
    const row = r as { athlete_id: string; amount_cents: number }
    const id = String(row.athlete_id)
    map.set(id, (map.get(id) ?? 0) + Number(row.amount_cents))
  }
  return map
}
