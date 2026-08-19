import type { SupabaseClient } from "@supabase/supabase-js"
import { isToc2026PreorderItem, TOC_2026_PICKUP_METHOD } from "./toc-preorder"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DEFAULT_TAX_RATE = 0.08
const STANDARD_SHIPPING_PRICE = 5
const TAX_EXEMPT_SKUS = new Set(["DROPIN", "BLUE-SUB"])

export type StoreCheckoutItemInput = {
  productId: string
  variantId: string
  quantity: number
}

export type StoreCheckoutShippingInput = {
  id: "standard" | "pickup" | string
}

export type AuthoritativeStoreCheckoutItem = {
  id: string
  variantId: string
  name: string
  price: number
  quantity: number
  variant: { color: string; size: string }
  sku: string
  image?: string
}

export type AuthoritativeStoreCheckout = {
  items: AuthoritativeStoreCheckoutItem[]
  shippingMethod: {
    id: "standard" | "pickup"
    name: string
    price: number
    estimatedDays: string
  }
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  promoCode?: string
}

type ProductRow = {
  id: string
  name: string | null
  price: number | string | null
  image_url: string | null
  in_stock: boolean | null
  show_in_public_store: boolean | null
  product_variants?: VariantRow[] | null
}

type VariantRow = {
  id: string
  product_id?: string | null
  sku: string | null
  size: string | null
  color: string | null
  stock_quantity: number | null
}

type PromoRow = {
  code: string
  is_active?: boolean | null
  valid_until?: string | null
  valid_from?: string | null
  max_uses?: number | null
  current_uses?: number | null
  min_order_value?: number | null
  discount_type?: "percentage" | "fixed" | "free_shipping" | string | null
  discount_value?: number | null
}

export type AuthoritativeCheckoutResult =
  | { ok: true; checkout: AuthoritativeStoreCheckout }
  | { ok: false; error: string }

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function configuredTaxRate(): number {
  const raw = Number(process.env.STORE_TAX_RATE)
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : DEFAULT_TAX_RATE
}

function normalizePromoCode(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase()
}

async function loadPromoCode(
  supabase: SupabaseClient,
  rawCode: string,
): Promise<PromoRow | null> {
  const candidates = [...new Set([rawCode, rawCode.replace(/%/g, "")].filter(Boolean))]
  for (const code of candidates) {
    const { data } = await supabase
      .from("promo_codes")
      .select("code, is_active, valid_until, valid_from, max_uses, current_uses, min_order_value, discount_type, discount_value")
      .eq("code", code)
      .maybeSingle()
    if (data) return data as PromoRow
  }
  return null
}

function validatePromo(promo: PromoRow, subtotal: number, now: Date): string | null {
  if (!promo.is_active) return "Promo code is not active"
  if (promo.valid_until && new Date(promo.valid_until) < now) return "Promo code has expired"
  if (promo.valid_from && new Date(promo.valid_from) > now) return "Promo code is not yet valid"
  if (
    promo.max_uses != null &&
    promo.current_uses != null &&
    promo.current_uses >= promo.max_uses
  ) {
    return "Promo code usage limit reached"
  }
  if (Number(promo.min_order_value ?? 0) > subtotal) {
    return `Minimum purchase of $${Number(promo.min_order_value).toFixed(2)} required`
  }
  return null
}

/**
 * Rebuild the complete order from live catalog data. Nothing financial supplied by the
 * browser is trusted: prices, variants, stock, shipping, promotions, tax, and totals all
 * come from server-owned rules and database rows.
 */
export async function buildAuthoritativeStoreCheckout(
  supabase: SupabaseClient,
  input: {
    items: StoreCheckoutItemInput[]
    shippingMethod: StoreCheckoutShippingInput
    promoCode?: string | null
  },
): Promise<AuthoritativeCheckoutResult> {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: "Your cart is empty." }
  }
  if (input.items.length > 50) {
    return { ok: false, error: "Your cart has too many line items." }
  }

  const grouped = new Map<string, StoreCheckoutItemInput>()
  for (const raw of input.items) {
    const productId = String(raw.productId ?? "").trim()
    const variantId = String(raw.variantId ?? "").trim()
    const quantity = Number(raw.quantity)
    if (!UUID_RE.test(productId) || !UUID_RE.test(variantId)) {
      return { ok: false, error: "One or more cart items are outdated. Please remove them and add them again." }
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return { ok: false, error: "Item quantities must be whole numbers between 1 and 99." }
    }
    const key = `${productId}:${variantId}`
    const prior = grouped.get(key)
    const nextQuantity = (prior?.quantity ?? 0) + quantity
    if (nextQuantity > 99) {
      return { ok: false, error: "An item quantity exceeds the allowed limit." }
    }
    grouped.set(key, { productId, variantId, quantity: nextQuantity })
  }

  const productIds = [...new Set([...grouped.values()].map((item) => item.productId))]
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, price, image_url, in_stock, show_in_public_store, product_variants(id, product_id, sku, size, color, stock_quantity)",
    )
    .in("id", productIds)

  if (error) {
    console.error("[store] authoritative catalog lookup:", error)
    return { ok: false, error: "We could not verify the items in your cart. Please try again." }
  }

  const products = new Map(
    ((data ?? []) as ProductRow[]).map((product) => [String(product.id), product]),
  )
  const items: AuthoritativeStoreCheckoutItem[] = []

  for (const requested of grouped.values()) {
    const product = products.get(requested.productId)
    if (!product || product.in_stock !== true || product.show_in_public_store !== true) {
      return { ok: false, error: "An item in your cart is no longer available." }
    }
    const variant = (product.product_variants ?? []).find(
      (candidate) => String(candidate.id) === requested.variantId,
    )
    if (!variant || (variant.product_id && String(variant.product_id) !== requested.productId)) {
      return { ok: false, error: `${product.name ?? "An item"} has an invalid size or color selection.` }
    }
    const stockNumber = Number(variant.stock_quantity ?? 0)
    const available = Number.isFinite(stockNumber) ? Math.max(0, stockNumber) : 0
    if (requested.quantity > available) {
      const label = [variant.color, variant.size].filter(Boolean).join(" / ")
      return {
        ok: false,
        error: `${product.name ?? "This item"}${label ? ` (${label})` : ""} only has ${available} available.`,
      }
    }
    const rawPrice = Number(product.price)
    if (product.price == null || !Number.isFinite(rawPrice) || rawPrice < 0) {
      return { ok: false, error: `${product.name ?? "An item"} does not have a valid price.` }
    }
    const price = money(rawPrice)
    items.push({
      id: requested.productId,
      variantId: requested.variantId,
      name: product.name ?? "NC United product",
      price,
      quantity: requested.quantity,
      variant: { color: variant.color ?? "", size: variant.size ?? "" },
      sku: variant.sku?.trim() || `NCU-${requested.variantId.slice(0, 8)}`,
      image: product.image_url ?? undefined,
    })
  }

  const shippingId = String(input.shippingMethod?.id ?? "").trim().toLowerCase()
  if (shippingId !== "standard" && shippingId !== "pickup") {
    return { ok: false, error: "Please select a valid shipping method." }
  }
  const hasTocPreorder = items.some(isToc2026PreorderItem)
  if (hasTocPreorder && shippingId !== "pickup") {
    return { ok: false, error: "Tournament of Champions preorder shirts are available for event pickup only." }
  }
  const shippingMethod = shippingId === "pickup"
    ? hasTocPreorder
      ? {
          id: TOC_2026_PICKUP_METHOD.id,
          name: TOC_2026_PICKUP_METHOD.name,
          price: TOC_2026_PICKUP_METHOD.price,
          estimatedDays: TOC_2026_PICKUP_METHOD.days,
        }
      : {
        id: "pickup" as const,
        name: "Free pickup at NC United Blue practices",
        price: 0,
        estimatedDays: "Sundays at UNC",
      }
    : {
        id: "standard" as const,
        name: "Ship anywhere",
        price: STANDARD_SHIPPING_PRICE,
        estimatedDays: "5-7 business days",
      }

  const subtotal = money(items.reduce((sum, item) => sum + item.price * item.quantity, 0))
  let shipping = shippingMethod.price
  let discount = 0
  let promoCode: string | undefined
  const normalizedPromo = normalizePromoCode(input.promoCode)

  if (normalizedPromo) {
    const promo = await loadPromoCode(supabase, normalizedPromo)
    if (!promo) return { ok: false, error: `Promo code "${normalizedPromo}" was not found.` }
    const promoError = validatePromo(promo, subtotal, new Date())
    if (promoError) return { ok: false, error: promoError }

    if (promo.discount_type === "percentage") {
      const percentage = Math.min(100, Math.max(0, Number(promo.discount_value ?? 0)))
      discount = money(subtotal * (percentage / 100))
    } else if (promo.discount_type === "fixed") {
      discount = money(Math.min(subtotal, Math.max(0, Number(promo.discount_value ?? 0))))
    } else if (promo.discount_type === "free_shipping") {
      shipping = 0
    } else {
      return { ok: false, error: "Promo code has an unsupported discount type." }
    }
    promoCode = promo.code
  }

  const taxableSubtotal = Math.max(0, subtotal - discount)
  const allTaxExempt = items.every((item) => TAX_EXEMPT_SKUS.has(item.sku.toUpperCase()))
  const tax = allTaxExempt ? 0 : money(taxableSubtotal * configuredTaxRate())
  const total = money(Math.max(0, taxableSubtotal + shipping + tax))

  return {
    ok: true,
    checkout: {
      items,
      shippingMethod: { ...shippingMethod, price: shipping },
      subtotal,
      shipping,
      tax,
      discount,
      total,
      promoCode,
    },
  }
}
