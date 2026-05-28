import type { SupabaseClient } from "@supabase/supabase-js"
import {
  AAU_SCHOLASTIC_DUALS_2026_ROSTER,
  type AauScholasticRosterRow,
} from "@/lib/aau-scholastic-duals-2026-roster"
import { AAU_SCHOLASTIC_EVENT_SLUG } from "@/lib/aau-scholastic-duals-2026-content"
import {
  aauWeightClassFromRosterLabel,
  findAauRosterRowByWrestlerName,
  normalizePersonName,
} from "@/lib/aau-scholastic-registration-resolve"
import { decodeLineItemsMetadata } from "@/lib/nhsca-hub-checkout-pricing"
import { nhscaDualsRegistrationIsPaid } from "@/lib/nhsca-duals-2026-registrations"

export type AauScholasticRosterRegistrationStatus = {
  registered: boolean
  flight: boolean
  hotel: boolean
  apparel: boolean
}

type RegistrationRow = {
  athlete_first_name?: string | null
  athlete_last_name?: string | null
  status?: string | null
  order_id?: string | null
  stripe_payment_intent_id?: string | null
  checkout_lines?: string | null
  reg_fee_cents?: number | null
  apparel_fee_cents?: number | null
  primary_weight?: string | null
}

const ROSTER_BY_WEIGHT = new Map<string, AauScholasticRosterRow>()
for (const row of AAU_SCHOLASTIC_DUALS_2026_ROSTER) {
  if (row.openSlot || !row.wrestler.trim()) continue
  ROSTER_BY_WEIGHT.set(aauWeightClassFromRosterLabel(row.weightLabel), row)
}

function normalizeWeightClass(weight: string | null | undefined): string {
  const raw = (weight ?? "").trim()
  if (!raw) return ""
  if (raw.toUpperCase() === "HWT") return "285"
  const plusFive = /^(\d+)\+5$/i.exec(raw)
  if (plusFive) return plusFive[1]
  return raw.replace(/\D/g, "") || raw
}

function registrationIsPaid(reg: RegistrationRow): boolean {
  if (nhscaDualsRegistrationIsPaid(reg)) return true
  if (reg.stripe_payment_intent_id?.trim()) return true
  const status = (reg.status ?? "").toLowerCase()
  return status === "paid" || status === "complete"
}

function checkoutLineKeys(checkoutLines: string | null | undefined): Set<string> {
  if (!checkoutLines?.trim()) return new Set()
  return new Set(decodeLineItemsMetadata(checkoutLines).map((item) => item.key))
}

function statusFromRegistration(reg: {
  checkout_lines?: string | null
  apparel_fee_cents?: number | null
  reg_fee_cents?: number | null
}): Omit<AauScholasticRosterRegistrationStatus, "registered"> {
  const keys = checkoutLineKeys(reg.checkout_lines)
  return {
    flight: keys.has("flight"),
    hotel: keys.has("hotel_van"),
    apparel:
      keys.has("singlet") ||
      keys.has("long_sleeve") ||
      keys.has("shorts") ||
      keys.has("tee") ||
      (keys.size === 0 && (reg.apparel_fee_cents ?? 0) > 0),
  }
}

function mergeStatus(
  a: AauScholasticRosterRegistrationStatus,
  b: AauScholasticRosterRegistrationStatus,
): AauScholasticRosterRegistrationStatus {
  return {
    registered: a.registered || b.registered,
    flight: a.flight || b.flight,
    hotel: a.hotel || b.hotel,
    apparel: a.apparel || b.apparel,
  }
}

/** Map paid registration → roster wrestler name key (normalized). */
export function rosterWrestlerKeyForRegistration(reg: RegistrationRow): string | null {
  const first = (reg.athlete_first_name ?? "").trim()
  const last = (reg.athlete_last_name ?? "").trim()
  const rosterMatch = first && last ? findAauRosterRowByWrestlerName(first, last) : null
  if (rosterMatch?.wrestler.trim()) {
    return normalizePersonName(rosterMatch.wrestler)
  }

  const weightKey = normalizeWeightClass(reg.primary_weight)
  if (weightKey) {
    const byWeight = ROSTER_BY_WEIGHT.get(weightKey)
    if (byWeight?.wrestler.trim()) {
      return normalizePersonName(byWeight.wrestler)
    }
  }

  const direct = normalizePersonName(`${first} ${last}`)
  return direct || null
}

async function loadPaidAauRegistrations(admin: SupabaseClient): Promise<RegistrationRow[]> {
  const fullSelect =
    "athlete_first_name, athlete_last_name, status, order_id, stripe_payment_intent_id, checkout_lines, reg_fee_cents, apparel_fee_cents, primary_weight"
  const minimalSelect =
    "athlete_first_name, athlete_last_name, status, order_id, reg_fee_cents, apparel_fee_cents, primary_weight"

  let result = await admin
    .from("national_team_event_registrations")
    .select(fullSelect)
    .eq("event_slug", AAU_SCHOLASTIC_EVENT_SLUG)

  if (result.error?.message?.includes("does not exist")) {
    console.warn("[aau-scholastic-roster] registrations load (retry minimal):", result.error.message)
    result = await admin
      .from("national_team_event_registrations")
      .select(minimalSelect)
      .eq("event_slug", AAU_SCHOLASTIC_EVENT_SLUG)
  }

  if (result.error) {
    console.warn("[aau-scholastic-roster] registrations load:", result.error.message)
    return []
  }

  return (result.data ?? []) as RegistrationRow[]
}

/** Paid AAU registrations keyed by normalized wrestler name (matches roster table). */
export async function loadAauScholasticRosterRegistrationStatusMap(
  admin: SupabaseClient,
): Promise<Record<string, AauScholasticRosterRegistrationStatus>> {
  const rows = await loadPaidAauRegistrations(admin)
  const out: Record<string, AauScholasticRosterRegistrationStatus> = {}

  for (const reg of rows) {
    if (!registrationIsPaid(reg)) continue

    const wrestlerKey = rosterWrestlerKeyForRegistration(reg)
    if (!wrestlerKey) continue

    const flags = statusFromRegistration(reg)
    const next: AauScholasticRosterRegistrationStatus = {
      registered: true,
      ...flags,
    }
    out[wrestlerKey] = out[wrestlerKey] ? mergeStatus(out[wrestlerKey], next) : next
  }

  return out
}

export function rosterRegistrationStatusForWrestler(
  wrestler: string,
  byName: Record<string, AauScholasticRosterRegistrationStatus>,
): AauScholasticRosterRegistrationStatus | null {
  const key = normalizePersonName(wrestler)
  if (!key) return null
  return byName[key] ?? null
}
