import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { createAdminClient } from "@/lib/supabase/admin"
import { findAndEnrichAthlete, buildEnrichmentPayload } from "@/lib/enrich-athlete-profile"
import {
  buildIndividualLineItems,
  buildTeamPackageLineItems,
  encodeLineItemsMetadata,
  formatShirtSizeForDb,
  lineItemsTotalCents,
  normalizeGearSizeForDb,
  splitFeesFromLineItems,
  type NhscaHubCheckoutMode,
  type NhscaHubIndividualSelections,
  type NhscaHubTeamPackageSelections,
} from "@/lib/nhsca-hub-checkout-pricing"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

function parseName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 0) return { first: "", last: "" }
  if (parts.length === 1) return { first: parts[0], last: "" }
  return { first: parts[0], last: parts.slice(1).join(" ") }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const eventSlug =
    body.eventSlug === "nhsca-duals-2026-select" ? "nhsca-duals-2026-select" : "nhsca-duals-2026"
  const mode = (body.mode === "individual" ? "individual" : "team_package") as NhscaHubCheckoutMode
  const parentName = typeof body.parentName === "string" ? body.parentName.trim() : ""
  const wrestlerName = typeof body.wrestlerName === "string" ? body.wrestlerName.trim() : ""
  const primaryWeight = typeof body.primaryWeight === "string" ? body.primaryWeight.trim() : ""
  const parentEmail = user.email.trim()

  if (!parentName) return NextResponse.json({ error: "Parent name is required." }, { status: 400 })
  if (!wrestlerName) return NextResponse.json({ error: "Athlete name is required." }, { status: 400 })
  if (!primaryWeight) return NextResponse.json({ error: "Weight is required." }, { status: 400 })

  const { first: athleteFirstName, last: athleteLastName } = parseName(wrestlerName)
  if (!athleteFirstName) {
    return NextResponse.json({ error: "Enter athlete first and last name." }, { status: 400 })
  }

  let lineItems = buildTeamPackageLineItems({ vanTravel: false, hotel: false })
  let singletSize: string | null = null
  let shortsSize: string | null = null
  let shirtSize: string | null = null
  let vanTravelRequested = false
  let hotelRequested = false

  if (mode === "team_package") {
    const pkg = body.teamPackage as Partial<NhscaHubTeamPackageSelections> | undefined
    const singlet = typeof body.singletSize === "string" ? body.singletSize.trim() : pkg?.singletSize?.trim() ?? ""
    const shorts = typeof body.shortsSize === "string" ? body.shortsSize.trim() : pkg?.shortsSize?.trim() ?? ""
    const ss = typeof body.shortSleeveSize === "string" ? body.shortSleeveSize.trim() : pkg?.shortSleeveSize?.trim() ?? ""
    const ls = typeof body.longSleeveSize === "string" ? body.longSleeveSize.trim() : pkg?.longSleeveSize?.trim() ?? ""
    vanTravelRequested = !!(pkg?.vanTravel ?? body.vanTravel)
    hotelRequested = !!(pkg?.hotel ?? body.hotel)
    if (!singlet || !shorts || !ss || !ls) {
      return NextResponse.json({ error: "Select all apparel sizes for the team package." }, { status: 400 })
    }
    singletSize = normalizeGearSizeForDb(singlet)
    shortsSize = normalizeGearSizeForDb(shorts)
    shirtSize = formatShirtSizeForDb(ss, ls)
    lineItems = buildTeamPackageLineItems({ vanTravel: vanTravelRequested, hotel: hotelRequested })
  } else {
    const sel = body.individual as Partial<NhscaHubIndividualSelections> | undefined
    const individual: NhscaHubIndividualSelections = {
      registration: !!sel?.registration,
      singletQty: sel?.singletQty === 2 ? 2 : sel?.singletQty === 1 ? 1 : 0,
      singletSize: typeof sel?.singletSize === "string" ? sel.singletSize : "",
      shorts: !!sel?.shorts,
      shortsSize: typeof sel?.shortsSize === "string" ? sel.shortsSize : "",
      shortSleeve: !!sel?.shortSleeve,
      shortSleeveSize: typeof sel?.shortSleeveSize === "string" ? sel.shortSleeveSize : "",
      longSleeve: !!sel?.longSleeve,
      longSleeveSize: typeof sel?.longSleeveSize === "string" ? sel.longSleeveSize : "",
      vanTravel: !!sel?.vanTravel,
      hotel: !!sel?.hotel,
    }
    vanTravelRequested = individual.vanTravel
    hotelRequested = individual.hotel
    if (individual.singletQty > 0 && !individual.singletSize) {
      return NextResponse.json({ error: "Select singlet size." }, { status: 400 })
    }
    if (individual.shorts && !individual.shortsSize) {
      return NextResponse.json({ error: "Select shorts size." }, { status: 400 })
    }
    if (individual.shortSleeve && !individual.shortSleeveSize) {
      return NextResponse.json({ error: "Select short sleeve size." }, { status: 400 })
    }
    if (individual.longSleeve && !individual.longSleeveSize) {
      return NextResponse.json({ error: "Select long sleeve size." }, { status: 400 })
    }
    lineItems = buildIndividualLineItems(individual)
    if (individual.singletQty > 0) singletSize = normalizeGearSizeForDb(individual.singletSize)
    if (individual.shorts) shortsSize = normalizeGearSizeForDb(individual.shortsSize)
    shirtSize = formatShirtSizeForDb(
      individual.shortSleeve ? individual.shortSleeveSize : "",
      individual.longSleeve ? individual.longSleeveSize : ""
    )
  }

  const totalCents = lineItemsTotalCents(lineItems)
  if (totalCents <= 0) {
    return NextResponse.json({ error: "Select at least one paid item to checkout." }, { status: 400 })
  }

  const { reg_fee_cents, apparel_fee_cents } = splitFeesFromLineItems(lineItems, mode)

  const admin = createAdminClient()

  const insertPayload: Record<string, unknown> = {
    event_slug: eventSlug,
    athlete_first_name: athleteFirstName,
    athlete_last_name: athleteLastName || "—",
    athlete_email: parentEmail,
    parent_email: parentEmail,
    parent_name: parentName,
    parent_user_id: user.id,
    high_school: "—",
    graduation_year: "—",
    primary_weight: primaryWeight,
    reg_fee_cents,
    apparel_fee_cents,
    status: "pending",
    updated_at: new Date().toISOString(),
  }
  if (singletSize) insertPayload.singlet_size = singletSize
  if (shortsSize) insertPayload.shorts_size = shortsSize
  if (shirtSize) insertPayload.shirt_size = shirtSize

  const { data: reg, error: regError } = await admin
    .from("national_team_event_registrations")
    .insert(insertPayload)
    .select("id")
    .single()

  if (regError || !reg) {
    console.error("[national-team/hub/checkout] insert:", regError)
    return NextResponse.json({ error: "Failed to save registration." }, { status: 500 })
  }

  try {
    await findAndEnrichAthlete(
      admin,
      {
        email: parentEmail,
        name: `${athleteFirstName} ${athleteLastName}`.trim(),
      },
      buildEnrichmentPayload({
        contact_email: parentEmail,
        firstname: athleteFirstName,
        lastname: athleteLastName,
        weightclass: primaryWeight,
      })
    )
  } catch (enrichErr) {
    console.error("[national-team/hub/checkout] enrich:", enrichErr)
  }

  if (!stripeSecret) {
    return NextResponse.json({ error: "Payment is not configured." }, { status: 503 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const returnSlug = eventSlug === "nhsca-duals-2026-select" ? "nhsca-duals-2026-select" : "nhsca-2026"
  const stripe = new Stripe(stripeSecret)

  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lineItems.map((item) => ({
    price_data: {
      currency: "usd",
      unit_amount: item.amountCents,
      product_data: { name: item.name },
    },
    quantity: item.quantity ?? 1,
  }))

  const linesMeta = encodeLineItemsMetadata(lineItems)
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: stripeLineItems,
    customer_email: parentEmail,
    success_url: `${baseUrl}/national-team/register/${returnSlug}/success?session_id={CHECKOUT_SESSION_ID}&from=hub`,
    cancel_url: `${baseUrl}/national-team/hub?tab=payment&cancelled=1`,
    metadata: {
      business: "nc_united",
      channel: "recruitnc",
      category: "registration",
      source: "national_team",
      registration_id: reg.id,
      event_slug: eventSlug,
      checkout_mode: mode,
      checkout_lines: linesMeta.slice(0, 500),
      van_travel_requested: vanTravelRequested ? "1" : "0",
      hotel_requested: hotelRequested ? "1" : "0",
    },
  })

  if (!session.url) {
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 })
  }

  await admin
    .from("national_team_event_registrations")
    .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
    .eq("id", reg.id)

  return NextResponse.json({ checkoutUrl: session.url })
}
