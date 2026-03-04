import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const DEFAULT_EVENT_SLUG = "nhsca-duals-2026"
const stripeSecret = process.env.STRIPE_SECRET_KEY

/** POST: validate code, create national_team_event_registrations row, create Stripe Checkout (one-time payment), return checkoutUrl */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const code = typeof body.code === "string" ? body.code.trim() : ""
    const eventSlug = typeof body.eventSlug === "string" ? body.eventSlug.trim() || DEFAULT_EVENT_SLUG : DEFAULT_EVENT_SLUG
    const returnUrlSlug = typeof body.returnUrlSlug === "string" ? body.returnUrlSlug.trim() || eventSlug : eventSlug

    if (!code) {
      return NextResponse.json({ error: "Invite code is required." }, { status: 400 })
    }

    const athleteFirstName = typeof body.athlete_first_name === "string" ? body.athlete_first_name.trim() : ""
    const athleteLastName = typeof body.athlete_last_name === "string" ? body.athlete_last_name.trim() : ""
    const athleteEmail = typeof body.athlete_email === "string" ? body.athlete_email.trim() : ""
    const athletePhone = typeof body.athlete_phone === "string" ? body.athlete_phone.trim() || null : null
    const parentEmail = typeof body.parent_email === "string" ? body.parent_email.trim() : ""
    const parentName = typeof body.parent_name === "string" ? body.parent_name.trim() || null : null
    const highSchool = typeof body.high_school === "string" ? body.high_school.trim() : ""
    const clubTeam = typeof body.club_team === "string" ? body.club_team.trim() || null : null
    const graduationYear = typeof body.graduation_year === "string" ? body.graduation_year.trim() : ""
    const primaryWeight = typeof body.primary_weight === "string" ? body.primary_weight.trim() : ""
    const secondaryWeight = typeof body.secondary_weight === "string" ? body.secondary_weight.trim() || null : null

    if (!athleteFirstName || !athleteLastName || !athleteEmail) {
      return NextResponse.json({ error: "Athlete first name, last name, and email are required." }, { status: 400 })
    }
    if (!parentEmail) {
      return NextResponse.json({ error: "Parent email is required." }, { status: 400 })
    }
    if (!highSchool || !graduationYear || !primaryWeight) {
      return NextResponse.json({ error: "High school, graduation year, and primary weight are required." }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: inviteRow, error: inviteError } = await admin
      .from("national_team_invite_codes")
      .select("id, max_uses, uses_count, expires_at")
      .eq("event_slug", eventSlug)
      .eq("code", code)
      .maybeSingle()

    if (inviteError || !inviteRow) {
      return NextResponse.json({ error: "Invalid or expired invite code." }, { status: 400 })
    }
    if (inviteRow.expires_at && new Date(inviteRow.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invite code has expired." }, { status: 400 })
    }
    const usesCount = Number(inviteRow.uses_count) ?? 0
    const maxUses = inviteRow.max_uses != null ? Number(inviteRow.max_uses) : null
    if (maxUses != null && usesCount >= maxUses) {
      return NextResponse.json({ error: "This invite code has reached its maximum uses." }, { status: 400 })
    }

    const { data: products } = await admin
      .from("products")
      .select("id, name, price, slug")
      .eq("category", "national_team")
    const product = (products ?? []).find((p: { slug?: string }) => p.slug === "nhsca-2026-bundle") ?? products?.[0]
    const bundlePrice = product?.price != null ? Number(product.price) : 250
    const totalCents = Math.round(bundlePrice * 100)
    const regFeeCents = totalCents
    const apparelFeeCents = 0

    const { data: reg, error: regError } = await admin
      .from("national_team_event_registrations")
      .insert({
        event_slug: eventSlug,
        athlete_first_name: athleteFirstName,
        athlete_last_name: athleteLastName,
        athlete_email: athleteEmail,
        athlete_phone: athletePhone,
        parent_email: parentEmail,
        parent_name: parentName,
        high_school: highSchool,
        club_team: clubTeam,
        graduation_year: graduationYear,
        primary_weight: primaryWeight,
        secondary_weight: secondaryWeight,
        reg_fee_cents: regFeeCents,
        apparel_fee_cents: apparelFeeCents,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (regError || !reg) {
      if ((regError as { code?: string })?.code === "42P01") {
        return NextResponse.json(
          { error: "Registrations are not set up yet. Run scripts/208-national-team-registrations-and-products.md in Supabase." },
          { status: 503 }
        )
      }
      console.error("[national-team/register] insert:", regError)
      return NextResponse.json({ error: "Failed to save registration. Please try again." }, { status: 500 })
    }

    if (!stripeSecret) {
      return NextResponse.json({ error: "Payment is not configured. Contact the event organizer." }, { status: 503 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const stripe = new Stripe(stripeSecret)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: totalCents,
            product_data: {
              name: product?.name ?? "NHSCA 2026 – Registration + Apparel",
              description: "National team event: registration and apparel bundle",
            },
          },
          quantity: 1,
        },
      ],
      customer_email: parentEmail,
      success_url: `${baseUrl}/national-team/register/${returnUrlSlug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/national-team/register/${returnUrlSlug}?cancelled=1`,
      metadata: {
        source: "national_team",
        registration_id: reg.id,
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true, checkoutUrl: session.url })
  } catch (e) {
    console.error("[national-team/register]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Registration failed." }, { status: 500 })
  }
}
