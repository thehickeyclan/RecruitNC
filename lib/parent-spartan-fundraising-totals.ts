import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchReimbursementPaidCentsByAthleteIdAllTime } from "@/lib/athlete-reimbursement-net"
import { userCanManageFundraisingForAthlete } from "@/lib/fundraising/athlete-fundraising-access"
import {
  type AthleteFundraisingProfileRow,
  ledgerCodesForFundraisingWallet,
} from "@/lib/fundraising/athlete-fundraising-profiles"
import { getAthleteFundraisingWalletSnapshot, ATHLETE_PUBLIC_GIFTS_NO_ROW_CAP } from "@/lib/fundraising/athlete-public-stats"
import {
  fetchGuildReservedCentsForAthleteIds,
  sumGuildReservedAllocationCentsForAthleteIds,
} from "@/lib/guild-credit-allocations"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { SPARTAN_FAYETTEVILLE_CAMPAIGN } from "@/lib/spartan-fayetteville-stripe"

/**
 * Profile / athlete-row pins — merged inside {@link ledgerCodesForFundraisingWallet}.
 */
async function fetchPinnedFundraisingCodesByAthleteId(
  admin: SupabaseClient,
  athleteIds: string[],
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>()
  if (athleteIds.length === 0) return out

  const add = (athleteId: string, raw: string | null | undefined) => {
    const code = typeof raw === "string" ? raw.trim() : ""
    if (!athleteId.trim() || !code) return
    const set = out.get(athleteId) ?? new Set<string>()
    set.add(code)
    out.set(athleteId, set)
  }

  const { data: profiles } = await admin
    .from("athlete_fundraising_profiles")
    .select("athlete_id, primary_fundraising_code")
    .in("athlete_id", athleteIds)

  for (const r of profiles ?? []) {
    const row = r as { athlete_id?: string | null; primary_fundraising_code?: string | null }
    if (row.athlete_id) add(String(row.athlete_id), row.primary_fundraising_code ?? null)
  }

  const { data: athletesRows, error } = await admin.from("athletes").select("id, fundraising_code").in("id", athleteIds)
  if (!error) {
    for (const r of athletesRows ?? []) {
      const row = r as { id?: string | null; fundraising_code?: string | null }
      if (row.id) add(String(row.id), row.fundraising_code ?? null)
    }
  }

  return out
}

export type ParentSpartanFundraisingAthleteRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  /** NCU codes merged for wallet totals (pin + profile + roster). */
  ledgerCodes: string[]
  totalCents: number
  giftCount: number
  raceSignupCount: number
  reimbursementsPaidCents: number
  /** Lifetime credited gifts minus reimbursements paid all-time (before Guild allocations). */
  netAfterReimbursementsCents: number
  /** Sum of guild_credit_allocations pending + guild_applied for this athlete (any RecruitNC user — same household may use another login). */
  guildAllocationsCents: number
  codeUnavailable?: boolean
}

/**
 * Build wallet rows for linked athletes — lifetime paid gifts from `spartan_donations` (all registry campaigns)
 * plus all-time reimbursements; same ledger-code union as public athlete pages.
 */
export async function buildParentSpartanFundraisingRowsForAthleteIds(
  admin: SupabaseClient,
  _viewerUserId: string,
  athleteIds: string[],
): Promise<ParentSpartanFundraisingAthleteRow[]> {
  if (athleteIds.length === 0) return []

  const { data: nameRows, error: nameError } = await admin.from("athletes").select("id, name").in("id", athleteIds)
  if (nameError) {
    throw new Error(nameError.message)
  }
  const nameById = new Map(
    (nameRows ?? []).map((r) => [String((r as { id: string }).id), String((r as { name: string | null }).name ?? "—")]),
  )

  const [entries, reimbByAthleteId, profileRes, pinnedCodesByAthleteId] = await Promise.all([
    getFundraisingAthleteEntries(admin),
    fetchReimbursementPaidCentsByAthleteIdAllTime(admin),
    admin
      .from("athlete_fundraising_profiles")
      .select(
        "id, created_at, updated_at, athlete_id, slug, bio, photo_url, is_active, campaign_goal_cents, total_raised_cents, primary_fundraising_code, checkout_live",
      )
      .in("athlete_id", athleteIds)
      .eq("is_active", true),
    fetchPinnedFundraisingCodesByAthleteId(admin, athleteIds),
  ])

  let guildReservedByAthlete = new Map<string, number>()
  try {
    guildReservedByAthlete = await fetchGuildReservedCentsForAthleteIds(admin, athleteIds)
  } catch (e) {
    console.warn("[parent-spartan-fundraising-totals] guild reservations", e)
  }

  if (profileRes.error) {
    console.warn("[parent-spartan-fundraising-totals] profiles:", profileRes.error.message)
  }

  const profileByAthleteId = new Map<string, AthleteFundraisingProfileRow>()
  for (const r of profileRes.data ?? []) {
    const row = r as AthleteFundraisingProfileRow
    if (!profileByAthleteId.has(row.athlete_id)) {
      profileByAthleteId.set(row.athlete_id, {
        ...row,
        checkout_live: row.checkout_live === true,
      })
    }
  }

  type Pack = {
    fundraisingCode: string | null
    ledgerCodes: string[]
    stats: { raisedCents: number; giftCount: number; raceSignupCount: number } | null
  }
  const packById = new Map<string, Pack>()

  await Promise.all(
    athleteIds.map(async (id) => {
      const profile = profileByAthleteId.get(id) ?? null
      const pinned = [...(pinnedCodesByAthleteId.get(id) ?? [])]
      const { ledgerCodes, fundraisingCode } = ledgerCodesForFundraisingWallet(profile, entries, id, pinned)
      const snapshot =
        ledgerCodes.length > 0 ? await getAthleteFundraisingWalletSnapshot(ledgerCodes, ATHLETE_PUBLIC_GIFTS_NO_ROW_CAP) : null
      const st = snapshot?.stats
      packById.set(id, {
        fundraisingCode,
        ledgerCodes,
        stats: st
          ? {
              raisedCents: st.raisedCents,
              giftCount: st.giftCount,
              raceSignupCount: st.raceSignupCount,
            }
          : null,
      })
    }),
  )

  return athleteIds.map((id) => {
    const name = nameById.get(id) ?? "—"
    const paidOut = reimbByAthleteId.get(id) ?? 0
    const guildAlloc = guildReservedByAthlete.get(id) ?? 0
    const pack = packById.get(id)
    const ledgerCodes = pack?.ledgerCodes ?? []
    const code = pack?.fundraisingCode ?? null

    if (!pack || ledgerCodes.length === 0) {
      return {
        athleteId: id,
        name,
        fundraisingCode: null,
        ledgerCodes: [],
        totalCents: 0,
        giftCount: 0,
        raceSignupCount: 0,
        reimbursementsPaidCents: paidOut,
        netAfterReimbursementsCents: 0 - paidOut,
        guildAllocationsCents: guildAlloc,
        codeUnavailable: true,
      }
    }

    const totalCents = pack.stats?.raisedCents ?? 0
    const giftCount = pack.stats?.giftCount ?? 0
    const raceSignupCount = pack.stats?.raceSignupCount ?? 0

    return {
      athleteId: id,
      name,
      fundraisingCode: code,
      ledgerCodes,
      totalCents,
      giftCount,
      raceSignupCount,
      reimbursementsPaidCents: paidOut,
      netAfterReimbursementsCents: totalCents - paidOut,
      guildAllocationsCents: guildAlloc,
      codeUnavailable: !code && totalCents === 0 && giftCount === 0,
    }
  })
}

/** Server-only: digital-wallet row for `/fundraising/athletes/[slug]` when the viewer may manage this athlete. */
export async function getFundraisingAthletePageWalletRowForViewer(
  admin: SupabaseClient,
  userId: string,
  athleteId: string,
  guildLookupAthleteIds: string[],
): Promise<ParentSpartanFundraisingAthleteRow | null> {
  if (!(await userCanManageFundraisingForAthlete(admin, userId, athleteId))) {
    return null
  }
  const rows = await buildParentSpartanFundraisingRowsForAthleteIds(admin, userId, [athleteId])
  const base = rows[0]
  if (!base) return null
  // Only sum guild allocations for THIS specific athlete — not the whole household
  const athleteGuildCents = await sumGuildReservedAllocationCentsForAthleteIds(admin, [athleteId])
  return {
    ...base,
    guildAllocationsCents: athleteGuildCents,
  }
}

/**
 * Athlete ids tied to this login for fundraising / digital wallet: `user_profiles.athlete_id`
 * plus every `parent_athlete_links` row. This is independent of Blue (subscription billing).
 */
export async function collectLinkedAthleteIdsForParentUser(
  admin: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data: profileRow } = await admin.from("user_profiles").select("athlete_id").eq("user_id", userId).maybeSingle()

  const { data: linkRows, error: linkError } = await admin
    .from("parent_athlete_links")
    .select("athlete_id")
    .eq("user_id", userId)

  if (linkError && linkError.code !== "42P01") {
    throw new Error(linkError.message)
  }

  const ids = new Set<string>()
  const aid = (profileRow as { athlete_id?: string | null } | null)?.athlete_id
  if (aid?.trim()) ids.add(aid.trim())
  for (const r of linkRows ?? []) {
    const x = (r as { athlete_id?: string }).athlete_id
    if (x?.trim()) ids.add(x.trim())
  }
  return [...ids]
}

/** Same as {@link collectLinkedAthleteIdsForParentUser} — wallet and Guild credit scope follow fundraising links only. */
export async function getWalletAthleteIdsForParentUser(
  admin: SupabaseClient,
  userId: string,
): Promise<string[]> {
  return collectLinkedAthleteIdsForParentUser(admin, userId)
}

/**
 * NC United ledger totals per linked athlete for a RecruitNC account (`parent_athlete_links` and/or `user_profiles.athlete_id`).
 * Same basis as GET /api/profile/spartan-fundraising-totals.
 */
export async function computeParentSpartanFundraisingTotalsForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<{ campaign: string; athletes: ParentSpartanFundraisingAthleteRow[] }> {
  const athleteIds = await getWalletAthleteIdsForParentUser(admin, userId)

  if (athleteIds.length === 0) {
    return { campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN, athletes: [] }
  }

  const athletes = await buildParentSpartanFundraisingRowsForAthleteIds(admin, userId, athleteIds)
  athletes.sort((a, b) => a.name.localeCompare(b.name))
  return { campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN, athletes }
}
