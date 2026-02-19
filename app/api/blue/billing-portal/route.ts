import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

/** POST: Create a Stripe Customer Portal session so the parent can manage billing. Body: { customerId } */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
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

  // Ensure this Stripe customer belongs to a Blue membership where current user is payer
  const admin = createAdminClient()
  const { data: membership } = await admin
    .from("blue_memberships")
    .select("id")
    .eq("payer_user_id", user.id)
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  if (!membership) {
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
