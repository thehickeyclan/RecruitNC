import "server-only"

import Stripe from "stripe"

let _stripe: Stripe | null = null

/**
 * Read Stripe secret at request time. Bracket access avoids Next.js build-time
 * inlining `undefined` into serverless bundles when the key exists only at runtime on Vercel.
 */
export function readStripeSecretKey(): string {
  const raw = process.env["STRIPE_SECRET_KEY"]
  return typeof raw === "string" ? raw.trim() : ""
}

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = readStripeSecretKey()
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }
    _stripe = new Stripe(key)
  }
  return _stripe
}

/** @deprecated Use getStripe() instead for lazy initialization */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})
