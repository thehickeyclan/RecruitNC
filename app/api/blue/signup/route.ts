import { NextRequest, NextResponse } from "next/server"
import { normalizePhoneForStorage } from "@/lib/phone-format"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY
const bluePriceId = process.env.STRIPE_BLUE_PRICE_ID

const TSHIRT_SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"] as const

/** Simple isolated Blue signup: no auth. Validates invite, writes blue_signups, creates Stripe checkout. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = body.token?.trim() || null
    const parent = body.parent
    const athlete = body.athlete
    const tshirtSizeRaw = typeof body.tshirtSize === "string" ? body.tshirtSize.trim() : undefined
    const promoCodeRaw = body.promoCode?.trim()
    const waiverAccepted = body.waiverAccepted === true
    if (!parent?.email?.trim() || !parent?.firstName?.trim() || !parent?.lastName?.trim()) {
      return NextResponse.json({ error: "Missing parent email, first name, or last name." }, { status: 400 })
    }
    if (!athlete?.firstName?.trim() || !athlete?.lastName?.trim() || athlete?.graduationYear == null || !athlete?.highSchool?.trim()) {
      return NextResponse.json({ error: "Missing athlete first name, last name, graduation year, or high school." }, { status: 400 })
    }
    const wrestlingClub = athlete?.wrestlingClub?.trim() || null
    const tshirtSize = tshirtSizeRaw && TSHIRT_SIZES.includes(tshirtSizeRaw as (typeof TSHIRT_SIZES)[number])
      ? tshirtSizeRaw
      : null
    if (!tshirtSize) return NextResponse.json({ error: "Please select a t-shirt size." }, { status: 400 })
    if (!waiverAccepted) {
      return NextResponse.json({ error: "You must accept the Waiver and Release of Liability to continue." }, { status: 400 })
    }

    const gradYear = Number(athlete.graduationYear)
    if (!Number.isFinite(gradYear) || gradYear < 2020 || gradYear > 2040) {
      return NextResponse.json({ error: "Invalid graduation year." }, { status: 400 })
    }

    const admin = createAdminClient()

    let inviteId: string | null = null
    if (token) {
      const { data: invite, error: inviteErr } = await admin
        .from("blue_invites")
        .select("id, expires_at, used_at")
        .eq("token", token)
        .maybeSingle()
      if (inviteErr || !invite) return NextResponse.json({ error: "Invalid invite link." }, { status: 400 })
      if (invite.used_at) return NextResponse.json({ error: "This invite has already been used." }, { status: 400 })
      if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "This invite has expired." }, { status: 400 })
      inviteId = invite.id
    }

    const { data: signup, error: signupErr } = await admin
      .from("blue_signups")
      .insert({
        invite_id: inviteId,
        parent_email: parent.email.trim().toLowerCase(),
        parent_first_name: parent.firstName.trim(),
        parent_last_name: parent.lastName.trim(),
        parent_phone: parent.phone ? normalizePhoneForStorage(parent.phone) : null,
        athlete_first_name: athlete.firstName.trim(),
        athlete_last_name: athlete.lastName.trim(),
        athlete_graduation_year: gradYear,
        athlete_high_school: athlete.highSchool.trim(),
        athlete_wrestling_club: wrestlingClub,
        athlete_weight_class: athlete.weightClass?.trim() || null,
        tshirt_size: tshirtSize,
        waiver_signed_at: new Date().toISOString(),
        promo_code_used: promoCodeRaw?.trim() || null,
        status: "pending_payment",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (signupErr || !signup) {
      if (signupErr?.code === "42P01") {
        return NextResponse.json(
          { error: "Blue signups are not set up yet. Please run the SQL in docs/blue-signups-table.md in Supabase." },
          { status: 503 }
        )
      }
      console.error("[blue/signup] insert:", signupErr)
      return NextResponse.json({ error: "Failed to save registration." }, { status: 500 })
    }

    if (inviteId) {
      await admin.from("blue_invites").update({ used_at: new Date().toISOString() }).eq("id", inviteId)
    }

    if (!stripeSecret || !bluePriceId) {
      return NextResponse.json({ error: "Payment is not configured yet. Please contact support." }, { status: 503 })
    }

    let stripeCouponId: string | null = null
    let promoIdToIncrement: string | null = null
    if (promoCodeRaw) {
      const now = new Date().toISOString()
      const { data: promos } = await admin
        .from("blue_promo_codes")
        .select("id, stripe_coupon_id, max_redemptions, redemptions_count, valid_until")
        .ilike("code", promoCodeRaw.trim())
      const promo = (promos ?? []).find(
        (p) => (!p.valid_until || p.valid_until >= now) && (p.max_redemptions == null || (p.redemptions_count ?? 0) < p.max_redemptions)
      )
      if (promo) {
        if (promo.stripe_coupon_id) {
          stripeCouponId = promo.stripe_coupon_id
          promoIdToIncrement = promo.id
        } else {
          return NextResponse.json(
            { error: "This scholarship code is not set up for checkout yet. Please contact info@ncwrestlingunited.com." },
            { status: 400 }
          )
        }
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const stripe = new Stripe(stripeSecret)
    const sessionParams: Parameters<Stripe["checkout"]["sessions"]["create"]>[0] = {
      mode: "subscription",
      line_items: [{ price: bluePriceId, quantity: 1 }],
      customer_email: parent.email.trim(),
      success_url: `${baseUrl}/blue/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/blue/register/cancelled`,
      metadata: { signup_id: signup.id },
      subscription_data: { metadata: { signup_id: signup.id } },
      allow_promotion_codes: true,
    }
    if (stripeCouponId) sessionParams.discounts = [{ coupon: stripeCouponId }]

    const session = await stripe.checkout.sessions.create(sessionParams)
    if (!session.url) return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 })

    if (promoIdToIncrement) {
      const { data: row } = await admin.from("blue_promo_codes").select("redemptions_count").eq("id", promoIdToIncrement).single()
      const next = (row?.redemptions_count ?? 0) + 1
      await admin.from("blue_promo_codes").update({ redemptions_count: next }).eq("id", promoIdToIncrement)
    }
    return NextResponse.json({ success: true, checkoutUrl: session.url })
  } catch (e) {
    console.error("[blue/signup]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Registration failed." }, { status: 500 })
  }
}
