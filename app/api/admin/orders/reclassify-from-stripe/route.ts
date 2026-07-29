import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { reconcileMisclassifiedOrdersBatch } from "@/lib/orders/reconcile-shared-stripe-order"
import { getStripe, readStripeSecretKey, stripeKeyMissingPayload } from "@/lib/stripe"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/orders/reclassify-from-stripe
 * Body: { orderId?: string, limit?: number }
 */
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  if (!readStripeSecretKey()) {
    return NextResponse.json(stripeKeyMissingPayload(), { status: 503 })
  }

  let orderId: string | undefined
  let limit = 500
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body.orderId === "string" && body.orderId.trim()) orderId = body.orderId.trim()
    if (typeof body.limit === "number" && body.limit > 0 && body.limit <= 2000) limit = body.limit
  } catch {
    // defaults
  }

  try {
    const admin = createAdminClient()
    const result = await reconcileMisclassifiedOrdersBatch(admin, getStripe, { orderId, limit })
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error("[admin/orders/reclassify-from-stripe]", e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Reclassify failed" },
      { status: 500 },
    )
  }
}
