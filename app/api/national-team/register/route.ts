import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { findAndEnrichAthlete, buildEnrichmentPayload } from "@/lib/enrich-athlete-profile"
import {
  AAU_SCHOLASTIC_APPAREL_FEE_CENTS,
  AAU_SCHOLASTIC_CHECKOUT_LINES,
  AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS,
  AAU_SCHOLASTIC_REG_FEE_CENTS,
} from "@/lib/aau-scholastic-duals-2026-content"

export const dynamic = "force-dynamic"

const DEFAULT_EVENT_SLUG = "nhsca-duals-2026"
const stripeSecret = process.env.STRIPE_SECRET_KEY

/** POST: validate code, create national_team_event_registrations row, create Stripe Checkout (one-time payment), return checkoutUrl.
 * Roster (National vs Select) is determined by eventSlug from the REG LINK the user opened, not by the invite code. Same code can work for both links. */
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
    let parentUserId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) parentUserId = user.id
    } catch {
      // auth optional
    }

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
    const isAau = eventSlug === "aau-2026"
    const productSlug = isAau ? "aau-2026-bundle" : "nhsca-2026-bundle"
    const product =
      (products ?? []).find((p: { slug?: string }) => p.slug === productSlug) ??
      (products ?? []).find((p: { slug?: string }) => p.slug === "nhsca-2026-bundle") ??
      products?.[0]
    const defaultProductName = isAau
      ? "AAU Scholastic Duals 2026 – Registration + Apparel"
      : "NHSCA 2026 – Registration + Apparel"
    const bundlePrice =
      product?.price != null
        ? Number(product.price)
        : isAau
          ? AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS
          : 250
    const totalCents = Math.round(bundlePrice * 100)
    const regFeeCents = isAau ? AAU_SCHOLASTIC_REG_FEE_CENTS : totalCents
    const apparelFeeCents = isAau ? AAU_SCHOLASTIC_APPAREL_FEE_CENTS : 0

    const insertPayload: Record<string, unknown> = {
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
    }
    if (parentUserId) insertPayload.parent_user_id = parentUserId

    const { data: reg, error: regError } = await admin
      .from("national_team_event_registrations")
      .insert(insertPayload)
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

    try {
      const gradYear = parseInt(graduationYear, 10)
      const enrichPayload = buildEnrichmentPayload({
        contact_email: athleteEmail,
        phone: athletePhone,
        firstname: athleteFirstName,
        lastname: athleteLastName,
        highschool: highSchool,
        weightclass: primaryWeight,
        wrestling_club: clubTeam,
      })
      await findAndEnrichAthlete(admin, {
        email: athleteEmail,
        name: `${athleteFirstName} ${athleteLastName}`.trim(),
        graduationYear: Number.isFinite(gradYear) ? gradYear : undefined,
        school: highSchool,
      }, enrichPayload)
    } catch (enrichErr) {
      console.error("[national-team/register] athlete enrichment:", enrichErr)
    }

    if (!stripeSecret) {
      return NextResponse.json({ error: "Payment is not configured. Contact the event organizer." }, { status: 503 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const stripe = new Stripe(stripeSecret)

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = isAau
      ? AAU_SCHOLASTIC_CHECKOUT_LINES.map((line) => ({
          price_data: {
            currency: "usd",
            unit_amount: line.dollars * 100,
            product_data: {
              name: line.label,
              description: "NC United AAU Scholastic Duals 2026",
            },
          },
          quantity: 1,
        }))
      : [
          {
            price_data: {
              currency: "usd",
              unit_amount: totalCents,
              product_data: {
                name: product?.name ?? defaultProductName,
                description: "National team event: registration and apparel bundle",
              },
            },
            quantity: 1,
          },
        ]

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: parentEmail,
      success_url: `${baseUrl}/national-team/register/${returnUrlSlug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/national-team/register/${returnUrlSlug}?cancelled=1`,
      metadata: {
        business: "nc_united",
        channel: "recruitnc",
        category: "registration",
        source: "national_team",
        registration_id: reg.id,
        event_slug: eventSlug,
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
