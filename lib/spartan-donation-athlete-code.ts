import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import type { SpartanDonationCheckoutAttribution } from "@/lib/spartan-donation-checkout-attribution"

const NCU_CODE_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/

/**
 * Extract NCU code from Stripe Checkout `metadata` only (no DB).
 * Handles empty / missing keys so webhook rows are not stored with NULL when metadata has the code.
 */
export function athleteCodeFromStripeSessionMetadata(
  meta: Record<string, string | undefined> | null | undefined,
): string | null {
  if (!meta) return null
  const direct = String(meta.athlete_code ?? "").trim()
  if (direct && NCU_CODE_RE.test(direct)) return direct.toUpperCase()
  for (const [k, v] of Object.entries(meta)) {
    if (!v || typeof v !== "string") continue
    const t = v.trim()
    if (!NCU_CODE_RE.test(t)) continue
    if (k.toLowerCase().replace(/\s+/g, "") === "athletecode" || k.toLowerCase() === "athlete_code") {
      return t.toUpperCase()
    }
  }
  return null
}

/**
 * `spartan_donations.raw_metadata` — same as live Stripe metadata plus normalized keys written on upsert.
 * Used when `athlete_code` column is NULL on legacy rows but metadata still has the NCU.
 */
export function athleteCodeFromPersistedDonationRawMetadata(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const m = raw as Record<string, unknown>
  const sessionShape = athleteCodeFromStripeSessionMetadata(m as Record<string, string | undefined>)
  if (sessionShape) return sessionShape
  for (const key of ["fundraising_code", "Fundraising_code"] as const) {
    const v = m[key]
    if (typeof v === "string" && NCU_CODE_RE.test(v.trim())) return v.trim().toUpperCase()
  }
  return null
}

/** Parse `?athlete=NCU-...` (and variants) from Checkout success_url — common on /spartan and hub flows. */
export function athleteCodeFromCheckoutSuccessUrl(successUrl: string | null | undefined): string | null {
  const u = successUrl?.trim()
  if (!u) return null
  try {
    const url = new URL(u)
    for (const key of ["athlete", "athlete_code", "Athlete"]) {
      const raw = url.searchParams.get(key)
      const t = raw?.trim()
      if (t && NCU_CODE_RE.test(t)) return t.toUpperCase()
    }
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Final athlete NCU code for `spartan_donations.athlete_code`: Stripe metadata first, then success_url
 * query param, then profile primary code by fundraising slug (athlete page / embedded checkout).
 */
export async function resolveAthleteCodeForSpartanCheckout(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
  attribution: SpartanDonationCheckoutAttribution,
): Promise<string | null> {
  const meta = session.metadata as Record<string, string | undefined> | undefined

  const fromMeta = athleteCodeFromStripeSessionMetadata(meta)
  if (fromMeta) return fromMeta

  const fromUrl = athleteCodeFromCheckoutSuccessUrl(session.success_url)
  if (fromUrl) return fromUrl

  const slug =
    attribution.fundraisingAthleteSlug?.trim().toLowerCase() ||
    (typeof meta?.fundraising_athlete_slug === "string" ? meta.fundraising_athlete_slug.trim().toLowerCase() : "")
  if (!slug) return null

  const { data: profile, error } = await admin
    .from("athlete_fundraising_profiles")
    .select("primary_fundraising_code")
    .ilike("slug", slug)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    console.warn("[spartan-donation-athlete-code] profile by slug", slug, error.message)
  }

  const codeRaw =
    profile && typeof (profile as { primary_fundraising_code?: string | null }).primary_fundraising_code === "string"
      ? String((profile as { primary_fundraising_code: string }).primary_fundraising_code).trim()
      : ""
  if (codeRaw && NCU_CODE_RE.test(codeRaw)) return codeRaw.toUpperCase()

  return null
}
