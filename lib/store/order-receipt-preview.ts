import { formatOrderItemVariantForEmail, formatStoreShippingAddressPlain } from "@/lib/email"

export type OrderReceiptLineItem = {
  name: string
  variant: string
  quantity: number
  price: number
  lineLabel: string
}

export type OrderReceiptPreview = {
  orderNumber: string
  customerName: string
  customerEmail: string
  items: OrderReceiptLineItem[]
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  shippingAddressPlain: string
  sentAt: string | null
  sentToEmail: string | null
}

type OrderRow = {
  order_number?: string | null
  customer_email?: string | null
  customer_name?: string | null
  email?: string | null
  subtotal?: number | null
  shipping_cost?: number | null
  tax?: number | null
  discount?: number | null
  total?: number | null
  shipping_address?: Record<string, unknown> | null
  status?: string | null
}

type ItemRow = {
  product_name?: string | null
  variant?: unknown
  color?: string | null
  size?: string | null
  quantity?: number | null
  price?: number | null
  subtotal?: number | null
}

function variantForReceiptItem(row: ItemRow): string {
  const fromVariant = formatOrderItemVariantForEmail(row.variant)
  if (fromVariant) return fromVariant
  const c = (row.color ?? "").trim()
  const s = (row.size ?? "").trim()
  if (c || s) return formatOrderItemVariantForEmail({ color: c, size: s })
  return ""
}

export function mapOrderItemsToReceiptLines(itemRows: ItemRow[]): OrderReceiptLineItem[] {
  return itemRows.map((r) => {
    const name = String(r.product_name || "Item")
    const variant = variantForReceiptItem(r)
    const quantity = Number(r.quantity) || 1
    const price = Number(r.price) || 0
    const lineLabel = variant ? `${name} (${variant})` : name
    return { name, variant, quantity, price, lineLabel }
  })
}

export function buildOrderReceiptPreview(
  order: OrderRow,
  itemRows: ItemRow[],
  receiptLog?: { sent_at?: string | null; recipient_email?: string | null } | null,
): OrderReceiptPreview {
  const items = mapOrderItemsToReceiptLines(itemRows)
  const sumLineSubtotals = itemRows.reduce(
    (s, r) => s + (Number(r.subtotal) || Number(r.price) * Math.max(1, Number(r.quantity) || 1) || 0),
    0,
  )
  const metaSub = Number(order.subtotal) || 0
  const subtotal =
    metaSub > 0
      ? metaSub
      : sumLineSubtotals > 0
        ? sumLineSubtotals
        : Math.max(
            0,
            Number(order.total) - Number(order.shipping_cost) - Number(order.tax) + Number(order.discount),
          )

  const customerEmail = (order.customer_email ?? order.email ?? "").trim()

  return {
    orderNumber: order.order_number ?? "",
    customerName: (order.customer_name ?? "").trim() || "Customer",
    customerEmail,
    items,
    subtotal,
    shipping: Number(order.shipping_cost) || 0,
    tax: Number(order.tax) || 0,
    discount: Number(order.discount) || 0,
    total: Number(order.total) || 0,
    shippingAddressPlain: formatStoreShippingAddressPlain(order.shipping_address ?? {}),
    sentAt: receiptLog?.sent_at ?? null,
    sentToEmail: receiptLog?.recipient_email ?? null,
  }
}
