import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getSpartanRaceTierOrDefault, isSpartanRaceTierId } from "@/app/spartan/data"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

/** When set, must match directory fundraising code shape (Stripe metadata). */
const ATHLETE_CODE_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

/** Donate-only: gifts at or above this qualify for NC United tee. Race entries always include a tee. */
export const SPARTAN_TEE_THRESHOLD_CENTS = 10_000

const TEE_SIZES = new Set(["XS", "S", "M", "L", "XL", "2XL", "3XL"])

/** One-time tax-deductible donation; email captured for Spartan code fulfillment per partner process. */
export async function POST(request: NextRequest) {
  if (!stripeSecret?.trim()) {
    return NextResponse.json(
      { error: "Payment is not configured. Contact info@ncwrestlingunited.com." },
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
    /** If not in directory: name for staff to credit manually (Stripe metadata) */
    manualAthleteName?: string
    /** Directory list label (e.g. "Matt Hickey · …") — stored for public display, not just NCU-CODE */
    athleteDisplayName?: string
    /** If false, public supporter list shows "Anonymous" */
    donorListPublic?: boolean
    /** Who is running the race if not the donor (race path); stored in Stripe metadata */
    raceParticipantName?: string
    /** Race path: inbox for Spartan/registration codes (often parent); defaults to payer email if omitted */
    raceRegistrationEmail?: string
    /** Receipt / metadata: individual vs organization name */
    payerType?: string
    shirtSize?: string
    shipLine1?: string
    shipLine2?: string
    shipCity?: string
    shipState?: string
    shipPostal?: string
    shipCountry?: string
  } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim() : ""
  const donorName = typeof body.donorName === "string" ? body.donorName.trim().slice(0, 120) : ""
  const rawTier = typeof body.tierPreference === "string" ? body.tierPreference.trim().slice(0, 32) : ""
  if (rawTier && !isSpartanRaceTierId(rawTier)) {
    return NextResponse.json({ error: "Invalid race selection." }, { status: 400 })
  }
  const tierPreference = isSpartanRaceTierId(rawTier) ? rawTier : ""
  let athleteCode =
    typeof body.athleteCode === "string" ? body.athleteCode.trim().slice(0, 64) : ""
  if (athleteCode && !ATHLETE_CODE_RE.test(athleteCode)) {
    return NextResponse.json(
      { error: "Athlete code looks invalid — pick the wrestler from search again (format NCU-LASTNAME-YY)." },
      { status: 400 },
    )
  }
  if (athleteCode) athleteCode = athleteCode.toUpperCase()
  const manualAthleteName =
    typeof body.manualAthleteName === "string" ? body.manualAthleteName.trim().slice(0, 120) : ""
  const athleteDisplayName =
    typeof body.athleteDisplayName === "string" ? body.athleteDisplayName.trim().slice(0, 120) : ""
  const donorListPublic = body.donorListPublic !== false
  let raceParticipantName =
    typeof body.raceParticipantName === "string" ? body.raceParticipantName.trim().slice(0, 120) : ""
  const raceRegistrationEmailRaw =
    typeof body.raceRegistrationEmail === "string" ? body.raceRegistrationEmail.trim().slice(0, 320) : ""
  const payerTypeRaw = typeof body.payerType === "string" ? body.payerType.trim().toLowerCase() : ""
  const payerTypeNormalized = payerTypeRaw === "organization" || payerTypeRaw === "org" ? "organization" : "person"
  /** Super 10K tier → donor expects Spartan entry code path; omit for donate-only. */
  const raceEntryRequested = Boolean(tierPreference && tierPreference.length > 0)
  const amountCents = Number(body.amountCents)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 })
  }
  if (
    raceRegistrationEmailRaw &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raceRegistrationEmailRaw)
  ) {
    return NextResponse.json({ error: "Registration email must be a valid address." }, { status: 400 })
  }
  if (!donorName || donorName.length < 2) {
    return NextResponse.json(
      { error: "Full name or organization name on the receipt is required." },
      { status: 400 },
    )
  }
  if (!Number.isFinite(amountCents) || amountCents < 500 || amountCents > 50_000_000) {
    return NextResponse.json({ error: "Invalid amount (min $5)." }, { status: 400 })
  }

  const hasManualCredit = manualAthleteName.length >= 2
  if (athleteDisplayName.trim() && !athleteCode && !hasManualCredit) {
    return NextResponse.json(
      {
        error:
          "Athlete display name was sent without a directory code — go back and select the wrestler from search so credit saves correctly.",
      },
      { status: 400 },
    )
  }
  if (raceEntryRequested && !athleteCode && !hasManualCredit) {
    return NextResponse.json(
      {
        error:
          "Choose an athlete from the list, or enter their name in the “not in the directory” box so we can credit your gift.",
      },
      { status: 400 },
    )
  }

  /**
   * Race path: always persist who is on the course for Spartan coordination.
   * If the payer didn’t fill “runner,” assume the credited athlete (parent pays / kid runs is the common case).
   */
  if (raceEntryRequested && !raceParticipantName) {
    if (athleteDisplayName.trim()) {
      raceParticipantName = athleteDisplayName.trim().slice(0, 120)
    } else if (hasManualCredit) {
      raceParticipantName = manualAthleteName.trim().slice(0, 120)
    }
  }

  const teeEligible = raceEntryRequested || amountCents >= SPARTAN_TEE_THRESHOLD_CENTS
  const shirtSize = typeof body.shirtSize === "string" ? body.shirtSize.trim().toUpperCase() : ""
  const shipLine1 = typeof body.shipLine1 === "string" ? body.shipLine1.trim().slice(0, 120) : ""
  const shipLine2 = typeof body.shipLine2 === "string" ? body.shipLine2.trim().slice(0, 120) : ""
  const shipCity = typeof body.shipCity === "string" ? body.shipCity.trim().slice(0, 80) : ""
  const shipState = typeof body.shipState === "string" ? body.shipState.trim().slice(0, 32) : ""
  const shipPostal = typeof body.shipPostal === "string" ? body.shipPostal.trim().slice(0, 20) : ""
  const shipCountry =
    typeof body.shipCountry === "string" && body.shipCountry.trim()
      ? body.shipCountry.trim().slice(0, 2).toUpperCase()
      : "US"

  if (teeEligible) {
    if (!shirtSize || !TEE_SIZES.has(shirtSize)) {
      return NextResponse.json(
        {
          error: raceEntryRequested
            ? "Choose a valid shirt size for your NC United tee (included with your race gift)."
            : "Choose a valid shirt size for your free tee ($100+ gifts).",
        },
        { status: 400 },
      )
    }
    if (!shipLine1 || !shipCity || !shipState || !shipPostal) {
      return NextResponse.json(
        {
          error: raceEntryRequested
            ? "Enter a full shipping address for your NC United tee (included with your race gift)."
            : "Enter a full shipping address for your free NC United tee ($100+ gifts).",
        },
        { status: 400 },
      )
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const stripe = new Stripe(stripeSecret)

  const raceTier = raceEntryRequested && tierPreference ? getSpartanRaceTierOrDefault(tierPreference) : null

  const productName = raceEntryRequested && raceTier
    ? `NC United × Spartan Fayetteville — ${raceTier.name} (${raceTier.priceLabel} suggested)`
    : "NC United — Gift to support our athletes (no race entry)"

  let productDescription =
    raceEntryRequested && raceTier
      ? `Tax-deductible gift to NC United (501(c)(3)). Race intent: ${raceTier.name} — ${raceTier.detail}. ${raceTier.dates}. Register and choose Open vs Age Group on Spartan.com. After your gift, NC United coordinates with Spartan—entry details follow their process.`
      : "Tax-deductible gift to NC United (501(c)(3)). This is support only—no Spartan race entry. If you chose a wrestler at checkout, your gift counts toward their fundraising."
  if (raceEntryRequested && raceTier?.id === "super") {
    productDescription += " Team NC’s crew race is the Super 10K (May 3)."
  }
  if (teeEligible) {
    productDescription +=
      " Includes an NC United tee (while supplies last), sent to the shipping address you provide."
  }

  /** Who Spartan / ops treat as “on course” — always set on race path (defaults above + payer as last resort). */
  const runnerForStripeMetadata = raceEntryRequested
    ? (raceParticipantName || donorName).trim().slice(0, 120)
    : ""

  /** Inbox Spartan should use for codes/updates (often parent); falls back to payer email. */
  const spartanNotificationEmail =
    raceEntryRequested && raceRegistrationEmailRaw
      ? raceRegistrationEmailRaw
      : raceEntryRequested
        ? email
        : ""

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
        business: "nc_united",
        channel: "spartan",
        category: "donation",
        athlete_code: athleteCode || "",
        spartan_campaign: "fayetteville_2026",
        tier_preference: tierPreference || "unspecified",
        donor_name: donorName,
        payer_type: payerTypeNormalized,
        donor_list_public: donorListPublic ? "true" : "false",
        race_entry_requested: raceEntryRequested ? "true" : "false",
        fundraising_type: raceEntryRequested ? "race_donation" : "gift_only",
        ...(raceEntryRequested && runnerForStripeMetadata
          ? { race_participant_name: runnerForStripeMetadata }
          : {}),
        ...(raceEntryRequested && spartanNotificationEmail
          ? { spartan_notification_email: spartanNotificationEmail }
          : {}),
        tee_100_eligible: teeEligible ? "yes" : "no",
        ...(teeEligible
          ? {
              tee_sz: shirtSize,
              ship_1: shipLine1,
              ...(shipLine2 ? { ship_2: shipLine2 } : {}),
              ship_city: shipCity,
              ship_st: shipState,
              ship_zip: shipPostal,
              ship_ctry: shipCountry,
            }
          : {}),
        ...(athleteCode
          ? {
              athlete_code: athleteCode,
              fundraising_code: athleteCode,
              fundraising_attribution: "athlete",
              ...(athleteDisplayName ? { athlete_display_name: athleteDisplayName } : {}),
            }
          : hasManualCredit
            ? {
                manual_credit_name: manualAthleteName,
                fundraising_attribution: "manual_name",
              }
            : { fundraising_attribution: "general_nc_united" }),
      },
      success_url: `${baseUrl}/spartan/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/spartan?cancelled=1#spartan-checkout`,
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
