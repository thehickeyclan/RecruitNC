import type Stripe from "stripe"

/**
 * Persisted on `spartan_donations` so reporting never depends on digging in Stripe or raw JSON.
 * Prefer Stripe `metadata`; fall back to `success_url` when metadata omitted (older checkouts).
 */
export type SpartanDonationCheckoutAttribution = {
  fundraisingCheckoutSurface: string | null
  fundraisingAthleteSlug: string | null
}

const SURFACE = {
  ATHLETE_PAGE: "athlete_page",
  TRAINING_FUND: "training_fund",
  SCHOLARSHIP_FUND: "scholarship_fund",
  SPARTAN_TEAM_PAGE: "spartan_team_page",
  HUB_GIVE: "hub_give",
} as const

/** Derive attribution for webhook upsert (metadata first, then success_url path).
 *  success_url is used as a cross-check: if it clearly indicates an athlete page
 *  but metadata says otherwise, the URL wins (guards against stale/wrong metadata). */
export function deriveCheckoutAttributionFromStripeSession(session: Stripe.Checkout.Session): SpartanDonationCheckoutAttribution {
  const meta = session.metadata ?? {}
  const fromMeta = typeof meta.fundraising_checkout_surface === "string" ? meta.fundraising_checkout_surface.trim() : ""
  const slugMeta =
    typeof meta.fundraising_athlete_slug === "string" && meta.fundraising_athlete_slug.trim()
      ? meta.fundraising_athlete_slug.trim().toLowerCase()
      : null

  // Always parse success_url so we can cross-check against metadata
  const urlAttribution = deriveFromSuccessUrl(session.success_url)

  // If success_url clearly says athlete_page but metadata disagrees, trust the URL
  if (urlAttribution.fundraisingCheckoutSurface === SURFACE.ATHLETE_PAGE && fromMeta && fromMeta !== SURFACE.ATHLETE_PAGE) {
    return urlAttribution
  }

  if (fromMeta) {
    return { fundraisingCheckoutSurface: fromMeta, fundraisingAthleteSlug: slugMeta }
  }

  return urlAttribution
}

function deriveFromSuccessUrl(successUrl: string | null | undefined): SpartanDonationCheckoutAttribution {
  const url = successUrl?.trim()
  if (!url) {
    return { fundraisingCheckoutSurface: null, fundraisingAthleteSlug: null }
  }
  try {
    const u = new URL(url)
    const path = u.pathname

    const athleteMatch = /^\/fundraising\/athletes\/([^/]+)/.exec(path)
    if (athleteMatch?.[1]) {
      return {
        fundraisingCheckoutSurface: SURFACE.ATHLETE_PAGE,
        fundraisingAthleteSlug: athleteMatch[1]!.toLowerCase(),
      }
    }
    if (path.includes("/fundraising/training-fund")) {
      return { fundraisingCheckoutSurface: SURFACE.TRAINING_FUND, fundraisingAthleteSlug: null }
    }
    if (path.includes("/fundraising/scholarships/")) {
      return { fundraisingCheckoutSurface: SURFACE.SCHOLARSHIP_FUND, fundraisingAthleteSlug: null }
    }
    if (path.startsWith("/spartan") || path.includes("/spartan/")) {
      return { fundraisingCheckoutSurface: SURFACE.SPARTAN_TEAM_PAGE, fundraisingAthleteSlug: null }
    }
    if (path.includes("/fundraising/give")) {
      return { fundraisingCheckoutSurface: SURFACE.HUB_GIVE, fundraisingAthleteSlug: null }
    }
  } catch {
    /* ignore invalid url */
  }
  return { fundraisingCheckoutSurface: null, fundraisingAthleteSlug: null }
}
