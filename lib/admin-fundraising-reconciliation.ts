import type { SupabaseClient } from "@supabase/supabase-js"
import { DEFAULT_FUNDRAISING_CAMPAIGN } from "@/lib/fundraising/campaign-registry"
import { getFayettevilleStripeWindowSnapshot, type FayettevilleCodeStats } from "@/lib/spartan-fayetteville-totals-by-code"
import { buildParentSpartanFundraisingRowsForAthleteIds } from "@/lib/parent-spartan-fundraising-totals"

export type FundraisingReconciliationRow = {
  athleteId: string
  athleteName: string
  fundraisingCode: string | null
  /** `athlete_fundraising_profiles.total_raised_cents` — may lag mirror-based totals. */
  profileTotalRaisedCents: number | null
  /** Same basis as Profile → Digital wallet “raised” (mirror + credit corrections, registered campaigns, lifetime). */
  mirrorLifetimeRaisedCents: number
  mirrorGiftCount: number
  /** Same 120d Fayetteville window as Admin → Fundraising / hub when Stripe loads. */
  windowRaisedCents: number
  windowGiftCount: number
  reimbursementsPaidAllTimeCents: number
  guildReservedCents: number
  netAfterReimbursementsAllTimeCents: number
  availableNotionalCents: number
  /** `profileTotalRaisedCents - mirrorLifetimeRaisedCents` (null if profile row missing). */
  deltaProfileVsMirrorCents: number | null
  /** Sum of ledger `stripe_spartan_checkout` + `money_in` for this `athlete_id`, if table available. */
  ledgerSpartanCheckoutInCents: number | null
}

export type FundraisingReconciliationMeta = {
  lookbackDays: number
  campaignStripeSlug: string
  generatedAt: string
  stripeWindowLoaded: boolean
  stripeError: string | null
  athleteCountRequested: number
}

function chunkArr<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function fetchLedgerSpartanCheckoutInByAthleteIds(
  admin: SupabaseClient,
  athleteIds: string[],
): Promise<Map<string, number> | null> {
  const map = new Map<string, number>()
  for (const part of chunkArr(athleteIds, 120)) {
    if (part.length === 0) continue
    const { data, error } = await admin
      .from("fundraising_ledger_entries")
      .select("athlete_id, amount_cents, entry_kind, direction")
      .in("athlete_id", part)
    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) return null
      console.warn("[fundraising-reconciliation] ledger:", error.message)
      return null
    }
    for (const raw of data ?? []) {
      const row = raw as {
        athlete_id: string | null
        amount_cents: number | null
        entry_kind?: string | null
        direction?: string | null
      }
      if (!row.athlete_id) continue
      if (row.entry_kind !== "stripe_spartan_checkout") continue
      if (row.direction !== "money_in") continue
      const c = typeof row.amount_cents === "number" ? row.amount_cents : 0
      const id = String(row.athlete_id)
      map.set(id, (map.get(id) ?? 0) + c)
    }
  }
  return map
}

async function fetchProfileRaisedByAthleteIds(
  admin: SupabaseClient,
  athleteIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  for (const part of chunkArr(athleteIds, 120)) {
    if (part.length === 0) continue
    const { data, error } = await admin
      .from("athlete_fundraising_profiles")
      .select("athlete_id, total_raised_cents")
      .in("athlete_id", part)
    if (error) {
      console.warn("[fundraising-reconciliation] profiles:", error.message)
      return map
    }
    for (const raw of data ?? []) {
      const row = raw as { athlete_id?: string | null; total_raised_cents?: number | null }
      const id = row.athlete_id ? String(row.athlete_id) : ""
      if (!id) continue
      const v = typeof row.total_raised_cents === "number" ? row.total_raised_cents : 0
      map.set(id, v)
    }
  }
  return map
}

async function fetchAthleteNames(admin: SupabaseClient, athleteIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  for (const part of chunkArr(athleteIds, 120)) {
    if (part.length === 0) continue
    const { data, error } = await admin.from("athletes").select("id, name").in("id", part)
    if (error) {
      console.warn("[fundraising-reconciliation] athletes:", error.message)
      continue
    }
    for (const raw of data ?? []) {
      const row = raw as { id: string; name: string | null }
      names.set(String(row.id), typeof row.name === "string" && row.name.trim() ? row.name.trim() : "—")
    }
  }
  return names
}

export type BuildFundraisingReconciliationParams = {
  athleteIds: string[]
  /** Max concurrent wallet builds inside {@link buildParentSpartanFundraisingRowsForAthleteIds} chunks. */
  chunkSize?: number
  includeLedger?: boolean
}

/**
 * Admin-only: side-by-side profile column, mirror wallet totals, 120d Stripe window, reimbursements, Guild, optional ledger.
 */
export async function buildFundraisingReconciliationReport(
  admin: SupabaseClient,
  viewerUserId: string,
  params: BuildFundraisingReconciliationParams,
): Promise<{ meta: FundraisingReconciliationMeta; rows: FundraisingReconciliationRow[] }> {
  const chunkSize = Math.min(80, Math.max(5, params.chunkSize ?? 25))
  const includeLedger = params.includeLedger !== false

  const uniqueIds = [...new Set(params.athleteIds.map((id) => id.trim()).filter(Boolean))]
  const generatedAt = new Date().toISOString()

  let statsByCode = new Map<string, FayettevilleCodeStats>()
  let stripeWindowLoaded = false
  let stripeError: string | null = null
  try {
    const snap = await getFayettevilleStripeWindowSnapshot()
    statsByCode = snap.statsByAthleteCodeLowercase
    stripeWindowLoaded = true
  } catch (e) {
    stripeError = e instanceof Error ? e.message : String(e)
    console.error("[fundraising-reconciliation] Stripe window:", stripeError)
  }

  const [profileRaisedByAthlete, namesByAthlete, ledgerByAthlete] = await Promise.all([
    fetchProfileRaisedByAthleteIds(admin, uniqueIds),
    fetchAthleteNames(admin, uniqueIds),
    includeLedger ? fetchLedgerSpartanCheckoutInByAthleteIds(admin, uniqueIds) : Promise.resolve(null),
  ])

  const rows: FundraisingReconciliationRow[] = []

  for (const part of chunkArr(uniqueIds, chunkSize)) {
    const walletRows = await buildParentSpartanFundraisingRowsForAthleteIds(admin, viewerUserId, part, {
      fundraisingProfiles: "any",
    })
    const byId = new Map(walletRows.map((r) => [r.athleteId, r]))
    for (const athleteId of part) {
      const w = byId.get(athleteId)
      const name = namesByAthlete.get(athleteId) ?? "—"
      const profileCents = profileRaisedByAthlete.has(athleteId) ? profileRaisedByAthlete.get(athleteId)! : null

      if (!w) {
        rows.push({
          athleteId,
          athleteName: name,
          fundraisingCode: null,
          profileTotalRaisedCents: profileCents,
          mirrorLifetimeRaisedCents: 0,
          mirrorGiftCount: 0,
          windowRaisedCents: 0,
          windowGiftCount: 0,
          reimbursementsPaidAllTimeCents: 0,
          guildReservedCents: 0,
          netAfterReimbursementsAllTimeCents: 0,
          availableNotionalCents: 0,
          deltaProfileVsMirrorCents: profileCents != null ? profileCents - 0 : null,
          ledgerSpartanCheckoutInCents: ledgerByAthlete?.get(athleteId) ?? null,
        })
        continue
      }

      const codeLower = w.fundraisingCode?.trim().toLowerCase() ?? ""
      const windowStats = codeLower ? statsByCode.get(codeLower) : undefined

      const mirrorRaised = w.totalCents
      const delta = profileCents != null ? profileCents - mirrorRaised : null

      rows.push({
        athleteId,
        athleteName: name,
        fundraisingCode: w.fundraisingCode,
        profileTotalRaisedCents: profileCents,
        mirrorLifetimeRaisedCents: mirrorRaised,
        mirrorGiftCount: w.giftCount,
        windowRaisedCents: windowStats?.totalCents ?? 0,
        windowGiftCount: windowStats?.giftCount ?? 0,
        reimbursementsPaidAllTimeCents: w.reimbursementsPaidCents,
        guildReservedCents: w.guildAllocationsCents,
        netAfterReimbursementsAllTimeCents: w.netAfterReimbursementsCents,
        availableNotionalCents: w.netAfterReimbursementsCents - w.guildAllocationsCents,
        deltaProfileVsMirrorCents: delta,
        ledgerSpartanCheckoutInCents: ledgerByAthlete?.get(athleteId) ?? null,
      })
    }
  }

  const meta: FundraisingReconciliationMeta = {
    lookbackDays: DEFAULT_FUNDRAISING_CAMPAIGN.defaultLookbackDays,
    campaignStripeSlug: DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug,
    generatedAt,
    stripeWindowLoaded,
    stripeError,
    athleteCountRequested: uniqueIds.length,
  }

  return { meta, rows }
}
