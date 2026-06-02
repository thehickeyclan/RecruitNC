import { isStoreMerchandiseOrder } from "@/lib/store/is-store-merchandise-order"
import { isStoreSingletProduct } from "@/lib/store/product-utils"

export type StoreProductFamily =
  | "all"
  | "singlet"
  | "tee"
  | "shorts"
  | "sweatshirt"
  | "headwear"
  | "accessories"
  | "other"

export type StoreSalesReportFilters = {
  year: number | "ytd" | "all"
  family: StoreProductFamily
  size?: string | null
}

export type StoreSalesLineInput = {
  orderId: string
  orderDate: string
  orderStatus?: string | null
  shippingMethod?: unknown
  channel?: string | null
  productId?: string | null
  productName: string
  productCategory?: string | null
  productSlug?: string | null
  productImageUrl?: string | null
  variant?: unknown
  color?: string | null
  size?: string | null
  quantity: number
  lineRevenue: number
}

export type StoreProductRollup = {
  productId: string | null
  name: string
  family: Exclude<StoreProductFamily, "all">
  category: string | null
  imageUrl: string | null
  units: number
  revenue: number
  orders: number
}

export type StoreSizeRollup = {
  size: string
  units: number
  revenue: number
}

export type StoreProductSizeRollup = {
  productId: string | null
  name: string
  size: string
  color: string
  units: number
  revenue: number
}

export type StoreSalesReport = {
  range: { label: string; start: string | null; end: string | null }
  filters: StoreSalesReportFilters
  summary: {
    revenue: number
    units: number
    orders: number
    lineCount: number
  }
  topByRevenue: StoreProductRollup[]
  topByUnits: StoreProductRollup[]
  bySize: StoreSizeRollup[]
  byProductAndSize: StoreProductSizeRollup[]
}

const EXCLUDED_STATUSES = new Set(["cancelled", "refunded", "pending"])

export function shippingMethodLabel(shippingMethod: unknown): string {
  if (typeof shippingMethod === "string") return shippingMethod
  if (shippingMethod && typeof shippingMethod === "object") {
    const row = shippingMethod as { name?: string; description?: string }
    return row.name ?? row.description ?? ""
  }
  return ""
}

export function parseOrderItemVariant(item: {
  variant?: unknown
  color?: string | null
  size?: string | null
}): { color: string; size: string } {
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

export function normalizeStoreSize(raw: string): string {
  const s = raw.trim()
  if (!s || s === "One Size" || s === "N/A" || s === "Standard") return ""
  const lower = s.toLowerCase()
  const map: Record<string, string> = {
    small: "S",
    s: "S",
    medium: "M",
    m: "M",
    large: "L",
    l: "L",
    "x-large": "XL",
    xlarge: "XL",
    xl: "XL",
    "xx-large": "XXL",
    xxl: "XXL",
    "xxx-large": "XXXL",
    xxxl: "XXXL",
  }
  return map[lower] ?? s
}

export function classifyStoreProductFamily(product: {
  name?: string | null
  category?: string | null
  slug?: string | null
}): Exclude<StoreProductFamily, "all"> {
  if (isStoreSingletProduct(product)) return "singlet"
  const name = (product.name ?? "").toLowerCase()
  const cat = (product.category ?? "").toLowerCase()
  if (name.includes("short")) return "shorts"
  if (cat === "t-shirts") return "tee"
  if (name.includes("long sleeve") || name.includes("long-sleeve")) return "tee"
  if (name.includes("tee") || (name.includes("shirt") && !name.includes("sweat"))) return "tee"
  if (cat === "sweatshirts" || name.includes("sweatshirt") || name.includes("hoodie")) return "sweatshirt"
  if (cat === "headwear" || name.includes("hat") || name.includes("beanie") || name.includes("cap")) {
    return "headwear"
  }
  if (cat === "accessories") return "accessories"
  if (cat === "athletic-wear") return name.includes("singlet") ? "singlet" : "other"
  return "other"
}

export function isPaidStoreApparelLine(
  order: {
    orderStatus?: string | null
    shippingMethod?: unknown
    channel?: string | null
  },
  item: { productName: string },
): boolean {
  const status = (order.orderStatus ?? "").toLowerCase()
  if (EXCLUDED_STATUSES.has(status)) return false
  if (!isStoreMerchandiseOrder({ channel: order.channel, shipping_method: order.shippingMethod })) {
    return false
  }
  const method = shippingMethodLabel(order.shippingMethod).toLowerCase()
  const name = item.productName.toLowerCase()
  if (method.includes("national team") || method.includes("blue membership") || method.includes("practice drop-in")) {
    return false
  }
  if (name.includes("blue") && (name.includes("monthly") || name.includes("subscription"))) return false
  if (/drop-?in|dropin/.test(name)) return false
  if (name.includes("registration + apparel") || name.includes("national team registration")) return false
  if (name.includes("fundraising donation") || name === "recovered item") return false
  return true
}

export function resolveReportDateRange(filters: StoreSalesReportFilters, now = new Date()): {
  label: string
  start: Date | null
  end: Date | null
} {
  const year = filters.year
  if (year === "all") {
    return { label: "All time", start: null, end: null }
  }
  const y = year === "ytd" ? now.getFullYear() : year
  const start = new Date(y, 0, 1, 0, 0, 0, 0)
  const end =
    year === "ytd"
      ? now
      : new Date(y, 11, 31, 23, 59, 59, 999)
  const label = year === "ytd" ? `${y} YTD` : String(y)
  return { label, start, end }
}

function lineRevenueFromParts(quantity: number, lineRevenue: number): number {
  if (Number.isFinite(lineRevenue) && lineRevenue > 0) return lineRevenue
  return 0
}

export function buildStoreSalesReport(
  lines: StoreSalesLineInput[],
  filters: StoreSalesReportFilters,
  now = new Date(),
): StoreSalesReport {
  const range = resolveReportDateRange(filters, now)
  const startMs = range.start?.getTime() ?? null
  const endMs = range.end?.getTime() ?? null
  const sizeFilter = filters.size?.trim() ? normalizeStoreSize(filters.size) : null

  const eligible = lines.filter((line) => {
    if (
      !isPaidStoreApparelLine(
        {
          orderStatus: line.orderStatus,
          shippingMethod: line.shippingMethod,
          channel: line.channel,
        },
        { productName: line.productName },
      )
    ) {
      return false
    }
    const d = new Date(line.orderDate).getTime()
    if (startMs != null && d < startMs) return false
    if (endMs != null && d > endMs) return false

    const family = classifyStoreProductFamily({
      name: line.productName,
      category: line.productCategory,
      slug: line.productSlug,
    })
    if (filters.family !== "all" && family !== filters.family) return false

    const { size } = parseOrderItemVariant(line)
    const normalizedSize = normalizeStoreSize(size)
    if (sizeFilter && normalizedSize !== sizeFilter) return false

    return true
  })

  const orderIds = new Set<string>()
  const productMap = new Map<string, StoreProductRollup & { orderIds: Set<string> }>()
  const sizeMap = new Map<string, StoreSizeRollup>()
  const productSizeMap = new Map<string, StoreProductSizeRollup>()

  let revenue = 0
  let units = 0

  for (const line of eligible) {
    const qty = Math.max(0, Number(line.quantity) || 0)
    if (qty <= 0) continue
    const lineRev = lineRevenueFromParts(qty, line.lineRevenue)
    revenue += lineRev
    units += qty
    orderIds.add(line.orderId)

    const family = classifyStoreProductFamily({
      name: line.productName,
      category: line.productCategory,
      slug: line.productSlug,
    })
    const { color, size } = parseOrderItemVariant(line)
    const normalizedSize = normalizeStoreSize(size) || "—"
    const productKey = line.productId ?? line.productName
    const colorLabel = color && color !== "N/A" ? color : ""

    if (!productMap.has(productKey)) {
      productMap.set(productKey, {
        productId: line.productId ?? null,
        name: line.productName,
        family,
        category: line.productCategory ?? null,
        imageUrl: line.productImageUrl ?? null,
        units: 0,
        revenue: 0,
        orders: 0,
        orderIds: new Set<string>(),
      })
    }
    const productRollup = productMap.get(productKey)!
    productRollup.units += qty
    productRollup.revenue += lineRev
    productRollup.orderIds.add(line.orderId)

    const sizeKey = normalizedSize
    const sizeRollup = sizeMap.get(sizeKey) ?? { size: sizeKey, units: 0, revenue: 0 }
    sizeRollup.units += qty
    sizeRollup.revenue += lineRev
    sizeMap.set(sizeKey, sizeRollup)

    const psKey = `${productKey}::${normalizedSize}::${colorLabel}`
    const psRollup =
      productSizeMap.get(psKey) ??
      ({
        productId: line.productId ?? null,
        name: line.productName,
        size: normalizedSize,
        color: colorLabel,
        units: 0,
        revenue: 0,
      } satisfies StoreProductSizeRollup)
    psRollup.units += qty
    psRollup.revenue += lineRev
    productSizeMap.set(psKey, psRollup)
  }

  const topByRevenue = [...productMap.values()]
    .map(({ orderIds: ids, ...rest }) => ({ ...rest, orders: ids.size }))
    .sort((a, b) => b.revenue - a.revenue || b.units - a.units)
    .slice(0, 10)

  const topByUnits = [...productMap.values()]
    .map(({ orderIds: ids, ...rest }) => ({ ...rest, orders: ids.size }))
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 10)

  const bySize = [...sizeMap.values()]
    .filter((row) => row.size !== "—")
    .sort((a, b) => b.units - a.units || a.size.localeCompare(b.size))

  const byProductAndSize = [...productSizeMap.values()]
    .sort((a, b) => b.revenue - a.revenue || b.units - a.units || a.name.localeCompare(b.name))
    .slice(0, 100)

  return {
    range: {
      label: range.label,
      start: range.start?.toISOString() ?? null,
      end: range.end?.toISOString() ?? null,
    },
    filters,
    summary: {
      revenue,
      units,
      orders: orderIds.size,
      lineCount: eligible.length,
    },
    topByRevenue,
    topByUnits,
    bySize,
    byProductAndSize,
  }
}

export function storeSalesReportToCsv(report: StoreSalesReport): string {
  const headers = ["Product", "Family", "Size", "Color", "Units", "Revenue"]
  const rows = report.byProductAndSize.map((row) => [
    row.name,
    classifyStoreProductFamily({ name: row.name }),
    row.size,
    row.color,
    String(row.units),
    row.revenue.toFixed(2),
  ])
  return [headers, ...rows]
    .map((cols) =>
      cols
        .map((c) => {
          const s = String(c ?? "")
          return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(","),
    )
    .join("\n")
}
