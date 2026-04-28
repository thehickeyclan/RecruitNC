import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeParentSpartanFundraisingTotalsForUser } from "@/lib/parent-spartan-fundraising-totals"
import {
  computeGuildAllocatableCents,
  sumReservedGuildAllocationCentsByAthlete,
  type GuildCreditAllocationRow,
} from "@/lib/guild-credit-allocations"
import { isGuildGrantConfigured } from "@/lib/guild-grant-client"
import { FAYETTEVILLE_STRIPE_LOOKBACK_DAYS } from "@/lib/spartan-fayetteville-totals-by-code"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: profile, error: profErr } = await admin
    .from("user_profiles")
    .select("guild_parent_user_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profErr && profErr.code !== "42703") {
    console.error("[profile/guild-credits] profile", profErr)
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  const guildParentUserId =
    profErr?.code === "42703"
      ? null
      : ((profile as { guild_parent_user_id?: string | null } | null)?.guild_parent_user_id ?? null)

  let athletes: Awaited<ReturnType<typeof computeParentSpartanFundraisingTotalsForUser>>["athletes"] = []
  try {
    const bundle = await computeParentSpartanFundraisingTotalsForUser(admin, user.id)
    athletes = bundle.athletes
  } catch (e) {
    console.error("[profile/guild-credits] totals", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load totals" }, { status: 500 })
  }

  const allocatable: {
    athleteId: string
    name: string
    netAfterReimbursementsCents: number
    reservedToGuildCents: number
    allocatableToGuildCents: number
    codeUnavailable?: boolean
  }[] = []

  for (const a of athletes) {
    let reserved = 0
    try {
      reserved = await sumReservedGuildAllocationCentsByAthlete(admin, user.id, a.athleteId)
    } catch (e) {
      console.error("[profile/guild-credits] reserved sum", e)
    }
    allocatable.push({
      athleteId: a.athleteId,
      name: a.name,
      netAfterReimbursementsCents: a.netAfterReimbursementsCents,
      reservedToGuildCents: reserved,
      allocatableToGuildCents: computeGuildAllocatableCents(a, reserved),
      codeUnavailable: a.codeUnavailable,
    })
  }

  let allocations: GuildCreditAllocationRow[] = []
  const { data: allocRows, error: allocErr } = await admin
    .from("guild_credit_allocations")
    .select(
      "id, user_id, athlete_id, amount_cents, status, idempotency_key, guild_credit_ids, guild_balance_cents_after, error_message, campaign, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (allocErr) {
    if (allocErr.code !== "42P01" && !allocErr.message?.includes("does not exist")) {
      console.error("[profile/guild-credits] allocations", allocErr)
      return NextResponse.json({ error: allocErr.message }, { status: 500 })
    }
  } else {
    allocations = (allocRows ?? []).map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: String(row.id),
        user_id: String(row.user_id),
        athlete_id: String(row.athlete_id),
        amount_cents: Number(row.amount_cents),
        status: row.status as GuildCreditAllocationRow["status"],
        idempotency_key: String(row.idempotency_key),
        guild_credit_ids: Array.isArray(row.guild_credit_ids)
          ? (row.guild_credit_ids as unknown[]).map(String)
          : null,
        guild_balance_cents_after:
          row.guild_balance_cents_after != null ? Number(row.guild_balance_cents_after) : null,
        error_message: row.error_message != null ? String(row.error_message) : null,
        campaign: String(row.campaign ?? "fayetteville_spartan"),
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
      }
    })
  }

  return NextResponse.json({
    guildParentUserId,
    guildGrantConfigured: isGuildGrantConfigured(),
    lookbackDays: FAYETTEVILLE_STRIPE_LOOKBACK_DAYS,
    allocatable,
    allocations,
  })
}
