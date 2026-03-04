import { createAdminClient } from "@/lib/supabase/admin"
import { AdminOrdersClient } from "@/components/admin/admin-orders-client"
import type { Order } from "@/lib/admin-data"

export const dynamic = "force-dynamic"

/** Supabase returns max 1000 rows per request; fetch in chunks so we get all orders. */
const CHUNK_SIZE = 1000
const MAX_ORDERS = 15_000

export default async function OrdersPage() {
  try {
    const supabase = createAdminClient()
    const allOrders: any[] = []
    let offset = 0
    let hasMore = true

    while (hasMore && allOrders.length < MAX_ORDERS) {
      const { data: chunk, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items (id, product_name)
        `
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1)

      if (ordersError) {
        console.error("[admin/orders] Error fetching orders:", ordersError)
        break
      }
      const rows = chunk ?? []
      allOrders.push(...rows)
      hasMore = rows.length === CHUNK_SIZE
      offset += CHUNK_SIZE
    }

    const formattedOrders: Order[] = allOrders.map((order: any) => {
      const addr = order.shipping_address || {}
      const firstName = (addr.firstName ?? addr.first_name ?? "").trim()
      const lastName = (addr.lastName ?? addr.last_name ?? "").trim()
      const hasValidName =
        firstName &&
        lastName &&
        firstName !== "Unknown" &&
        firstName !== "Customer" &&
        lastName !== "Customer"

      const customerName = hasValidName
        ? `${firstName} ${lastName}`
        : firstName && firstName !== "Unknown" && firstName !== "Customer"
          ? firstName
          : order.customer_email &&
              order.customer_email !== "unknown@example.com" &&
              order.customer_email !== "No email"
            ? order.customer_email.split("@")[0] || "Guest"
            : order.customer_name && order.customer_name !== "Unknown"
              ? order.customer_name
              : "Guest"

      const itemsCount = order.order_items?.length || 0
      const orderItems = order.order_items || []
      const hasDropInProduct = orderItems.some((item: any) => {
        const name = (item.product_name || "").toLowerCase()
        return (
          name.includes("practice") ||
          name.includes("drop-in") ||
          name.includes("dropin")
        )
      })
      const shippingMethodStr =
        typeof order.shipping_method === "string"
          ? order.shipping_method
          : (order.shipping_method?.name ?? order.shipping_method?.description ?? "")
      const isLikelyDropIn =
        itemsCount === 0 &&
        Number(order.total) >= 20 &&
        Number(order.total) <= 30 &&
        (shippingMethodStr.toLowerCase().includes("pickup") ||
          shippingMethodStr.toLowerCase().includes("practice") ||
          (addr.address1 && String(addr.address1).toLowerCase().includes("practice")))

      const isPracticeDropin = hasDropInProduct || isLikelyDropIn
      const orderType = isPracticeDropin ? "practice-dropin" : "product"

      const line1 =
        addr.address1 ?? addr.line1 ?? addr.shipping_address_line1 ?? ""
      const line2 =
        addr.address2 ?? addr.line2 ?? addr.shipping_address_line2 ?? null
      const zip =
        addr.zipCode ?? addr.zip ?? addr.postal_code ?? addr.shipping_postal_code ?? ""

      return {
        id: order.id,
        orderNumber: order.order_number || `NC-${String(order.id).slice(0, 8)}`,
        customerName,
        customerEmail:
          order.customer_email &&
          order.customer_email !== "unknown@example.com"
            ? order.customer_email
            : "No email",
        date: order.created_at ? new Date(order.created_at) : new Date(),
        status: (order.status || "pending") as Order["status"],
        items: itemsCount,
        total: Number(order.total ?? 0),
        orderType: orderType as "product" | "practice-dropin",
        shippingAddress: {
          line1: String(line1).trim() || "",
          line2: line2 ? String(line2).trim() : null,
          city: String(addr.city ?? addr.shipping_city ?? "").trim(),
          state: String(addr.state ?? addr.shipping_state ?? "").trim(),
          zip: String(zip).trim(),
          country: String(addr.country ?? addr.shipping_country ?? "US").trim(),
          phone: addr.phone ?? addr.shipping_phone ?? null,
        },
        shippingMethod: shippingMethodStr || "Standard Shipping",
        phone: addr.phone ?? addr.shipping_phone ?? null,
      }
    })

    return <AdminOrdersClient initialOrders={formattedOrders} />
  } catch (err: any) {
    console.error("[admin/orders] Page error:", err)
    return <AdminOrdersClient initialOrders={[]} />
  }
}
