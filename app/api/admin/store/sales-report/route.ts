import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  buildStoreSalesReport,
  type StoreProductFamily,
  type StoreSalesLineInput,
} from "@/lib/store/sales-report"

export const dynamic = "force-dynamic"

const CHUNK_SIZE = 1000
const MAX_ORDERS = 20_000

function parseYearParam(raw: string | null): number | "ytd" | "all" {
  if (!raw || raw === "all") return "all"
  if (raw === "ytd") return "ytd"
  const n = Number(raw)
  if (Number.isFinite(n) && n >= 2020 && n <= 2100) return n
  return "ytd"
}

function parseFamilyParam(raw: string | null): StoreProductFamily {
  const allowed: StoreProductFamily[] = [
    "all",
    "singlet",
    "tee",
    "shorts",
    "sweatshirt",
    "headwear",
    "accessories",
    "other",
  ]
  if (raw && allowed.includes(raw as StoreProductFamily)) return raw as StoreProductFamily
  return "all"
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const year = parseYearParam(searchParams.get("year"))
  const family = parseFamilyParam(searchParams.get("family"))
  const size = searchParams.get("size")

  const admin = createAdminClient()
  const orders: Array<{
    id: string
    status: string | null
    created_at: string
    channel: string | null
    shipping_method: unknown
  }> = []

  for (let offset = 0; offset < MAX_ORDERS; offset += CHUNK_SIZE) {
    const { data, error } = await admin
      .from("orders")
      .select("id, status, created_at, channel, shipping_method")
      .order("created_at", { ascending: false })
      .range(offset, offset + CHUNK_SIZE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) break
    orders.push(...data)
    if (data.length < CHUNK_SIZE) break
  }

  const orderById = new Map(orders.map((o) => [o.id, o]))
  const orderIds = orders.map((o) => o.id)

  const itemRows: StoreSalesLineInput[] = []
  for (let i = 0; i < orderIds.length; i += CHUNK_SIZE) {
    const chunk = orderIds.slice(i, i + CHUNK_SIZE)
    const { data, error } = await admin
      .from("order_items")
      .select(
        `
        order_id,
        product_id,
        product_name,
        quantity,
        price,
        subtotal,
        price_at_purchase,
        variant,
        color,
        size,
        products (
          id,
          name,
          category,
          slug,
          image_url
        )
      `,
      )
      .in("order_id", chunk)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    for (const row of data ?? []) {
      const order = orderById.get(row.order_id)
      if (!order) continue
      const product = row.products as {
        id?: string
        name?: string | null
        category?: string | null
        slug?: string | null
        image_url?: string | null
      } | null
      const qty = Math.max(0, Number(row.quantity) || 0)
      const unit =
        Number(row.price_at_purchase ?? row.price ?? 0) ||
        (qty > 0 ? Number(row.subtotal ?? 0) / qty : 0)
      const lineRevenue =
        Number(row.subtotal ?? 0) > 0 ? Number(row.subtotal) : unit * qty

      itemRows.push({
        orderId: row.order_id,
        orderDate: order.created_at,
        orderStatus: order.status,
        shippingMethod: order.shipping_method,
        channel: order.channel,
        productId: row.product_id ?? product?.id ?? null,
        productName: row.product_name ?? product?.name ?? "Unknown product",
        productCategory: product?.category ?? null,
        productSlug: product?.slug ?? null,
        productImageUrl: product?.image_url ?? null,
        variant: row.variant,
        color: row.color,
        size: row.size,
        quantity: qty,
        lineRevenue,
      })
    }
  }

  const report = buildStoreSalesReport(itemRows, { year, family, size })
  return NextResponse.json(report)
}
