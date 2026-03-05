/**
 * Helpers for orders table shipping/billing columns that may be NOT NULL.
 * Use in recover-order, webhook, and any code that inserts into orders.
 *
 * Columns we provide (all NOT NULL-safe): shipping_first_name, shipping_last_name,
 * billing_first_name, billing_last_name; shipping_address_line1/2, shipping_city,
 * (email is set separately in each insert, same as customer_email.)
 * shipping_state, shipping_postal_code, shipping_country, shipping_phone;
 * billing_address_line1/2, billing_city, billing_state, billing_postal_code,
 * billing_country. (billing_phone omitted — add back if your orders table has it.) If your DB has more NOT NULL columns, run the
 * query in docs/ORDERS-TABLE-REQUIRED-COLUMNS.md and add them here or relax the constraint.
 */

export function shippingNameFromCustomerName(customerName: string): {
  shipping_first_name: string
  shipping_last_name: string
} {
  const name = (customerName || "").trim() || "Recovered"
  const parts = name.split(/\s+/).filter(Boolean)
  const first = parts[0] ?? "Recovered"
  const last = parts.slice(1).join(" ") || "Customer"
  return { shipping_first_name: first, shipping_last_name: last }
}

export function flatShippingFromAddress(addr: Record<string, unknown> | null | undefined): {
  shipping_address_line1: string
  shipping_address_line2: string
  shipping_city: string
  shipping_state: string
  shipping_postal_code: string
  shipping_country: string
  shipping_phone: string
} {
  const a = addr ?? {}
  const line1 = (a.address1 ?? a.line1 ?? a.shipping_address_line1 ?? "") as string
  const line2 = (a.address2 ?? a.line2 ?? a.shipping_address_line2 ?? "") as string
  const city = (a.city ?? a.shipping_city ?? "") as string
  const state = (a.state ?? a.shipping_state ?? "") as string
  const zip = (a.zipCode ?? a.postal_code ?? a.zip ?? a.shipping_postal_code ?? "") as string
  const country = (a.country ?? a.shipping_country ?? "US") as string
  const phone = (a.phone ?? a.shipping_phone ?? "") as string
  return {
    shipping_address_line1: String(line1).trim() || "Recovered",
    shipping_address_line2: String(line2).trim(),
    shipping_city: String(city).trim(),
    shipping_state: String(state).trim(),
    shipping_postal_code: String(zip).trim(),
    shipping_country: String(country).trim() || "US",
    shipping_phone: String(phone).trim(),
  }
}

/** Billing address columns (NOT NULL-safe). Use same address as shipping or empty defaults for recovered orders. No billing_phone — many orders tables don't have it. */
export function flatBillingFromAddress(addr: Record<string, unknown> | null | undefined): {
  billing_address_line1: string
  billing_address_line2: string
  billing_city: string
  billing_state: string
  billing_postal_code: string
  billing_country: string
} {
  const ship = flatShippingFromAddress(addr)
  return {
    billing_address_line1: ship.shipping_address_line1,
    billing_address_line2: ship.shipping_address_line2,
    billing_city: ship.shipping_city,
    billing_state: ship.shipping_state,
    billing_postal_code: ship.shipping_postal_code,
    billing_country: ship.shipping_country,
  }
}

/** All shipping + billing name and address fields needed for orders insert when DB has NOT NULL on these columns. */
export function orderShippingFields(customerName: string, address: Record<string, unknown> | null | undefined) {
  const names = shippingNameFromCustomerName(customerName)
  return {
    ...names,
    billing_first_name: names.shipping_first_name,
    billing_last_name: names.shipping_last_name,
    ...flatShippingFromAddress(address),
    ...flatBillingFromAddress(address),
  }
}
