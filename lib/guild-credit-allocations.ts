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

/**
 * All RecruitNC accounts: pending + guild_applied totals per athlete (any `user_id` on the row).
 * Use for **family digital wallet** and allocate caps so transfers done under another login (same athlete_id) still count.
 */
export async function fetchGuildReservedCentsForAthleteIds(
  admin: SupabaseClient,
  athleteIds: string[],
): Promise<Map<string, number>> {
  const uniq = [...new Set(athleteIds.filter((id) => typeof id === "string" && id.trim().length > 0).map((id) => id.trim()))]
  if (uniq.length === 0) return new Map()

  const { data, error } = await admin
    .from("guild_credit_allocations")
    .select("athlete_id, amount_cents")
    .in("athlete_id", uniq)
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

/** Cap checks: sum reserved/applied for this athlete from every parent account (prevents double-allocation). */
export async function sumReservedGuildAllocationCentsForAthleteAnyUser(
  admin: SupabaseClient,
  athleteId: string,
): Promise<number> {
  const id = typeof athleteId === "string" ? athleteId.trim() : ""
  if (!id) return 0
  const map = await fetchGuildReservedCentsForAthleteIds(admin, [id])
  return map.get(id) ?? 0
}

/** All parents: sum pending + guild_applied per athlete (admin Spartan rollup). */
export async function fetchGuildReservedCentsByAthleteIdGlobal(admin: SupabaseClient): Promise<Map<string, number>> {
  const { data, error } = await admin
    .from("guild_credit_allocations")
    .select("athlete_id, amount_cents")
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

/**
 * Sum Guild reservations (`pending` + `guild_applied`) for these athlete UUIDs and **any** RecruitNC account.
 * Use {@link fetchGuildReservedCentsByAthleteId} only when you need rows scoped to a single `user_id`.
 */
export async function sumGuildReservedAllocationCentsForAthleteIds(
  admin: SupabaseClient,
  athleteIds: string[],
): Promise<number> {
  const uniq = [...new Set(athleteIds.filter((id) => typeof id === "string" && id.length > 0))]
  if (uniq.length === 0) return 0

  const { data, error } = await admin
    .from("guild_credit_allocations")
    .select("amount_cents")
    .in("athlete_id", uniq)
    .in("status", ["pending", "guild_applied"])

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return 0
    }
    throw new Error(error.message)
  }
  return (data ?? []).reduce((s, r) => s + Number((r as { amount_cents: number }).amount_cents), 0)
}
