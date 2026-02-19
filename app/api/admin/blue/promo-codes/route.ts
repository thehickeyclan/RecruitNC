import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const, user }
}

/** GET: List all promo codes */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("blue_promo_codes")
    .select("id, code, type, value, stripe_coupon_id, max_redemptions, redemptions_count, valid_from, valid_until, notes, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ error: "Table blue_promo_codes does not exist. Run SQL in docs/blue-membership-tables.md" }, { status: 503 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ codes: data ?? [] })
}

/** POST: Create a new scholarship/promo code (and Stripe Coupon) */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: {
    code?: string
    type?: "percent" | "fixed_amount" | "full_waiver"
    value?: number
    max_redemptions?: number
    valid_until?: string
    notes?: string
  } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const code = body.code?.trim().toUpperCase()
  if (!code || code.length < 2) return NextResponse.json({ error: "Code is required (min 2 characters)." }, { status: 400 })

  const type = body.type ?? "percent"
  if (!["percent", "fixed_amount", "full_waiver"].includes(type)) {
    return NextResponse.json({ error: "Type must be percent, fixed_amount, or full_waiver." }, { status: 400 })
  }

  const value = type === "full_waiver" ? 100 : Number(body.value)
  if (!Number.isFinite(value) || value <= 0) return NextResponse.json({ error: "Value must be a positive number." }, { status: 400 })
  if (type === "percent" && value > 100) return NextResponse.json({ error: "Percent cannot exceed 100." }, { status: 400 })

  const admin = createAdminClient()

  const { data: existing } = await admin.from("blue_promo_codes").select("id").ilike("code", code).maybeSingle()
  if (existing) return NextResponse.json({ error: "A code with this name already exists." }, { status: 400 })

  let stripeCouponId: string | null = null
  if (stripeSecret) {
    const stripe = new Stripe(stripeSecret)
    try {
      const couponParams: Stripe.CouponCreateParams = {
        duration: "forever",
        name: `Blue: ${code}`,
      }
      if (type === "percent" || type === "full_waiver") {
        couponParams.percent_off = Math.min(100, value)
      } else {
        couponParams.amount_off = Math.round(value * 100)
        couponParams.currency = "usd"
      }
      const coupon = await stripe.coupons.create(couponParams)
      stripeCouponId = coupon.id
    } catch (e) {
      console.error("[blue/promo-codes] Stripe coupon create:", e)
      return NextResponse.json({ error: "Failed to create Stripe coupon. Check Stripe key and params." }, { status: 500 })
    }
  }

  const validUntil = body.valid_until?.trim() ? new Date(body.valid_until).toISOString() : null
  const { data: row, error } = await admin
    .from("blue_promo_codes")
    .insert({
      code,
      type,
      value,
      stripe_coupon_id: stripeCouponId,
      max_redemptions: body.max_redemptions != null && Number.isInteger(body.max_redemptions) ? body.max_redemptions : null,
      valid_until: validUntil,
      notes: body.notes?.trim() || null,
      created_by: auth.user.id,
    })
    .select("id, code, type, value, stripe_coupon_id, max_redemptions, valid_until, notes, created_at")
    .single()

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ error: "Table blue_promo_codes does not exist." }, { status: 503 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ code: row })
}
