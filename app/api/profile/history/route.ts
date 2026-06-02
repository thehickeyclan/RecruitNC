import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isStoreMerchandiseOrder } from "@/lib/store/is-store-merchandise-order"
import { NextResponse } from "next/server"
import Stripe from "stripe"

export const dynamic = "force-dynamic"

/**
 * Data reads use the service-role client only after we verify the session user.
 * RLS on `orders` / `order_items` allows SELECT when `customer_id = auth.uid()`, but
 * many Stripe-created rows only have `customer_email` — so the user profile would
 * see empty store history with the anon/authenticated client. Admin + strict
 * filters (`parent_user_id`, `customer_email`) matches what the user may see of themselves.
 */

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const emailLower = (user.email ?? "").trim().toLowerCase()
    if (!emailLower) {
      return NextResponse.json({ error: "No email on account" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: dropInsRaw, error: dropErr } = await admin
      .from("drop_in_requests")
      .select(
        `
        id,
        payment_amount_cents,
        payment_status,
        created_at,
        wrestler_name,
        events ( title, start_date, start_time )
      `,
      )
      .eq("parent_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)

    if (dropErr) {
      console.error("[profile/history] drop_in_requests:", dropErr.message)
    }

    const { data: ordersRaw, error: ordersErr } = await admin
      .from("orders")
      .select(
        `
        id,
        created_at,
        total,
        status,
        channel,
        shipping_method,
        order_items ( product_name, quantity, price )
      `,
      )
      .ilike("customer_email", emailLower)
      .order("created_at", { ascending: false })
      .limit(80)

    if (ordersErr) {
      console.error("[profile/history] orders:", ordersErr.message)
    }

    const storeOrders = (ordersRaw ?? []).filter(isStoreMerchandiseOrder).slice(0, 20)

    let spartanDonations: Array<{
      id: string
      amount: number
      created: number
      athlete_code: string
      campaign: string
      status: string
    }> = []

    const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
    if (stripeSecret) {
      try {
        const stripe = new Stripe(stripeSecret)
        const charges = await stripe.charges.list({ limit: 100 })
        const matches = charges.data.filter((c) => {
          if (c.metadata?.channel !== "spartan") return false
          const r = (c.receipt_email ?? "").trim().toLowerCase()
          const b = (c.billing_details?.email ?? "").trim().toLowerCase()
          return r === emailLower || b === emailLower
        })
        matches.sort((a, b) => b.created - a.created)
        spartanDonations = matches.slice(0, 20).map((c) => ({
          id: c.id,
          amount: c.amount,
          created: c.created,
          athlete_code: c.metadata?.athlete_code ?? c.metadata?.fundraising_code ?? "",
          campaign: c.metadata?.spartan_campaign ?? "",
          status: c.status ?? "",
        }))
      } catch (e) {
        console.error("[profile/history] Stripe charges:", e)
      }
    }

    return NextResponse.json({
      dropIns: dropInsRaw ?? [],
      storeOrders,
      spartanDonations,
    })
  } catch (e) {
    console.error("[profile/history]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
