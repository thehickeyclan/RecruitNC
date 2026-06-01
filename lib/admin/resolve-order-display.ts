import { AAU_SCHOLASTIC_EVENT_SLUG } from "@/lib/aau-scholastic-duals-2026-content"
import type { OrderCategory } from "@/lib/admin-data"
import { orderItemsNeedNationalTeamDetail } from "@/lib/national-team-order-items"
import {
  nhscaDualsRegistrationOrderLines,
  type NhscaDuals2026Registration,
} from "@/lib/nhsca-duals-2026-registrations"
import { nhscaGearPhotoSrc } from "@/lib/nhsca-duals-2026-gear-images"
import type { DropInRequest } from "@/lib/nc-united-calendar/drop-in-types"
import { formatShippingMethodLabel, isPlaceholderOrderCustomer } from "@/lib/store/stripe-legacy-metadata"
import {
  buildNationalTeamAdminContextRows,
  nationalTeamLineDetailVariant,
  nationalTeamLineGroup,
} from "@/lib/admin/national-team-order-detail"
import { nationalTeamSkuForLine } from "@/lib/national-team-product-catalog"

export type AdminOrderKind =
  | "store_apparel"
  | "blue_subscription"
  | "calendar_drop_in"
  | "practice_drop_in"
  | "national_team_nhsca"
  | "national_team_aau"
  | "donation"
  | "unknown"

export type AdminDisplayLineItem = {
  id: string
  name: string
  variant: string
  sku: string
  quantity: number
  price: number
  image: string
  /** Tournament orders: Registration & fees | Travel | Apparel */
  group?: string
}

export type AdminOrderTypeBanner = {
  kind: AdminOrderKind
  title: string
  description?: string
  logoSrc?: string
  accentClass?: string
  links?: { href: string; label: string }[]
}

export type AdminOrderContextRow = { label: string; value: string }

export type ResolvedAdminOrderDisplay = {
  kind: AdminOrderKind
  category: OrderCategory | "Donation"
  banner: AdminOrderTypeBanner | null
  lineItems: AdminDisplayLineItem[]
  contextRows: AdminOrderContextRow[]
  showShipping: boolean
  showTracking: boolean
  showRecoverItems: boolean
  fulfillmentLabel: string
  /** Legacy store truncated Stripe metadata — do not fulfill from line items alone. */
  fulfillmentUnsafe?: boolean
  integritySummary?: string | null
  integrityDetail?: string | null
}

type OrderItemRow = {
  id?: string
  product_name?: string | null
  sku?: string | null
  quantity?: number | null
  price?: number | null
  color?: string | null
  size?: string | null
  variant?: { color?: string; size?: string } | null
  image_url?: string | null
  product_image_url?: string | null
  product?: {
    name?: string | null
    image_url?: string | null
    product_images?: { url?: string; display_order?: number }[] | null
  } | null
}

type OrderRow = Record<string, unknown> & {
  id: string
  total?: number | null
  subtotal?: number | null
  channel?: string | null
  business?: string | null
  customer_email?: string | null
  customer_name?: string | null
  email?: string | null
  shipping_method?: unknown
  order_items?: OrderItemRow[]
}

type BlueSignupRow = {
  parent_email?: string | null
  parent_first_name?: string | null
  parent_last_name?: string | null
  athlete_first_name?: string | null
  athlete_last_name?: string | null
  athlete_graduation_year?: string | null
  athlete_high_school?: string | null
}

type BlueMembershipRow = {
  status?: string | null
  next_billing_at?: string | null
  stripe_subscription_id?: string | null
}

type SpartanDonationRow = {
  id: string
  donor_name?: string | null
  athlete_code?: string | null
  amount_cents?: number | null
  campaign_slug?: string | null
}

type DropInWithEvent = DropInRequest & {
  events?: {
    title?: string | null
    start_date?: string | null
    start_time?: string | null
    location?: string | null
  } | null
}

function shippingMethodStr(order: OrderRow): string {
  return formatShippingMethodLabel(order.shipping_method)
}

function isBlueOrder(order: OrderRow, items: OrderItemRow[]): boolean {
  const ch = String(order.channel ?? "").toLowerCase()
  if (ch === "blue") return true
  const method = shippingMethodStr(order).toLowerCase()
  if (method.includes("blue membership") || method.includes("blue subscription")) return true
  return items.some((i) => {
    const n = (i.product_name ?? "").toLowerCase()
    return n.includes("blue") && (n.includes("monthly") || n.includes("subscription"))
  })
}

function isPracticeDropIn(order: OrderRow, items: OrderItemRow[]): boolean {
  const method = shippingMethodStr(order).toLowerCase()
  if (method.includes("practice drop-in") || method.includes("practice drop in")) return true
  return items.some((i) => {
    const n = (i.product_name ?? "").toLowerCase()
    return /drop-?in|dropin/.test(n) || (n.includes("practice") && n.includes("drop"))
  })
}

function nhscaLineItemImage(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("singlet")) return nhscaGearPhotoSrc("blue-front")
  if (n.includes("shorts")) return nhscaGearPhotoSrc("shorts")
  if (n.includes("long sleeve")) return nhscaGearPhotoSrc("long-sleeve-front")
  if (n.includes("short sleeve") || n.includes("tee")) return nhscaGearPhotoSrc("short-sleeve-tee")
  if (n.includes("registration") || n.includes("team package")) return "/images/nhsca-national-duals-logo.png"
  if (n.includes("van") || n.includes("hotel") || n.includes("travel")) return "/images/nhsca-virginia-beach-arena.png"
  return "/images/nhsca-logo.png"
}

function aauLineItemImage(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("hotel") || n.includes("van")) return "/images/aau-scholastic-2026/hotel-exterior.png"
  if (n.includes("flight")) return "/images/aau-scholastic-2026/hotel-room.png"
  if (n.includes("singlet")) return nhscaGearPhotoSrc("blue-front")
  if (n.includes("shorts")) return nhscaGearPhotoSrc("shorts")
  if (n.includes("long sleeve")) return nhscaGearPhotoSrc("long-sleeve-front")
  if (n.includes("tee") || n.includes("shirt")) return nhscaGearPhotoSrc("short-sleeve-tee")
  if (n.includes("registration") || n.includes("tournament")) return "/images/nhsca-national-duals-logo.png"
  return "/images/aau-scholastic-2026/hotel-exterior.png"
}

function parseItemVariant(item: OrderItemRow): { color: string; size: string } {
  const raw = item.variant
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as { color?: string; size?: string }
      if (parsed && typeof parsed === "object") {
        return { color: (parsed.color ?? "").trim(), size: (parsed.size ?? "").trim() }
      }
    } catch {
      const [color, size] = raw.split("/")
      return { color: color?.trim() || "", size: size?.trim() || "" }
    }
  }
  const variantObj = (raw as { color?: string; size?: string } | null) || {}
  return {
    color: (item.color || variantObj.color || "").trim(),
    size: (item.size || variantObj.size || "").trim(),
  }
}

function mapStoreLineItem(orderId: string, item: OrderItemRow, index: number): AdminDisplayLineItem {
  const { color, size: rawSize } = parseItemVariant(item)
  const size = rawSize || "One Size"
  let variant = ""
  if (color && size) variant = `${color} / ${size}`
  else if (color) variant = color
  else if (size && size !== "One Size") variant = size
  else variant = "Standard"

  const productImages = item.product?.product_images || []
  const sortedImages = [...productImages].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0),
  )
  const imageUrl =
    sortedImages[0]?.url ||
    item.product?.image_url ||
    item.product_image_url ||
    item.image_url ||
    "/placeholder.svg"

  return {
    id: item.id || `${orderId}-item-${index}`,
    name: item.product_name || item.product?.name || "Unknown Product",
    variant: variant.trim(),
    sku: item.sku || "N/A",
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
    image: imageUrl,
  }
}

function mapNationalTeamLineItems(
  orderId: string,
  reg: NhscaDuals2026Registration,
  isAau: boolean,
): AdminDisplayLineItem[] {
  const imageFor = isAau ? aauLineItemImage : nhscaLineItemImage
  const resolvedLines = nhscaDualsRegistrationOrderLines(reg)
  return resolvedLines.map((line, index) => {
    const qty = line.quantity ?? 1
    const unit = (line.amount_cents ?? 0) / 100 / qty
    const variant = nationalTeamLineDetailVariant(reg, line.name, isAau)
    return {
      id: `nt-${orderId}-${index}`,
      name: line.name,
      variant,
      sku: line.sku ?? nationalTeamSkuForLine(isAau ? AAU_SCHOLASTIC_EVENT_SLUG : "nhsca-duals-2026", {
        key: line.key,
        name: line.name,
      }),
      quantity: qty,
      price: unit,
      image: imageFor(line.name),
      group: nationalTeamLineGroup(line.name),
    }
  })
}

export function resolveOrderCategory(
  order: OrderRow,
  items: OrderItemRow[],
  opts?: {
    nationalTeamRegistration?: { event_slug?: string | null } | null
    dropInRequest?: DropInRequest | null
    spartanDonation?: SpartanDonationRow | null
  },
): OrderCategory | "Donation" {
  if (opts?.spartanDonation) return "Donation"
  if (opts?.nationalTeamRegistration) return "Tournament Fee"
  if (opts?.dropInRequest) return "Drop-In"
  if (isBlueOrder(order, items)) return "Blue Sub"
  if (isPracticeDropIn(order, items)) return "Drop-In"
  const names = items.map((i) => (i.product_name || "").toLowerCase())
  if (names.some((n) => n.includes("nhsca") || n.includes("national team") || n.includes("registration + apparel"))) {
    return "Tournament Fee"
  }
  const method = shippingMethodStr(order).toLowerCase()
  if (method.includes("national team")) return "Tournament Fee"
  const total = Number(order.total) || 0
  if (items.length === 0 && total >= 50 && total <= 60) return "Blue Sub"
  if (items.length === 0 && total >= 200 && total <= 900) return "Tournament Fee"
  if (items.length > 0) return "Apparel"
  return "Other"
}

export function resolveAdminOrderDisplay(input: {
  order: OrderRow
  nationalTeamRegistration?: NhscaDuals2026Registration | null
  dropInRequest?: DropInWithEvent | null
  blueSignup?: BlueSignupRow | null
  blueMembership?: BlueMembershipRow | null
  spartanDonation?: SpartanDonationRow | null
  useNationalTeamDisplay?: boolean
  storeIntegrity?: {
    fulfillmentUnsafe: boolean
    summary: string
    detail: string
  } | null
}): ResolvedAdminOrderDisplay {
  const { order } = input
  const items = order.order_items ?? []
  const orderId = order.id

  if (input.spartanDonation) {
    const d = input.spartanDonation
    const amount = (d.amount_cents ?? Math.round(Number(order.total ?? 0) * 100)) / 100
    return {
      kind: "donation",
      category: "Donation",
      banner: {
        kind: "donation",
        title: "Fundraising donation",
        description: "Spartan / NC United fundraising — not a store shipment.",
        logoSrc: "/images/nc-united-stacked-logo-white.png",
        accentClass: "border-emerald-500/40 bg-emerald-50",
        links: [{ href: "/admin/fundraising", label: "Fundraising admin" }],
      },
      lineItems: [
        {
          id: `donation-${orderId}`,
          name: d.campaign_slug ? `Donation · ${d.campaign_slug}` : "NC United fundraising donation",
          variant: d.athlete_code ? `Athlete code · ${d.athlete_code}` : "General support",
          sku: "donation",
          quantity: 1,
          price: amount,
          image: "/images/nc-united-stacked-logo-white.png",
        },
      ],
      contextRows: [
        ...(d.donor_name ? [{ label: "Donor", value: d.donor_name }] : []),
        ...(d.athlete_code ? [{ label: "Athlete code", value: d.athlete_code }] : []),
      ],
      showShipping: false,
      showTracking: false,
      showRecoverItems: false,
      fulfillmentLabel: "Donation — no shipping",
    }
  }

  const ntReg = input.nationalTeamRegistration
  const useNt =
    Boolean(input.useNationalTeamDisplay && ntReg) ||
    Boolean(ntReg && orderItemsNeedNationalTeamDetail(items))

  if (useNt && ntReg) {
    const isAau = ntReg.event_slug === AAU_SCHOLASTIC_EVENT_SLUG
    const athlete = [ntReg.athlete_first_name, ntReg.athlete_last_name].filter(Boolean).join(" ").trim()
    const resolvedLines = nhscaDualsRegistrationOrderLines(ntReg)
    const ntContext = buildNationalTeamAdminContextRows(ntReg, resolvedLines)
    return {
      kind: isAau ? "national_team_aau" : "national_team_nhsca",
      category: "Tournament Fee",
      banner: {
        kind: isAau ? "national_team_aau" : "national_team_nhsca",
        title: isAau ? "AAU Scholastic Duals registration" : "NHSCA Duals registration",
        description: isAau
          ? "Each line below is what the parent selected at checkout — registration, apparel sizes, hotel/van, and/or flight are separate toggles."
          : "Each line below is what the parent selected — registration package, optional van/hotel, and gear sizes.",
        logoSrc: isAau ? "/images/aau-scholastic-2026/hotel-exterior.png" : "/images/nhsca-national-duals-logo.png",
        accentClass: isAau ? "border-orange-500/40 bg-orange-50" : "border-[#CBAF5D]/40 bg-[#002147]/5",
        links: [{ href: "/admin/blue/national-team-payments", label: "National team payments" }],
      },
      lineItems: mapNationalTeamLineItems(orderId, ntReg, isAau),
      contextRows: [
        ...(athlete ? [{ label: "Athlete", value: athlete }] : []),
        ...(ntReg.primary_weight ? [{ label: "Weight", value: ntReg.primary_weight }] : []),
        ...(ntReg.high_school ? [{ label: "High school", value: ntReg.high_school }] : []),
        ...(ntReg.parent_email ? [{ label: "Parent email", value: ntReg.parent_email }] : []),
        ...ntContext,
      ],
      showShipping: false,
      showTracking: false,
      showRecoverItems: false,
      fulfillmentLabel: "National team event — no shipping",
    }
  }

  if (input.dropInRequest) {
    const d = input.dropInRequest
    const ev = d.events
    const practiceTitle = ev?.title || "NC United practice"
    const practiceWhen = [ev?.start_date, ev?.start_time].filter(Boolean).join(" · ")
    const wrestler = (d.wrestler_name || d.participant_name || "").trim()
    const parent = (d.parent_name || "").trim()
    return {
      kind: "calendar_drop_in",
      category: "Drop-In",
      banner: {
        kind: "calendar_drop_in",
        title: "Calendar drop-in",
        description: "Paid practice drop-in — not apparel.",
        logoSrc: "/images/nc-united-stacked-logo-white.png",
        accentClass: "border-sky-500/40 bg-sky-50",
      },
      lineItems: [
        {
          id: `dropin-${orderId}`,
          name: practiceTitle,
          variant: [practiceWhen, ev?.location].filter(Boolean).join(" · ") || "Practice drop-in",
          sku: "drop-in",
          quantity: 1,
          price: Number(order.total ?? 0) || (d.payment_amount_cents ?? 0) / 100,
          image: "/images/nc-united-stacked-logo-white.png",
        },
      ],
      contextRows: [
        ...(wrestler ? [{ label: "Wrestler", value: wrestler }] : []),
        ...(parent ? [{ label: "Parent / guardian", value: parent }] : []),
        ...(d.waiver_signer_name ? [{ label: "Waiver signed by", value: d.waiver_signer_name }] : []),
        ...(d.wrestler_weight || d.weight_class
          ? [{ label: "Weight", value: String(d.wrestler_weight || d.weight_class) }]
          : []),
      ],
      showShipping: false,
      showTracking: false,
      showRecoverItems: false,
      fulfillmentLabel: ev?.location?.trim() || "Practice drop-in — no shipping",
    }
  }

  if (isBlueOrder(order, items) || input.blueSignup || input.blueMembership) {
    const signup = input.blueSignup
    const athlete = signup
      ? [signup.athlete_first_name, signup.athlete_last_name].filter(Boolean).join(" ").trim()
      : ""
    const parent = signup
      ? [signup.parent_first_name, signup.parent_last_name].filter(Boolean).join(" ").trim()
      : ""
    const monthly = Number(order.total ?? order.subtotal ?? 0)
    const billingNote = input.blueMembership?.next_billing_at
      ? `Next bill · ${new Date(input.blueMembership.next_billing_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : "Monthly subscription"
    return {
      kind: "blue_subscription",
      category: "Blue Sub",
      banner: {
        kind: "blue_subscription",
        title: "NC United Blue membership",
        description: "Monthly training subscription — not a store shipment.",
        logoSrc: "/nc-united-blue-logo.png",
        accentClass: "border-[#03154C]/30 bg-[#03154C]/5",
        links: [{ href: "/admin/blue/subscriptions", label: "Blue subscriptions" }],
      },
      lineItems: [
        {
          id: `blue-${orderId}`,
          name: "NC United Blue – Monthly",
          variant: `${billingNote} · ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(monthly)}/mo`,
          sku: "blue-subscription",
          quantity: 1,
          price: monthly,
          image: "/nc-united-blue-logo.png",
        },
      ],
      contextRows: [
        ...(athlete ? [{ label: "Athlete", value: athlete }] : []),
        ...(parent ? [{ label: "Parent", value: parent }] : []),
        ...(signup?.athlete_high_school ? [{ label: "High school", value: signup.athlete_high_school }] : []),
        ...(signup?.athlete_graduation_year
          ? [{ label: "Grad year", value: signup.athlete_graduation_year }]
          : []),
        ...(input.blueMembership?.status
          ? [{ label: "Membership status", value: String(input.blueMembership.status) }]
          : []),
      ],
      showShipping: false,
      showTracking: false,
      showRecoverItems: false,
      fulfillmentLabel: "Blue membership — no shipping",
    }
  }

  if (isPracticeDropIn(order, items)) {
    const lineName = items[0]?.product_name || "Practice Drop-In"
    return {
      kind: "practice_drop_in",
      category: "Drop-In",
      banner: {
        kind: "practice_drop_in",
        title: "Practice drop-in",
        description: "Single-session practice payment.",
        logoSrc: "/images/nc-united-stacked-logo-white.png",
        accentClass: "border-sky-500/40 bg-sky-50",
      },
      lineItems: items.length
        ? items.map((item, index) => ({
            ...mapStoreLineItem(orderId, item, index),
            image: "/images/nc-united-stacked-logo-white.png",
            variant: item.product_name?.includes("Drop-In") ? lineName : mapStoreLineItem(orderId, item, index).variant,
          }))
        : [
            {
              id: `dropin-${orderId}`,
              name: lineName,
              variant: shippingMethodStr(order),
              sku: "drop-in",
              quantity: 1,
              price: Number(order.total ?? 0),
              image: "/images/nc-united-stacked-logo-white.png",
            },
          ],
      contextRows: [],
      showShipping: false,
      showTracking: false,
      showRecoverItems: items.length === 0,
      fulfillmentLabel: shippingMethodStr(order) || "Practice drop-in — no shipping",
    }
  }

  const storeItems = items.map((item, index) => mapStoreLineItem(orderId, item, index))
  const subtotal = Number(order.subtotal ?? 0)
  const qtySum = storeItems.reduce((s, i) => s + i.quantity, 0)
  const expectedFromSubtotal = subtotal > 0 && storeItems[0]?.price ? Math.round(subtotal / storeItems[0].price) : 0
  const needsRecover =
    storeItems.length === 0 ||
    storeItems.some((i) => i.sku === "national-team" || /store purchase/i.test(i.name)) ||
    (expectedFromSubtotal > 0 && qtySum < expectedFromSubtotal)

  return {
    kind: "store_apparel",
    category: "Apparel",
    banner: input.storeIntegrity?.fulfillmentUnsafe
      ? {
          kind: "store_apparel",
          title: "Incomplete order data — do not fulfill from this list",
          description: input.storeIntegrity.detail,
          accentClass: "border-red-500/60 bg-red-50",
        }
      : null,
    lineItems: storeItems,
    contextRows: input.storeIntegrity?.fulfillmentUnsafe
      ? [{ label: "Data integrity", value: input.storeIntegrity.summary }]
      : [],
    showShipping: true,
    showTracking: true,
    showRecoverItems: needsRecover,
    fulfillmentLabel: shippingMethodStr(order) || "Standard Shipping",
    fulfillmentUnsafe: input.storeIntegrity?.fulfillmentUnsafe,
    integritySummary: input.storeIntegrity?.summary ?? null,
    integrityDetail: input.storeIntegrity?.detail ?? null,
  }
}

export function resolveCustomerDisplay(order: OrderRow): { name: string; email: string } {
  const addr = (order.shipping_address as Record<string, unknown>) || {}
  const dbName = String(order.customer_name ?? "").trim()
  const rawEmail = String(order.customer_email ?? order.email ?? "").trim()

  const name = (() => {
    if (dbName && !isPlaceholderOrderCustomer(rawEmail, dbName)) return dbName
    if (addr.firstName && addr.lastName) return `${addr.firstName} ${addr.lastName}`.trim()
    if (order.shipping_first_name && order.shipping_last_name) {
      return `${order.shipping_first_name} ${order.shipping_last_name}`.trim()
    }
    if (rawEmail && !isPlaceholderOrderCustomer(rawEmail, null)) return rawEmail.split("@")[0]
    return "Guest"
  })()

  const email = isPlaceholderOrderCustomer(rawEmail, order.customer_name as string | undefined)
    ? "No email"
    : rawEmail || "No email"

  return { name, email }
}
