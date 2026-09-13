import Stripe from "stripe"

const STRIPE_API_VERSION: Stripe.StripeConfig["apiVersion"] = "2024-06-20"

let stripeClient: Stripe | null = null

export function getNcUnitedStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable")
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION })
  }
  return stripeClient
}

export function getDropInFeeCents(): number {
  const raw = process.env.STRIPE_DROP_IN_FEE_CENTS
  const parsed = raw ? Number.parseInt(raw, 10) : 2500
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2500
}

/** Base URL for Stripe success/cancel redirects (calendar + drop-in). */
export function getNcUnitedCalendarBaseUrl(): string {
  /*
   * The site's own address before Vercel's. Production sets APP_URL and SITE_URL but never
   * BASE_URL, so every drop-in checkout sent families back to the per-deployment
   * `…-gyaanais-projects.vercel.app` address — a URL a parent does not recognise, pinned to one
   * build rather than the live site.
   */
  const baseUrl = [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ].find((value) => value && value.trim().length > 0)
  if (baseUrl) {
    return baseUrl.trim().replace(/\/$/, "")
  }
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    return `https://${vercelUrl}`
  }
  return "http://localhost:3000"
}
