import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveAthleteNotificationEmails } from "@/lib/toc/invitation-service"
import { tocRegistrationCheckoutSchema } from "@/lib/toc/registration-checkout"
import {
  formatTocRegistrationFee,
  isRegistrationPaymentPastDue,
  registrationPaymentDueDisplay,
  TOC_REGISTRATION_FEE_COVERS,
  TOC_REGISTRATION_FEE_USD,
} from "@/lib/toc/registration-policy"
import { buildTocRegistrationCheckoutMetadata, TOC_STRIPE_REGISTRATION_TYPE } from "@/lib/toc/stripe-metadata"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

export async function POST(request: NextRequest) {
  if (!stripeSecret?.trim()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Contact NC United if this persists." },
      { status: 503 },
    )
  }

  try {
    const body = await request.json()
    const parsed = tocRegistrationCheckoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 })
    }

    const { athleteId } = parsed.data
    const admin = createAdminClient()

    const { data: invitation, error: invError } = await admin
      .from("toc_invitations")
      .select("id, athlete_id, weight_class, status, payment_status, stripe_session_id")
      .eq("athlete_id", athleteId)
      .maybeSingle()

    if (invError?.code === "42P01") {
      return NextResponse.json({ error: "Registration payment is not available yet." }, { status: 503 })
    }
    if (invError?.code === "42703") {
      return NextResponse.json(
        {
          error:
            "Registration payment columns missing. Run docs/sql/toc-phase-3-registration-payment.sql.txt in Supabase.",
        },
        { status: 503 },
      )
    }
    if (invError) {
      console.error("[toc/register/checkout]", invError)
      return NextResponse.json({ error: "Failed to load invitation" }, { status: 500 })
    }
    if (!invitation) {
      return NextResponse.json(
        { error: "No invitation found. Confirm your spot first, then return here to pay." },
        { status: 400 },
      )
    }
    if (invitation.status !== "confirmed") {
      return NextResponse.json(
        { error: "Confirm your spot before paying registration. Use the link in your invite email." },
        { status: 400 },
      )
    }
    if (invitation.payment_status === "paid") {
      return NextResponse.json({ error: "Registration is already paid.", alreadyPaid: true }, { status: 400 })
    }

    if (isRegistrationPaymentPastDue()) {
      return NextResponse.json(
        {
          error: `Registration payment was due by ${registrationPaymentDueDisplay()}. Contact ${process.env.TOC_CONTACT_EMAIL ?? "info@ncwrestlingunited.com"}.`,
        },
        { status: 400 },
      )
    }

    const { data: athlete, error: athleteError } = await admin.from("athletes").select("name").eq("id", athleteId).maybeSingle()
    if (athleteError || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const athleteName = String(athlete.name ?? "Athlete")
    const emails = await resolveAthleteNotificationEmails(admin, athleteId)
    const customerEmail = emails[0] ?? undefined

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const stripe = new Stripe(stripeSecret)
    const amountCents = TOC_REGISTRATION_FEE_USD * 100

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `Tournament of Champions Registration (${TOC_STRIPE_REGISTRATION_TYPE})`,
              description: `${formatTocRegistrationFee()} registration — tournament entry, ${TOC_REGISTRATION_FEE_COVERS}.`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/tournament-of-champions/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/tournament-of-champions/register/pay?athlete=${encodeURIComponent(athleteId)}&cancelled=1`,
      metadata: buildTocRegistrationCheckoutMetadata({
        invitationId: invitation.id,
        athleteId,
        weightClass: Number(invitation.weight_class),
        athleteName,
      }),
    })

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 })
    }

    const now = new Date().toISOString()
    const { error: patchError } = await admin
      .from("toc_invitations")
      .update({
        payment_status: "pending",
        stripe_session_id: session.id,
        updated_at: now,
      })
      .eq("id", invitation.id)

    if (patchError) {
      console.error("[toc/register/checkout] patch invitation:", patchError.message)
    }

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (e) {
    console.error("[toc/register/checkout]", e)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
