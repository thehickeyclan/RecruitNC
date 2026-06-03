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

/** Actionable JSON when Stripe secret is missing (Preview deploys often lack Preview-scoped env). */
export function stripeKeyMissingPayload() {
  const vercelEnv = process.env["VERCEL_ENV"] ?? null
  const hint =
    vercelEnv === "preview"
      ? "This is a Vercel Preview deployment. In Vercel → Project → Settings → Environment Variables, enable STRIPE_SECRET_KEY for Preview (not only Production), then redeploy. Or use your Production URL."
      : "Add STRIPE_SECRET_KEY in Vercel → Settings → Environment Variables for this environment, then redeploy with cache cleared."
  return {
    error: "STRIPE_SECRET_KEY not set on this deployment",
    hint,
    vercelEnv,
  }
}

export function readStripeConfigStatus(): {
  stripeSecretConfigured: boolean
  vercelEnv: string | null
} {
  return {
    stripeSecretConfigured: readStripeSecretKey().length > 0,
    vercelEnv: process.env["VERCEL_ENV"] ?? null,
  }
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
