import type { SupabaseClient } from "@supabase/supabase-js"
import { AAU_SCHOLASTIC_EVENT_SLUG } from "@/lib/aau-scholastic-duals-2026-content"
import { normalizePersonName } from "@/lib/aau-scholastic-registration-resolve"
import { decodeLineItemsMetadata } from "@/lib/nhsca-hub-checkout-pricing"
import { nhscaDualsRegistrationIsPaid } from "@/lib/nhsca-duals-2026-registrations"

export type AauScholasticRosterRegistrationStatus = {
  registered: boolean
  flight: boolean
  hotel: boolean
  apparel: boolean
}

function checkoutLineKeys(checkoutLines: string | null | undefined): Set<string> {
  if (!checkoutLines?.trim()) return new Set()
  return new Set(decodeLineItemsMetadata(checkoutLines).map((item) => item.key))
}

function statusFromRegistration(reg: {
  checkout_lines?: string | null
  apparel_fee_cents?: number | null
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

/** Paid AAU registrations keyed by normalized wrestler name (matches roster table). */
export async function loadAauScholasticRosterRegistrationStatusMap(
  admin: SupabaseClient,
): Promise<Record<string, AauScholasticRosterRegistrationStatus>> {
  const { data, error } = await admin
    .from("national_team_event_registrations")
    .select(
      "athlete_first_name, athlete_last_name, status, order_id, checkout_lines, reg_fee_cents, apparel_fee_cents",
    )
    .eq("event_slug", AAU_SCHOLASTIC_EVENT_SLUG)

  if (error) {
    console.warn("[aau-scholastic-roster] registrations load:", error.message)
    return {}
  }

  const out: Record<string, AauScholasticRosterRegistrationStatus> = {}

  for (const row of data ?? []) {
    const reg = row as {
      athlete_first_name?: string | null
      athlete_last_name?: string | null
      status?: string | null
      order_id?: string | null
      checkout_lines?: string | null
      reg_fee_cents?: number | null
      apparel_fee_cents?: number | null
    }
    if (!nhscaDualsRegistrationIsPaid(reg)) continue

    const nameKey = normalizePersonName(`${reg.athlete_first_name ?? ""} ${reg.athlete_last_name ?? ""}`)
    if (!nameKey) continue

    const flags = statusFromRegistration(reg)
    const next: AauScholasticRosterRegistrationStatus = {
      registered: true,
      ...flags,
    }
    out[nameKey] = out[nameKey] ? mergeStatus(out[nameKey], next) : next
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
