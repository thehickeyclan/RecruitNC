import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeParentSpartanFundraisingTotalsForUser } from "@/lib/parent-spartan-fundraising-totals"
import {
  computeGuildAllocatableCents,
  sumReservedGuildAllocationCentsByAthlete,
} from "@/lib/guild-credit-allocations"
import { recordFundraisingLedgerGuildAllocation } from "@/lib/fundraising/ledger"
import { isGuildGrantConfigured, postGuildCreditGrant } from "@/lib/guild-grant-client"

export const dynamic = "force-dynamic"

function parseDollarsToCents(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/[$,]/g, "").trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(Math.round(n * 100), 100_000_000)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let body: { athleteId?: string; amountDollars?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const athleteId = (body.athleteId || "").trim()
  const amountCents = parseDollarsToCents(body.amountDollars || "")
  if (!athleteId) {
    return NextResponse.json({ error: "Athlete is required" }, { status: 400 })
  }
  if (amountCents == null) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 })
  }

  if (!isGuildGrantConfigured()) {
    return NextResponse.json(
      {
        error:
          "Guild credit grants are not configured yet. Set GUILD_API_BASE_URL and GUILD_API_SECRET, or GUILD_CREDIT_GRANT_STUB=1 for testing.",
      },
      { status: 503 },
    )
  }

  const admin = createAdminClient()

  const { data: link } = await admin
    .from("parent_athlete_links")
    .select("athlete_id")
    .eq("user_id", user.id)
    .eq("athlete_id", athleteId)
    .maybeSingle()

  const { data: profileRow } = await admin.from("user_profiles").select("athlete_id").eq("user_id", user.id).maybeSingle()
  const profileAthleteId = (profileRow as { athlete_id?: string | null } | null)?.athlete_id
  const linkedOk = Boolean(link) || profileAthleteId === athleteId

  if (!linkedOk) {
    return NextResponse.json({ error: "Link this athlete under Family & athletes first." }, { status: 403 })
  }

  const { data: guildProf, error: gErr } = await admin
    .from("user_profiles")
    .select("guild_parent_user_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (gErr && gErr.code !== "42703") {
    return NextResponse.json({ error: gErr.message }, { status: 500 })
  }
  if (gErr?.code === "42703") {
    return NextResponse.json(
      {
        error:
          "Database migration required: add user_profiles.guild_parent_user_id (run guild credit allocations SQL in Supabase).",
      },
      { status: 503 },
    )
  }

  const guildParentUserId =
    (guildProf as { guild_parent_user_id?: string | null } | null)?.guild_parent_user_id ?? null
  if (!guildParentUserId) {
    return NextResponse.json(
      {
        error:
          "Your account is not linked to a Guild parent profile yet. Contact staff to connect your Guild account (guild_parent_user_id).",
      },
      { status: 400 },
    )
  }

  const { athletes } = await computeParentSpartanFundraisingTotalsForUser(admin, user.id)
  const athlete = athletes.find((a) => a.athleteId === athleteId)
  if (!athlete) {
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
  }

  const reserved = await sumReservedGuildAllocationCentsByAthlete(admin, user.id, athleteId)
  const allocatable = computeGuildAllocatableCents(athlete, reserved)
  if (amountCents > allocatable) {
    return NextResponse.json(
      {
        error: `Amount exceeds available balance for allocation (${(allocatable / 100).toFixed(2)} USD available).`,
        allocatableCents: allocatable,
      },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()
  const allocationId = crypto.randomUUID()
  const { error: insErr } = await admin.from("guild_credit_allocations").insert({
    id: allocationId,
    user_id: user.id,
    athlete_id: athleteId,
    amount_cents: amountCents,
    status: "pending",
    idempotency_key: allocationId,
    campaign: "fayetteville_spartan",
    created_at: now,
    updated_at: now,
  })

  if (insErr) {
    if (insErr.code === "42P01" || insErr.message?.includes("does not exist")) {
      return NextResponse.json(
        { error: "Database migration required: create guild_credit_allocations (see deployment notes)." },
        { status: 503 },
      )
    }
    console.error("[profile/guild-credits/allocate] insert", insErr)
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  const grant = await postGuildCreditGrant({
    guildParentId: guildParentUserId,
    amountCents: amountCents,
    idempotencyKey: allocationId,
    metadata: {
      recruitnc_allocation_id: allocationId,
      recruitnc_user_id: user.id,
      athlete_id: athleteId,
      campaign: "fayetteville_spartan",
      requested_at: now,
    },
  })

  if (!grant.ok) {
    let detail = `${grant.message} (HTTP ${grant.status})`
    if (/credits_source_check/i.test(grant.message)) {
      detail +=
        " Usually: Guild production missing credits migrations (recruitnc_transfer / recruitnc alias). Rarely: set RecruitNC GUILD_CREDIT_GRANT_SOURCE only if Guild documents a required HTTP literal."
    }
    await admin
      .from("guild_credit_allocations")
      .update({
        status: "failed",
        error_message: detail,
        updated_at: new Date().toISOString(),
      })
      .eq("id", allocationId)

    return NextResponse.json(
      {
        error: /credits_source_check/i.test(grant.message)
          ? `${grant.message} Staff: apply Guild credits migrations on production (recruitnc_transfer + recruitnc alias). Override GUILD_CREDIT_GRANT_SOURCE only if Guild requires it for HTTP.`
          : grant.message,
        allocationId,
        status: "failed",
      },
      { status: 502 },
    )
  }

  const { error: guildUpErr } = await admin
    .from("guild_credit_allocations")
    .update({
      status: "guild_applied",
      guild_credit_ids: grant.creditIds.length ? grant.creditIds : null,
      guild_balance_cents_after: grant.balanceCentsAfter,
      guild_response: grant.raw as object,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", allocationId)

  if (!guildUpErr) {
    await recordFundraisingLedgerGuildAllocation(admin, {
      guildCreditAllocationId: allocationId,
      athleteId,
      recruitNcUserId: user.id,
      amountCents,
      campaign: "fayetteville_spartan",
    })
  } else {
    console.error("[profile/guild-credits/allocate] guild_applied update", guildUpErr)
  }

  return NextResponse.json({
    success: true,
    allocationId,
    amountCents: amountCents,
    guildCreditIds: grant.creditIds,
    guildBalanceCentsAfter: grant.balanceCentsAfter,
  })
}
