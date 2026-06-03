import type { SupabaseClient } from "@supabase/supabase-js"
import type { OrderCategory } from "@/lib/admin-data"
import type {
  AdminDisplayLineItem,
  AdminOrderContextRow,
  AdminOrderKind,
  AdminOrderTypeBanner,
  ResolvedAdminOrderDisplay,
} from "@/lib/admin/resolve-order-display"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"
import { isMisclassifiedGuildGhostLineName } from "@/lib/stripe-guild-misclassified-line"

export type AdminManualOrderCategory = OrderCategory | "Donation"

export const MANUAL_ORDER_CATEGORIES: AdminManualOrderCategory[] = [
  "Apparel",
  "Guild",
  "Drop-In",
  "Donation",
  "Tournament Fee",
  "Blue Sub",
  "Other",
]

type ShippingMethodJson = {
  name?: string
  price?: number
  admin_category?: string
  [key: string]: unknown
}

/** Admin-set classification stored on shipping_method.admin_category (no migration). */
export function adminCategoryFromOrder(order: {
  shipping_method?: unknown
}): AdminManualOrderCategory | null {
  const sm = order.shipping_method
  if (!sm || typeof sm !== "object" || Array.isArray(sm)) return null
  const cat = String((sm as ShippingMethodJson).admin_category ?? "").trim()
  if (!cat) return null
  if (MANUAL_ORDER_CATEGORIES.includes(cat as AdminManualOrderCategory)) {
    return cat as AdminManualOrderCategory
  }
  return null
}

function shippingMethodWithCategory(
  name: string,
  category: AdminManualOrderCategory,
  existing?: unknown,
): ShippingMethodJson {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as ShippingMethodJson) }
      : {}
  return {
    ...base,
    name,
    price: typeof base.price === "number" ? base.price : 0,
    admin_category: category,
  }
}

const PRESETS: Record<
  AdminManualOrderCategory,
  {
    channel: string | null
    business: string | null
    shippingName: string
    lineItemName?: string
  }
> = {
  Guild: {
    channel: "guild",
    business: "wrestling_guild",
    shippingName: "Wrestling Guild",
    lineItemName: "Wrestling Guild booking",
  },
  "Drop-In": {
    channel: null,
    business: null,
    shippingName: "Practice Drop-in",
    lineItemName: "Practice Drop-in",
  },
  Donation: {
    channel: "spartan",
    business: "fundraising",
    shippingName: "Fundraising donation",
    lineItemName: "Fundraising donation",
  },
  "Tournament Fee": {
    channel: "national_team",
    business: null,
    shippingName: "National team event",
  },
  "Blue Sub": {
    channel: "blue",
    business: null,
    shippingName: "NC United Blue – Monthly",
    lineItemName: "NC United Blue – Monthly",
  },
  Apparel: {
    channel: "store",
    business: null,
    shippingName: "Standard Shipping",
  },
  Other: {
    channel: null,
    business: null,
    shippingName: "Order",
  },
}

function lineShouldRename(productName: string | null | undefined): boolean {
  return isMisclassifiedGuildGhostLineName(productName)
}

/** Persist admin category + channel tags so list/detail/filters stay in sync. */
export async function applyManualOrderCategory(
  admin: SupabaseClient,
  orderId: string,
  category: AdminManualOrderCategory,
): Promise<{ success: true } | { success: false; error: string }> {
  const preset = PRESETS[category]
  if (!preset) return { success: false, error: "Invalid category" }

  const { data: order, error: loadErr } = await admin
    .from("orders")
    .select("id, stripe_payment_intent_id, shipping_method")
    .eq("id", orderId)
    .maybeSingle()
  if (loadErr || !order) return { success: false, error: loadErr?.message ?? "Order not found" }

  const piId = String((order as { stripe_payment_intent_id?: string }).stripe_payment_intent_id ?? "").trim()
  const shipping_method = shippingMethodWithCategory(
    preset.shippingName,
    category,
    (order as { shipping_method?: unknown }).shipping_method,
  )

  const { error: updateErr } = await admin
    .from("orders")
    .update({
      channel: preset.channel,
      business: preset.business,
      shipping_method,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
  if (updateErr) return { success: false, error: updateErr.message }

  if (preset.lineItemName) {
    const { data: items } = await admin.from("order_items").select("id, product_name").eq("order_id", orderId)
    for (const row of items ?? []) {
      const name = String((row as { product_name?: string }).product_name ?? "")
      if (lineShouldRename(name)) {
        await admin
          .from("order_items")
          .update({
            product_name: preset.lineItemName,
            sku: syntheticOrderItemSku({
              productId: null,
              label: preset.lineItemName!,
              dedupeKey: piId ? `manual:${category}:${piId}` : `manual:${category}:${orderId}`,
            }),
          })
          .eq("id", (row as { id: string }).id)
      }
    }
  }

  return { success: true }
}

function mapItems(
  orderId: string,
  items: { id?: string; product_name?: string | null; sku?: string | null; quantity?: number | null; price?: number | null; image_url?: string | null }[],
  fallbackName: string,
  total: number,
  image: string,
): AdminDisplayLineItem[] {
  if (items.length === 0) {
    return [
      {
        id: `manual-${orderId}`,
        name: fallbackName,
        variant: "",
        size: "",
        sku: "manual",
        quantity: 1,
        price: total,
        image,
      },
    ]
  }
  return items.map((item, index) => ({
    id: item.id ?? `manual-${orderId}-${index}`,
    name: item.product_name?.trim() || fallbackName,
    variant: "",
    size: "",
    sku: item.sku ?? "manual",
    quantity: Number(item.quantity) || 1,
    price: Number(item.price) || total,
    image: item.image_url ?? image,
  }))
}

/** Detail page display when admin_category override is set (wins over heuristics). */
export function buildManualCategoryAdminDisplay(input: {
  order: { id: string; total?: number | null; shipping_method?: unknown }
  items: { id?: string; product_name?: string | null; sku?: string | null; quantity?: number | null; price?: number | null; image_url?: string | null }[]
  category: AdminManualOrderCategory
}): ResolvedAdminOrderDisplay | null {
  const { order, items, category } = input
  const orderId = order.id
  const total = Number(order.total ?? 0)
  const manualNote = "Manually classified in admin — overrides automatic Stripe rules."

  const base = {
    contextRows: [] as AdminOrderContextRow[],
    showShipping: false,
    showTracking: false,
    showRecoverItems: false,
  }

  switch (category) {
    case "Guild": {
      const banner: AdminOrderTypeBanner = {
        kind: "guild_booking",
        title: "Wrestling Guild booking",
        description: manualNote,
        logoSrc: "/images/nc-united-stacked-logo-white.png",
        accentClass: "border-violet-500/40 bg-violet-50",
        links: [{ href: "https://www.wrestlingguild.com", label: "Open Wrestling Guild" }],
      }
      return {
        ...base,
        kind: "guild_booking",
        category: "Guild",
        banner,
        lineItems: mapItems(orderId, items, "Wrestling Guild booking", total, banner.logoSrc!),
        fulfillmentLabel: "Wrestling Guild — no RecruitNC shipment",
      }
    }
    case "Drop-In": {
      const banner: AdminOrderTypeBanner = {
        kind: "practice_drop_in",
        title: "Practice drop-in",
        description: manualNote,
        logoSrc: "/images/nc-united-stacked-logo-white.png",
        accentClass: "border-sky-500/40 bg-sky-50",
      }
      return {
        ...base,
        kind: "practice_drop_in",
        category: "Drop-In",
        banner,
        lineItems: mapItems(orderId, items, "Practice Drop-in", total, banner.logoSrc!),
        fulfillmentLabel: "Practice drop-in — no shipping",
      }
    }
    case "Donation": {
      const banner: AdminOrderTypeBanner = {
        kind: "donation",
        title: "Fundraising donation",
        description: manualNote,
        logoSrc: "/images/nc-united-stacked-logo-white.png",
        accentClass: "border-emerald-500/40 bg-emerald-50",
        links: [{ href: "/admin/fundraising", label: "Fundraising admin" }],
      }
      return {
        ...base,
        kind: "donation",
        category: "Donation",
        banner,
        lineItems: mapItems(orderId, items, "Fundraising donation", total, banner.logoSrc!),
        fulfillmentLabel: "Donation — no shipping",
      }
    }
    case "Tournament Fee": {
      const banner: AdminOrderTypeBanner = {
        kind: "national_team_nhsca",
        title: "National team / tournament",
        description: manualNote,
        logoSrc: "/images/nhsca-national-duals-logo.png",
        accentClass: "border-amber-500/40 bg-amber-50",
        links: [{ href: "/admin/national-team", label: "National team admin" }],
      }
      return {
        ...base,
        kind: "national_team_nhsca",
        category: "Tournament Fee",
        banner,
        lineItems: mapItems(orderId, items, "National team registration", total, banner.logoSrc!),
        fulfillmentLabel: "National team event — no shipping",
      }
    }
    case "Blue Sub": {
      const banner: AdminOrderTypeBanner = {
        kind: "blue_subscription",
        title: "NC United Blue membership",
        description: manualNote,
        logoSrc: "/nc-united-blue-logo.png",
        accentClass: "border-[#03154C]/30 bg-[#03154C]/5",
        links: [{ href: "/admin/blue/subscriptions", label: "Blue subscriptions" }],
      }
      return {
        ...base,
        kind: "blue_subscription",
        category: "Blue Sub",
        banner,
        lineItems: mapItems(orderId, items, "NC United Blue – Monthly", total, banner.logoSrc!),
        fulfillmentLabel: "Blue subscription — no shipping",
      }
    }
    case "Apparel":
    case "Other":
      return null
    default:
      return null
  }
}
