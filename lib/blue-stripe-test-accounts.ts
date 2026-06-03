import type Stripe from "stripe"

/** Internal Blue checkout test subscriptions — excluded from admin Stripe totals. */
const DEFAULT_BLUE_STRIPE_TEST_CUSTOMER_EMAILS = [
  "thehickeyclan@gmail.com",
  "jeannineaponte@gmail.com",
] as const

export function readBlueStripeTestCustomerEmails(): Set<string> {
  const fromEnv = (process.env.BLUE_STRIPE_TEST_CUSTOMER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return new Set([...DEFAULT_BLUE_STRIPE_TEST_CUSTOMER_EMAILS, ...fromEnv])
}

export function isBlueStripeTestCustomerEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false
  return readBlueStripeTestCustomerEmails().has(email.trim().toLowerCase())
}

export function stripeSubscriptionCustomerEmail(sub: Stripe.Subscription): string | null {
  const customer = sub.customer
  if (typeof customer === "object" && customer && !("deleted" in customer && customer.deleted)) {
    const email = customer.email?.trim().toLowerCase()
    return email || null
  }
  return null
}

export function isBlueStripeTestSubscription(sub: Stripe.Subscription): boolean {
  return isBlueStripeTestCustomerEmail(stripeSubscriptionCustomerEmail(sub))
}

export function isBlueStripeTestMembershipRow(row: {
  payer_email?: string | null
}): boolean {
  return isBlueStripeTestCustomerEmail(row.payer_email)
}
