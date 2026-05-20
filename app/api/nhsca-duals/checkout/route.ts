import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NHSCA_2026_PRODUCTS, getNhscaProduct, calculateNhscaTotal } from "@/lib/nhsca-2026-products"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "You must be logged in to checkout." }, { status: 401 })
    }

    // Validate items
    const items = body.items as Array<{ productId: string; quantity: number; size?: string }> | undefined
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items selected." }, { status: 400 })
    }

    // Validate all products exist and calculate total server-side
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    let totalCents = 0

    for (const item of items) {
      const product = getNhscaProduct(item.productId)
      if (!product) {
        return NextResponse.json({ error: `Invalid product: ${item.productId}` }, { status: 400 })
      }
      if (product.priceInCents === 0) {
        // Skip TBD items (like transport)
        continue
      }
      const qty = Math.max(1, Math.min(10, item.quantity || 1))
      totalCents += product.priceInCents * qty

      lineItems.push({
        price_data: {
          currency: "usd",
          unit_amount: product.priceInCents,
          product_data: {
            name: product.name,
            description: item.size ? `${product.description} - Size: ${item.size}` : product.description,
          },
        },
        quantity: qty,
      })
    }

    if (lineItems.length === 0 || totalCents < 50) {
      return NextResponse.json({ error: "Minimum charge is $0.50." }, { status: 400 })
    }

    // Get user profile for email
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from("user_profiles")
      .select("email, first_name, last_name")
      .eq("user_id", user.id)
      .single()

    const customerEmail = profile?.email || user.email || ""
    const customerName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : ""

    // Athlete name from body (wrestler this payment is for)
    const athleteName = typeof body.athleteName === "string" ? body.athleteName.trim() : ""
    const team = typeof body.team === "string" ? body.team.trim() : "national"

    if (!stripeSecret) {
      return NextResponse.json({ error: "Payment is not configured." }, { status: 503 })
    }

    // Create NHSCA payment record
    const { data: paymentRecord, error: paymentError } = await admin
      .from("nhsca_duals_payments")
      .insert({
        user_id: user.id,
        athlete_name: athleteName || customerName,
        team,
        items: items,
        amount_cents: totalCents,
        status: "pending",
      })
      .select("id")
      .single()

    if (paymentError) {
      console.error("[nhsca-checkout] insert payment record:", paymentError)
      // Continue without record - webhook will handle
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const stripe = new Stripe(stripeSecret)
    
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: customerEmail,
      success_url: `${baseUrl}/national-team/hub?tab=payment&success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/national-team/hub?tab=payment&cancelled=1`,
      metadata: {
        business: "nc_united",
        channel: "recruitnc",
        category: "nhsca_duals_2026",
        source: "nhsca_hub_payment",
        payment_record_id: paymentRecord?.id || "",
        user_id: user.id,
        athlete_name: athleteName,
        team,
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 })
    }

    // Update payment record with session ID
    if (paymentRecord?.id) {
      await admin
        .from("nhsca_duals_payments")
        .update({ stripe_session_id: session.id })
        .eq("id", paymentRecord.id)
    }

    return NextResponse.json({ success: true, checkoutUrl: session.url })
  } catch (e) {
    console.error("[nhsca-checkout]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed." }, { status: 500 })
  }
}
