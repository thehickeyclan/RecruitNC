import type { SupabaseClient } from "@supabase/supabase-js"
import type { AthleteFundraisingProfileRow } from "@/lib/fundraising/athlete-fundraising-profiles"
import { normalizeFundraisingProfileSlug } from "@/lib/fundraising/athlete-fundraising-profiles"

/** True when this profile row is allowed to collect gifts on the public athlete URL. */
export function isProfileCheckoutLive(profile: AthleteFundraisingProfileRow | null | undefined): boolean {
  if (!profile) return false
  return profile.checkout_live === true
}

/**
 * Server gate for `/api/spartan/checkout` when return slug is an athlete gift page (not training-fund / scholarships).
 */
export async function isAthleteFundraisingSlugCheckoutLive(
  admin: SupabaseClient,
  slugInput: string,
): Promise<boolean> {
  const slug = normalizeFundraisingProfileSlug(slugInput)
  if (!slug) return false
  const { data, error } = await admin
    .from("athlete_fundraising_profiles")
    .select("checkout_live")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle()
  if (error) {
    console.warn("[fundraising-checkout-live] slug lookup", error.message)
    return false
  }
  if (!data) return false
  return (data as { checkout_live?: boolean }).checkout_live === true
}
