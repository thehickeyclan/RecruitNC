import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { reconcileMisclassifiedOrdersBatch } from "@/lib/orders/reconcile-shared-stripe-order"

export const dynamic = "force-dynamic"

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(key)
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/**
 * POST /api/admin/orders/reclassify-from-stripe
 * Body: { orderId?: string, limit?: number }
 *
 * Re-reads Stripe checkout sessions and fixes ghost/misclassified orders in bulk.
 * Also links orphan national-team registrations (paid but no order_id) by email + amount.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

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
