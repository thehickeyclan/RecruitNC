import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  fetchGuildReservedCentsForAthleteIds,
  type GuildCreditAllocationRow,
} from "@/lib/guild-credit-allocations"
import { isGuildGrantConfigured } from "@/lib/guild-grant-client"
import { runGuildLinkForProfile } from "@/lib/guild-auto-link"
import { getWalletAthleteIdsForParentUser } from "@/lib/parent-spartan-fundraising-totals"

export const dynamic = "force-dynamic"

/**
 * Guild wallet linkage + reservation totals + history only.
 * Parent UI merges `reservedByAthlete` with Spartan totals from GET /api/profile/spartan-fundraising-totals
 * so "Remaining" and "Available to allocate" never drift from a second Stripe/reimbursement pass.
 */
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
    .select("guild_parent_user_id, athlete_id, email")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profErr && profErr.code !== "42703") {
    console.error("[profile/guild-credits] profile", profErr)
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  let guildParentUserId =
    profErr?.code === "42703"
      ? null
      : ((profile as { guild_parent_user_id?: string | null } | null)?.guild_parent_user_id ?? null)

  // Self-heal: wallet history is keyed by RecruitNC user_id, but transfers need
  // user_profiles.guild_parent_user_id. If that column was cleared or never set after
  // an email match became possible, retry the same auto-link used on Fundraise tab load.
  if (!guildParentUserId && profErr?.code !== "42703") {
    const attempt = await runGuildLinkForProfile(admin, user.id, user.email, {
      profileEmail: (profile as { email?: string | null } | null)?.email ?? null,
    })
    if (attempt.linked) {
      guildParentUserId = attempt.guildParentUserId
    }
  }

  const walletAthleteIds = await getWalletAthleteIdsForParentUser(admin, user.id)
  const linkedAthleteIds = new Set(walletAthleteIds)

  let reservedByAthlete: Record<string, number> = {}
  try {
    const reservedMap = await fetchGuildReservedCentsForAthleteIds(admin, [...linkedAthleteIds])
    reservedByAthlete = Object.fromEntries(reservedMap.entries())
  } catch (e) {
    console.error("[profile/guild-credits] reserved map", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load reservations" }, { status: 500 })
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
    reservedByAthlete,
    allocations,
  })
}
