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
  const net = athlete.netAfterReimbursementsCents
  if (athlete.codeUnavailable || net <= 0) return 0
  return Math.max(0, net - reservedCents)
}
