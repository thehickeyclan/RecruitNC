import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

/** One-time tax-deductible donation; email captured for Spartan code fulfillment per partner process. */
export async function POST(request: NextRequest) {
  if (!stripeSecret?.trim()) {
    return NextResponse.json(
      { error: "Payment is not configured. Contact contact@ncunitedwrestling.com." },
      { status: 503 },
    )
  }

  let body: {
    email?: string
    donorName?: string
    amountCents?: number
    tierPreference?: string
    /** NCU-LASTNAME-YY — attributes dollars to that athlete in Stripe exports */
    athleteCode?: string
  } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim() : ""
  const donorName = typeof body.donorName === "string" ? body.donorName.trim().slice(0, 120) : ""
  const tierPreference = typeof body.tierPreference === "string" ? body.tierPreference.trim().slice(0, 32) : ""
  const athleteCode =
    typeof body.athleteCode === "string" ? body.athleteCode.trim().slice(0, 64) : ""
  /** Race tier chosen → donor expects a Spartan entry code path; otherwise fundraising-only (e.g. kids raising $ without racing). */
  const raceEntryRequested = Boolean(tierPreference && tierPreference.length > 0)
  const amountCents = Number(body.amountCents)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 })
  }
  if (!donorName || donorName.length < 2) {
    return NextResponse.json({ error: "Your full name is required." }, { status: 400 })
  }
  if (!Number.isFinite(amountCents) || amountCents < 500 || amountCents > 50_000_000) {
    return NextResponse.json({ error: "Invalid amount (min $5)." }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const stripe = new Stripe(stripeSecret)

  const productName = raceEntryRequested
    ? "NC United — Spartan Race Fayetteville (May 2–3, 2026)"
    : "NC United — Spartan 2026 fundraising gift (no race entry)"

  const productDescription = raceEntryRequested
    ? "Tax-deductible donation to NC United. Spartan Race emails entry codes after NC United shares donor information with their team — timing depends on batching and their process."
    : "Tax-deductible donation to NC United (501(c)(3)). Fundraising / sponsor gift — no Spartan race entry requested. Dollars can still be attributed to a fundraising code in Stripe metadata for student leaderboards."

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amountCents),
            product_data: {
              name: productName,
              description: productDescription,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        spartan_campaign: "fayetteville_2026",
        tier_preference: tierPreference || "unspecified",
        donor_name: donorName,
        race_entry_requested: raceEntryRequested ? "true" : "false",
        fundraising_type: raceEntryRequested ? "race_donation" : "gift_only",
        ...(athleteCode ? { athlete_code: athleteCode, fundraising_code: athleteCode } : {}),
      },
      success_url: `${baseUrl}/spartan/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/spartan?cancelled=1#donate`,
    })

    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout." }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed"
    console.error("[spartan/checkout]", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
