import Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import { flatBillingFromAddress, flatShippingFromAddress, shippingNameFromCustomerName } from "@/lib/order-shipping"
import {
  fetchMergedStoreMetadata,
  isPlaceholderOrderCustomer,
  parseLegacyShippingAddressJson,
  parseLegacyShippingMethodJson,
} from "@/lib/store/stripe-legacy-metadata"

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key?.trim()) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(key)
}

function shippingNeedsHydrate(order: Record<string, unknown>): boolean {
  const method = order.shipping_method
  const methodName =
    typeof method === "object" && method !== null
      ? String((method as { name?: string }).name ?? "")
      : String(method ?? "")
  if (/^recovered$/i.test(methodName)) return true
  const addr = (order.shipping_address as Record<string, unknown>) || {}
  const line1 =
    order.shipping_address_line1 ??
    addr.address1 ??
    addr.line1 ??
    ""
  return !String(line1).trim()
}

/** Backfill customer + shipping from Charge metadata (legacy store.ncwrestlingunited.com checkout). */
export async function hydrateOrderCustomerFromStripe(
  supabase: SupabaseClient,
  order: Record<string, unknown>,
): Promise<boolean> {
  const piId = order.stripe_payment_intent_id as string | null | undefined
  if (!piId) return false

  const email = String(order.customer_email ?? "")
  const name = String(order.customer_name ?? "")
  const needsCustomer = isPlaceholderOrderCustomer(email, name)
  const needsShipping = shippingNeedsHydrate(order)
  if (!needsCustomer && !needsShipping) return false

  const stripe = getStripe()
  const { meta } = await fetchMergedStoreMetadata(stripe, piId)

  const customerEmail = meta.customer_email?.trim()
  const customerName = meta.customer_name?.trim()
  if (!customerEmail && !customerName && !meta.shipping_address) return false

  const shippingAddress = parseLegacyShippingAddressJson(meta.shipping_address)
  const shippingMethod = parseLegacyShippingMethodJson(meta.shipping_method)
  const resolvedName =
    customerName ||
    [shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(" ").trim() ||
    name

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (needsCustomer && customerEmail && !isPlaceholderOrderCustomer(customerEmail, resolvedName)) {
    update.customer_email = customerEmail
    update.email = customerEmail
    update.customer_name = resolvedName
  } else if (needsCustomer && customerName && !isPlaceholderOrderCustomer(email, customerName)) {
    update.customer_name = customerName
  }

  if (needsShipping && Object.keys(shippingAddress).length > 0) {
    const shippingName = shippingNameFromCustomerName(resolvedName)
    Object.assign(update, flatShippingFromAddress(shippingAddress))
    Object.assign(update, flatBillingFromAddress(shippingAddress))
    update.shipping_first_name = shippingName.shipping_first_name
    update.shipping_last_name = shippingName.shipping_last_name
    update.billing_first_name = shippingName.shipping_first_name
    update.billing_last_name = shippingName.shipping_last_name
    update.shipping_address = shippingAddress
    update.shipping_method = shippingMethod
    if (meta.shipping) update.shipping_cost = Number(meta.shipping) || 0
  }

  if (Object.keys(update).length <= 1) return false

  const { error } = await supabase.from("orders").update(update).eq("id", order.id as string)
  if (error) {
    console.error("[hydrateOrderCustomerFromStripe]", order.id, error)
    return false
  }
  return true
}

/** Apply Stripe Charge/PI metadata on the in-memory order so admin matches legacy store display. */
export async function overlayOrderFromStripeForDisplay(order: Record<string, unknown>): Promise<void> {
  const piId = order.stripe_payment_intent_id as string | null | undefined
  if (!piId) return

  const email = String(order.customer_email ?? order.email ?? "")
  const name = String(order.customer_name ?? "")
  const needsCustomer = isPlaceholderOrderCustomer(email, name)
  const needsShipping = shippingNeedsHydrate(order)
  if (!needsCustomer && !needsShipping) return

  try {
    const stripe = getStripe()
    const { meta } = await fetchMergedStoreMetadata(stripe, piId)
    const customerEmail = meta.customer_email?.trim()
    const customerName = meta.customer_name?.trim()
    const shippingAddress = parseLegacyShippingAddressJson(meta.shipping_address)
    const shippingMethod = parseLegacyShippingMethodJson(meta.shipping_method)
    const resolvedName =
      customerName ||
      [shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(" ").trim() ||
      name

    if (needsCustomer && customerEmail && !isPlaceholderOrderCustomer(customerEmail, resolvedName)) {
      order.customer_email = customerEmail
      order.email = customerEmail
      order.customer_name = resolvedName
    } else if (needsCustomer && customerName && !isPlaceholderOrderCustomer(email, customerName)) {
      order.customer_name = resolvedName
    }

    if (needsShipping && Object.keys(shippingAddress).length > 0) {
      const shippingName = shippingNameFromCustomerName(resolvedName)
      Object.assign(order, flatShippingFromAddress(shippingAddress))
      Object.assign(order, flatBillingFromAddress(shippingAddress))
      order.shipping_first_name = shippingName.shipping_first_name
      order.shipping_last_name = shippingName.shipping_last_name
      order.billing_first_name = shippingName.shipping_first_name
      order.billing_last_name = shippingName.shipping_last_name
      order.shipping_address = shippingAddress
      order.shipping_method = shippingMethod
      if (meta.shipping) order.shipping_cost = Number(meta.shipping) || 0
    }
  } catch (err) {
    console.warn("[overlayOrderFromStripeForDisplay]", order.id, err)
  }
}
