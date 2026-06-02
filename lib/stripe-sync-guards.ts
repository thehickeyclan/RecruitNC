import type Stripe from "stripe"
import { isGuildCheckoutSession } from "@/lib/stripe-guild-detection"

/** Checkout sessions that must not become generic store orders via sync/recover. */
export function checkoutSessionIsNonStoreImport(session: Stripe.Checkout.Session): boolean {
  const m = (session.metadata ?? {}) as Record<string, string>
  if (isGuildCheckoutSession(session)) return true
  const channel = String(m.channel ?? "").trim().toLowerCase()
  if (channel === "spartan" || channel === "guild" || channel === "bookings" || channel === "blue") return true
  if (String(m.source ?? "").trim() === "national_team") return true
  if (String(m.business ?? "").trim().toLowerCase() === "wrestling_guild") return true
  if (m.drop_in_request_id?.trim()) return true
  return false
}
