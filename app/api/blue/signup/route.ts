import { NextRequest, NextResponse } from "next/server"
import { normalizePhoneForStorage } from "@/lib/phone-format"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { resolveBlueSignupPayload } from "@/lib/blue-register-resolve"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY
const bluePriceId = process.env.STRIPE_BLUE_PRICE_ID

const TSHIRT_SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"] as const

/** Blue signup: sign in required. Merges profile + linked athlete data; only missing fields come from the form. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      return NextResponse.json({ error: "Sign in to register for Blue." }, { status: 401 })
    }

    const body = await request.json()
    const token = body.token?.trim() || null
    const tshirtSizeRaw = typeof body.tshirtSize === "string" ? body.tshirtSize.trim() : undefined
    const promoCodeRaw = body.promoCode?.trim()
    const waiverAccepted = body.waiverAccepted === true

    const tshirtSize =
      tshirtSizeRaw && TSHIRT_SIZES.includes(tshirtSizeRaw as (typeof TSHIRT_SIZES)[number]) ? tshirtSizeRaw : null
    if (!tshirtSize) return NextResponse.json({ error: "Please select a t-shirt size." }, { status: 400 })
    if (!waiverAccepted) {
      return NextResponse.json({ error: "You must accept the Waiver and Release of Liability to continue." }, { status: 400 })
    }

    const admin = createAdminClient()
    const resolved = await resolveBlueSignupPayload(admin, user.id, user.email, body)
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 })
    }

    const { parent, athlete } = resolved

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
        parent_relationship: parent.relationship?.trim() || "Guardian",
        athlete_first_name: athlete.firstName.trim(),
        athlete_last_name: athlete.lastName.trim(),
        athlete_graduation_year: athlete.graduationYear,
        athlete_high_school: athlete.highSchool.trim(),
        athlete_wrestling_club: athlete.wrestlingClub.trim() || null,
        athlete_weight_class: athlete.weightClass.trim() || null,
        athlete_cell_phone: athlete.cellPhone ? normalizePhoneForStorage(athlete.cellPhone) : null,
        athlete_email: athlete.email?.trim().toLowerCase() || null,
        athlete_gpa: athlete.gpa?.trim() || null,
        interest_wrestling_college: athlete.interestWrestlingCollege === true,
        highest_achievement: athlete.highestAchievement.trim() || "None",
        tshirt_size: tshirtSize,
        waiver_signed_at: new Date().toISOString(),
        promo_code_used: promoCodeRaw?.trim() || null,
        status: "pending_payment",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (signupErr || !signup) {
      const errCode = signupErr?.code !== undefined ? String(signupErr.code) : ""
      const errMsg = (signupErr?.message ?? "") as string
      console.error("[blue/signup] insert failed:", { code: errCode, message: errMsg, full: signupErr })
      const isUndefinedColumn =
        errCode === "42703" || errMsg.includes("42703") || (errMsg.includes("column") && errMsg.includes("does not exist"))
      if (isUndefinedColumn) {
        return NextResponse.json(
          {
            error:
              "Database is missing new registration columns. Run the migration in docs/blue-signups-table.md in Supabase SQL Editor, then try again.",
          },
          { status: 503 },
        )
      }
      if (signupErr?.code === "42P01" || (errMsg.includes("relation") && errMsg.includes("does not exist"))) {
        return NextResponse.json({ error: "Blue signups are not set up yet. Please contact info@ncwrestlingunited.com." }, { status: 503 })
      }
      return NextResponse.json({ error: "Failed to save registration. Please try again or contact info@ncwrestlingunited.com." }, { status: 500 })
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
        (p) => (!p.valid_until || p.valid_until >= now) && (p.max_redemptions == null || (p.redemptions_count ?? 0) < p.max_redemptions),
      )
      if (promo) {
        if (promo.stripe_coupon_id) {
          stripeCouponId = promo.stripe_coupon_id
          promoIdToIncrement = promo.id
        } else {
          return NextResponse.json(
            { error: "This scholarship code is not set up for checkout yet. Please contact info@ncwrestlingunited.com." },
            { status: 400 },
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
      metadata: {
        business: "nc_united",
        channel: "blue",
        category: "subscription",
        signup_id: signup.id,
        payer_user_id: user.id,
        ...(athlete.athleteId ? { athlete_id: athlete.athleteId } : {}),
      },
      subscription_data: {
        metadata: {
          business: "nc_united",
          channel: "blue",
          category: "subscription",
          signup_id: signup.id,
          payer_user_id: user.id,
          ...(athlete.athleteId ? { athlete_id: athlete.athleteId } : {}),
        },
      },
    }
    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }]
    } else {
      sessionParams.allow_promotion_codes = true
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session. Please try again." }, { status: 500 })
    }

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
