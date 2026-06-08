import type { SupabaseClient } from "@supabase/supabase-js"
import type { AauRosterPaymentAmounts } from "@/lib/aau-scholastic-roster-payment-matrix"

export const AAU_TRAVEL_NEED_VALUES = ["none", "flight", "hotel", "flight_hotel"] as const
export type AauTravelNeed = (typeof AAU_TRAVEL_NEED_VALUES)[number]

export type AauTravelFulfillmentStatus = "not_set" | "complete" | "partial" | "verbal_only"

export type AauTravelNeedOption = {
  value: AauTravelNeed
  label: string
  shortLabel: string
}

export const AAU_TRAVEL_NEED_OPTIONS: AauTravelNeedOption[] = [
  { value: "none", label: "— Not set", shortLabel: "—" },
  { value: "flight", label: "✈️ Flight", shortLabel: "✈️" },
  { value: "hotel", label: "🏨 Hotel", shortLabel: "🏨" },
  { value: "flight_hotel", label: "✈️🏨 Flight + hotel", shortLabel: "✈️🏨" },
]

export function parseAauTravelNeed(raw: unknown): AauTravelNeed {
  const v = typeof raw === "string" ? raw.trim() : ""
  if (AAU_TRAVEL_NEED_VALUES.includes(v as AauTravelNeed)) return v as AauTravelNeed
  return "none"
}

export function aauTravelNeedLabel(need: AauTravelNeed): string {
  return AAU_TRAVEL_NEED_OPTIONS.find((o) => o.value === need)?.label ?? "— Not set"
}

export function aauTravelNeedShortLabel(need: AauTravelNeed): string {
  return AAU_TRAVEL_NEED_OPTIONS.find((o) => o.value === need)?.shortLabel ?? "—"
}

export function aauTravelFulfillmentStatus(
  need: AauTravelNeed,
  payments: Pick<AauRosterPaymentAmounts, "flight_cents" | "hotel_cents"> | null | undefined,
): AauTravelFulfillmentStatus {
  if (need === "none") return "not_set"

  const flightPaid = (payments?.flight_cents ?? 0) > 0
  const hotelPaid = (payments?.hotel_cents ?? 0) > 0

  if (need === "flight") return flightPaid ? "complete" : "verbal_only"
  if (need === "hotel") return hotelPaid ? "complete" : "verbal_only"
  if (need === "flight_hotel") {
    if (flightPaid && hotelPaid) return "complete"
    if (flightPaid || hotelPaid) return "partial"
    return "verbal_only"
  }
  return "not_set"
}

export function aauTravelFulfillmentLabel(status: AauTravelFulfillmentStatus): string {
  switch (status) {
    case "complete":
      return "Verbal + paid"
    case "partial":
      return "Partially paid"
    case "verbal_only":
      return "Verbal only"
    default:
      return ""
  }
}

export type AauTravelCommitmentRow = {
  weight_label: string
  travel_need: AauTravelNeed
  updated_at: string | null
}

export async function loadAauTravelCommitmentsByWeight(
  admin: SupabaseClient,
  eventSlug: string,
): Promise<Map<string, AauTravelNeed>> {
  const map = new Map<string, AauTravelNeed>()
  const { data, error } = await admin
    .from("aau_duals_roster_travel_commitments")
    .select("weight_label, travel_need")
    .eq("event_slug", eventSlug)

  if (error) {
    if ((error as { code?: string }).code === "42P01") return map
    throw error
  }

  for (const row of data ?? []) {
    const weight = typeof row.weight_label === "string" ? row.weight_label.trim() : ""
    if (!weight) continue
    map.set(weight, parseAauTravelNeed(row.travel_need))
  }
  return map
}

/** False when migration in scripts/add-aau-duals-travel-commitments.md has not been run. */
export async function isAauTravelCommitmentsTableReady(admin: SupabaseClient): Promise<boolean> {
  const { error } = await admin.from("aau_duals_roster_travel_commitments").select("id").limit(1)
  return (error as { code?: string } | null)?.code !== "42P01"
}

export async function upsertAauTravelCommitment(
  admin: SupabaseClient,
  opts: { eventSlug: string; weightLabel: string; travelNeed: AauTravelNeed; userId: string },
): Promise<{ ok: true } | { ok: false; error: string; needsMigration?: boolean }> {
  const weightLabel = opts.weightLabel.trim()
  if (!weightLabel) return { ok: false, error: "weight_label required" }

  const row = {
    event_slug: opts.eventSlug,
    weight_label: weightLabel,
    travel_need: opts.travelNeed,
    updated_at: new Date().toISOString(),
    updated_by: opts.userId,
  }

  let { error } = await admin.from("aau_duals_roster_travel_commitments").upsert(row, {
    onConflict: "event_slug,weight_label",
  })

  // FK on updated_by should not block saves if auth user id is missing from auth.users
  if (error && (error as { code?: string }).code === "23503") {
    ;({ error } = await admin.from("aau_duals_roster_travel_commitments").upsert(
      { ...row, updated_by: null },
      { onConflict: "event_slug,weight_label" },
    ))
  }

  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      return {
        ok: false,
        error: "Travel commitment table missing. Run npm run store:setup-aau-travel or scripts/add-aau-duals-travel-commitments.md in Supabase.",
        needsMigration: true,
      }
    }
    console.error("[RecruitNC] upsertAauTravelCommitment:", error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
