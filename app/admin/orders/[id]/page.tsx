import { notFound } from "next/navigation"
import { getOrderDetails } from "@/app/actions/orders"
import { AdminOrderDetailClient } from "@/components/admin/admin-order-detail-client"

export const dynamic = "force-dynamic"

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params

  if (!id) {
    notFound()
  }

  const result = await getOrderDetails(id)

  if (!result.success || !result.order) {
    notFound()
  }

  const order = result.order
  const addr = order.shipping_address || {}

  const ntReg = order.national_team_registration as {
    athlete_first_name?: string
    athlete_last_name?: string
    event_slug?: string
  } | null
  const ntLineItems = (order.national_team_line_items ?? []) as Array<{
    name: string
    amount_cents: number
    quantity?: number
  }>
  const useNationalTeamDisplay = Boolean(order.display_uses_national_team && ntLineItems.length > 0)

  const orderItems = (useNationalTeamDisplay ? ntLineItems : order.order_items || []).map((item: any, index: number) => {
    if (useNationalTeamDisplay) {
      const qty = item.quantity ?? 1
      const unit = (item.amount_cents ?? 0) / 100 / qty
      return {
        id: `nt-${index}`,
        name: item.name,
        variant: "NHSCA hub checkout",
        sku: "national-team",
        quantity: qty,
        price: unit,
        image: "/placeholder.svg",
      }
    }

    const variantObj = item.variant || {}
    const color = variantObj.color || ""
    const size = variantObj.size || "One Size"
    let variant = ""
    if (color && size) variant = `${color} / ${size}`
    else if (color) variant = color
    else if (size && size !== "One Size") variant = size
    else variant = "Standard"

    const imageUrl =
      item.image_url ||
      item.product_image_url ||
      (item.product as any)?.image_url ||
      "/placeholder.svg"

    return {
      id: item.id || `${order.id}-item-${index}`,
      name: item.product_name || (item.product as any)?.name || "Unknown Product",
      variant: variant.trim(),
      sku: item.sku || "N/A",
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
      image: imageUrl,
    }
  })

  const customerName =
    addr.firstName && addr.lastName
      ? `${addr.firstName} ${addr.lastName}`.trim()
      : order.shipping_first_name && order.shipping_last_name
        ? `${order.shipping_first_name} ${order.shipping_last_name}`
        : order.customer_name ||
          (order.customer_email && order.customer_email !== "unknown@example.com"
            ? order.customer_email.split("@")[0]
            : null) ||
          "Guest"

  const line1 =
    order.shipping_address_line1 ??
    addr.address1 ??
    addr.line1 ??
    ""
  const line2 =
    order.shipping_address_line2 ??
    addr.address2 ??
    addr.line2 ??
    null
  const city = order.shipping_city ?? addr.city ?? ""
  const state = order.shipping_state ?? addr.state ?? ""
  const zip =
    order.shipping_postal_code ?? addr.zipCode ?? addr.zip ?? addr.postal_code ?? ""
  const country = order.shipping_country ?? addr.country ?? "US"
  const phone = order.shipping_phone ?? addr.phone ?? null

  const shippingAddress = {
    name:
      [
        addr.firstName || order.shipping_first_name,
        addr.lastName || order.shipping_last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() || customerName || "Customer",
    line1: String(line1).trim(),
    line2: line2 ? String(line2).trim() : null,
    city: String(city).trim(),
    state: String(state).trim(),
    zip: String(zip).trim(),
    country: String(country).trim(),
    phone,
  }

  const shippingMethod = useNationalTeamDisplay
    ? "National team event (no shipping)"
    : typeof order.shipping_method === "string"
      ? order.shipping_method
      : (order.shipping_method as any)?.name ??
        (order.shipping_method as any)?.description ??
        "Standard Shipping"

  const trackingInfo = order.tracking_info
  let trackingNumber: string | null = null
  let carrier: string | null = null
  if (trackingInfo && typeof trackingInfo === "object") {
    trackingNumber =
      (trackingInfo as any).tracking_number ?? (trackingInfo as any).trackingNumber ?? null
    carrier = (trackingInfo as any).carrier ?? null
  }
  if (!trackingNumber && (order as any).tracking_number) {
    trackingNumber = (order as any).tracking_number
  }
  if (!carrier && (order as any).carrier) {
    carrier = (order as any).carrier
  }

  const timeline = [
    {
      event: "Order placed",
      date: order.created_at ? new Date(order.created_at) : new Date(),
      completed: true,
    },
    {
      event: "Payment confirmed",
      date: order.created_at ? new Date(order.created_at) : new Date(),
      completed: order.status !== "pending",
    },
    {
      event: "Processing started",
      date: order.updated_at ? new Date(order.updated_at) : null,
      completed: ["processing", "shipped", "delivered"].includes(order.status),
    },
    {
      event: "Shipped",
      date: order.shipped_at ? new Date(order.shipped_at) : null,
      completed: ["shipped", "delivered"].includes(order.status),
    },
    {
      event: "Delivered",
      date: order.delivered_at ? new Date(order.delivered_at) : null,
      completed: order.status === "delivered",
    },
  ]

  const safeOrderItems = Array.isArray(orderItems) ? orderItems : []

  const orderData = {
    id: order.id,
    orderNumber: order.order_number || `NC-${String(order.id).slice(0, 8)}`,
    customerName,
    customerEmail: order.customer_email || "No email",
    date: order.created_at ? new Date(order.created_at) : new Date(),
    status: (order.status || "pending").toLowerCase(),
    items: safeOrderItems.length,
    total: Number(order.total ?? 0),
    subtotal: Number(order.subtotal ?? 0),
    shipping: Number(order.shipping_cost ?? 0),
    tax: Number(order.tax ?? 0),
    discount: Number(order.discount ?? 0),
    promoCode: order.promo_code ?? null,
    shippingMethod,
    shippingAddress,
    trackingNumber,
    carrier,
    orderItems: safeOrderItems,
    timeline,
    phone,
    createdAt: order.created_at,
    updatedAt: order.updated_at ?? order.created_at,
    shippedAt: order.shipped_at ?? null,
    deliveredAt: order.delivered_at ?? null,
    nationalTeamAthlete: ntReg
      ? `${ntReg.athlete_first_name ?? ""} ${ntReg.athlete_last_name ?? ""}`.trim()
      : null,
    nationalTeamSummary: (order.national_team_summary as string | null) ?? null,
    isNationalTeamOrder: useNationalTeamDisplay,
  }

  return <AdminOrderDetailClient order={orderData} />
}
