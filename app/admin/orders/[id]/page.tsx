import { notFound } from "next/navigation"
import { getOrderDetails } from "@/app/actions/orders"
import { AdminOrderDetailClient } from "@/components/admin/admin-order-detail-client"
import { resolveCustomerDisplay } from "@/lib/admin/resolve-order-display"
import type { ResolvedAdminOrderDisplay } from "@/lib/admin/resolve-order-display"
import type { OrderReceiptPreview } from "@/lib/store/order-receipt-preview"
import {
  nationalTeamOrderTotalMismatch,
  resolveNationalTeamOrderTotalCents,
} from "@/lib/nhsca-hub-checkout-pricing"
import type { NhscaDuals2026Registration } from "@/lib/nhsca-duals-2026-registrations"
import { isGuildOrderRow } from "@/lib/stripe-guild-detection"

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
  const display = (order.admin_display ?? null) as ResolvedAdminOrderDisplay | null
  const addr = order.shipping_address || {}
  const customer = resolveCustomerDisplay(order)

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
      [addr.firstName || order.shipping_first_name, addr.lastName || order.shipping_last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || customer.name || "Customer",
    line1: String(line1).trim(),
    line2: line2 ? String(line2).trim() : null,
    city: String(city).trim(),
    state: String(state).trim(),
    zip: String(zip).trim(),
    country: String(country).trim(),
    phone,
  }

  const trackingInfo = order.tracking_info
  let trackingNumber: string | null = null
  let carrier: string | null = null
  if (trackingInfo && typeof trackingInfo === "object") {
    trackingNumber =
      (trackingInfo as { tracking_number?: string; trackingNumber?: string }).tracking_number ??
      (trackingInfo as { trackingNumber?: string }).trackingNumber ??
      null
    carrier = (trackingInfo as { carrier?: string }).carrier ?? null
  }
  if (!trackingNumber && order.tracking_number) {
    trackingNumber = order.tracking_number as string
  }
  if (!carrier && order.carrier) {
    carrier = order.carrier as string
  }

  const showFulfillmentTimeline = display?.showShipping ?? true
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
    ...(showFulfillmentTimeline
      ? [
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
      : []),
  ]

  const receiptPreview = (order.receipt_preview ?? null) as OrderReceiptPreview | null
  const ntReg = (order.national_team_registration ?? null) as NhscaDuals2026Registration | null
  const dbTotal = Number(order.total ?? 0)
  const dbSubtotal = Number(order.subtotal ?? 0)
  const resolvedTotalCents =
    ntReg != null
      ? resolveNationalTeamOrderTotalCents({
          checkout_lines: ntReg.checkout_lines,
          reg_fee_cents: ntReg.reg_fee_cents,
          apparel_fee_cents: ntReg.apparel_fee_cents,
        })
      : 0
  const resolvedTotal = resolvedTotalCents / 100
  const totalMismatch =
    ntReg != null &&
    nationalTeamOrderTotalMismatch(dbTotal, {
      checkout_lines: ntReg.checkout_lines,
      reg_fee_cents: ntReg.reg_fee_cents,
      apparel_fee_cents: ntReg.apparel_fee_cents,
    })
  const displayTotal = totalMismatch && resolvedTotal > 0 ? resolvedTotal : dbTotal
  const displaySubtotal =
    totalMismatch && receiptPreview ? receiptPreview.subtotal : dbSubtotal > 0 ? dbSubtotal : displayTotal

  const orderData = {
    id: order.id,
    orderNumber: order.order_number || `NC-${String(order.id).slice(0, 8)}`,
    customerName: customer.name,
    customerEmail: customer.email,
    date: order.created_at ? new Date(order.created_at) : new Date(),
    status: (order.status || "pending").toLowerCase(),
    items: display?.lineItems.length ?? 0,
    total: displayTotal,
    subtotal: displaySubtotal,
    shipping: Number(order.shipping_cost ?? 0),
    tax: Number(order.tax ?? 0),
    discount: Number(order.discount ?? 0),
    promoCode: order.promo_code ?? null,
    shippingMethod: display?.fulfillmentLabel ?? "Standard Shipping",
    shippingAddress,
    trackingNumber,
    carrier,
    orderItems: display?.lineItems ?? [],
    timeline,
    phone,
    createdAt: order.created_at,
    updatedAt: order.updated_at ?? order.created_at,
    shippedAt: order.shipped_at ?? null,
    deliveredAt: order.delivered_at ?? null,
    categoryLabel: display?.category ?? (isGuildOrderRow(order) ? "Guild" : "Other"),
    typeBanner: display?.banner ?? null,
    contextRows: display?.contextRows ?? [],
    showShipping: display?.showShipping ?? true,
    showTracking: display?.showTracking ?? true,
    integritySummary: display?.integritySummary ?? null,
    integrityDetail: display?.integrityDetail ?? null,
    fulfillmentUnsafe: display?.fulfillmentUnsafe ?? false,
    showRecoverItems: display?.showRecoverItems ?? false,
    receiptPreview: receiptPreview,
    orderTotalMismatch: totalMismatch
      ? `Order total in database ($${dbTotal.toFixed(2)}) does not match checkout lines ($${resolvedTotal.toFixed(2)}). Display uses checkout lines — verify charge in Stripe.`
      : null,
  }

  return <AdminOrderDetailClient order={orderData} />
}
