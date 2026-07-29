import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { getStripe, readStripeSecretKey, stripeKeyMissingPayload } from "@/lib/stripe"
import { validateUnfulfilledApparelOrdersAgainstStripe } from "@/lib/store/validate-orders-against-stripe"

export const dynamic = "force-dynamic"
export const maxDuration = 120

/**
 * POST: Cross-check unshipped apparel orders against Stripe Payment Intent status.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    if (!readStripeSecretKey()) {
      return NextResponse.json(stripeKeyMissingPayload(), { status: 503 })
    }

    let limit = 100
    try {
      const body = await request.json()
      if (typeof body?.limit === "number" && body.limit > 0 && body.limit <= 300) {
        limit = body.limit
      }
    } catch {
      /* default limit */
    }

    const admin = createAdminClient()
    const stripe = getStripe()
    const result = await validateUnfulfilledApparelOrdersAgainstStripe(admin, stripe, { limit })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Validation failed"
    console.error("[admin/orders/validate-stripe]", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
