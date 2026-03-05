import type { SupabaseClient } from "@supabase/supabase-js"
import { findExistingAthlete, findAthleteByEmail } from "@/lib/athlete-duplicate-check"
import { getAthletesColumnNames, filterPayloadToSchema } from "@/lib/athletes-schema"

/** Payload of optional fields we might have from an order, signup, or form. Only non-empty values are merged. */
export type EnrichmentPayload = {
  contact_email?: string | null
  phone?: string | null
  name?: string | null
  firstname?: string | null
  lastname?: string | null
  highschool?: string | null
  weightclass?: string | null
  wrestling_club?: string | null
  gpa?: number | string | null
  additional_achievements?: string | null
  [key: string]: unknown
}

/**
 * Build an update payload with only defined, non-empty values so we don't overwrite with blanks.
 */
export function buildEnrichmentPayload(fields: EnrichmentPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue
    if (typeof value === "string" && !value.trim()) continue
    out[key] = value
  }
  return out
}

/**
 * Update an athlete with the given payload. Only sends keys that exist on the athletes table.
 * Returns true if update was performed (and had at least one field besides updated_at).
 */
export async function enrichAthleteFromPayload(
  admin: SupabaseClient,
  athleteId: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (Object.keys(payload).length === 0) return false
  const columns = await getAthletesColumnNames(admin)
  const withUpdated = { ...payload, updated_at: new Date().toISOString() }
  const filtered = filterPayloadToSchema(withUpdated, columns)
  const contentKeys = Object.keys(filtered).filter((k) => k !== "id" && k !== "updated_at")
  if (contentKeys.length === 0) return false
  const { error } = await admin.from("athletes").update(filtered).eq("id", athleteId)
  if (error) {
    console.warn("[enrich-athlete-profile] update failed:", error.message)
    return false
  }
  return true
}

/**
 * Find an athlete by email, or by name + graduation year + school. If found, enrich with payload.
 * Use after orders, drop-in, tournament signup, interest forms, etc.
 */
export async function findAndEnrichAthlete(
  admin: SupabaseClient,
  options: {
    email?: string | null
    name?: string | null
    graduationYear?: number | null
    school?: string | null
  },
  payload: Record<string, unknown>
): Promise<boolean> {
  const merged = buildEnrichmentPayload(payload as EnrichmentPayload)
  if (Object.keys(merged).length === 0) return false

  let athleteId: string | null = null
  const email = (options.email ?? "").toString().trim().toLowerCase()
  if (email && email.includes("@")) {
    const byEmail = await findAthleteByEmail(admin, email)
    if (byEmail) athleteId = byEmail.id
  }
  if (!athleteId && options.name && options.graduationYear != null) {
    const gradYear = Number(options.graduationYear)
    if (Number.isFinite(gradYear) && gradYear >= 2020 && gradYear <= 2040) {
      const byName = await findExistingAthlete(admin, {
        name: options.name.trim(),
        graduationYear: gradYear,
        school: (options.school ?? "").toString().trim() || undefined,
      })
      if (byName) athleteId = byName.id
    }
  }
  if (!athleteId) return false
  return enrichAthleteFromPayload(admin, athleteId, merged)
}

/**
 * Build enrichment payload from order/customer data (store, drop-in, apparel).
 */
export function enrichmentFromOrderCustomer(data: {
  customer_email?: string | null
  customer_name?: string | null
  shipping_address?: Record<string, unknown> | null
  shipping_phone?: string | null
}): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const email = (data.customer_email ?? "").toString().trim()
  if (email && email.includes("@") && !email.toLowerCase().includes("placeholder")) out.contact_email = email
  const name = (data.customer_name ?? "").toString().trim()
  if (name && !["customer", "guest", "unknown", "recovered", "practice drop-in"].includes(name.toLowerCase())) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      out.firstname = parts[0]
      out.lastname = parts.slice(1).join(" ")
    } else if (parts.length === 1) {
      out.name = name
    }
  }
  const addr = data.shipping_address ?? {}
  const phone = (addr.phone ?? addr.shipping_phone ?? data.shipping_phone ?? "").toString().trim()
  if (phone) out.phone = phone
  return out
}
