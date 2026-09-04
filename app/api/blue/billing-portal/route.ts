import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

/** POST: Create a Stripe Customer Portal session so the parent can manage billing. Body: { customerId } */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  let {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user) {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (token) {
      const { data } = await supabase.auth.getUser(token)
      user = data.user
    }
  }

  if ((authError && !user) || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let body: { customerId?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const customerId = body.customerId?.trim()
  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 })
  }

  // Billing access is only for the payer (payer_user_id). Linking an athlete via parent_athlete_links does NOT grant access to manage their Blue subscription.
  // Two athletes can share one Stripe customer (same parent checkout) → multiple rows match; do not use maybeSingle().
  const admin = createAdminClient()
  const { data: membershipRows, error: membershipError } = await admin
    .from("blue_memberships")
    .select("id")
    .eq("payer_user_id", user.id)
    .eq("stripe_customer_id", customerId)
    .limit(1)

  if (membershipError) {
    console.error("[blue/billing-portal] membership lookup:", membershipError.message)
    return NextResponse.json({ error: "Could not verify billing access" }, { status: 500 })
  }

  if (!membershipRows?.length) {
    return NextResponse.json({ error: "Not authorized for this customer" }, { status: 403 })
  }

  if (!stripeSecret) {
    return NextResponse.json({ error: "Billing portal not configured" }, { status: 503 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const returnUrl = `${baseUrl}/profile`

  const stripe = new Stripe(stripeSecret)
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return NextResponse.json({ url: session.url })
}
