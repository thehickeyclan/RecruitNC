import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAthletesColumnNames, filterPayloadToSchema } from "@/lib/athletes-schema"
import { findExistingAthlete } from "@/lib/athlete-duplicate-check"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY
const bluePriceId = process.env.STRIPE_BLUE_PRICE_ID

type ParentInput = { email: string; password?: string; firstName: string; lastName: string; phone?: string }
type AthleteInput = { firstName: string; lastName: string; graduationYear: number; highSchool: string; weightClass?: string }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = body.token?.trim()
    const parent: ParentInput | undefined = body.parent
    const athlete: AthleteInput | undefined = body.athlete
    const promoCodeRaw = body.promoCode?.trim()

    if (!token || !parent?.email || !parent?.firstName || !parent?.lastName || !athlete?.firstName || !athlete?.lastName || !athlete?.graduationYear || !athlete?.highSchool) {
      return NextResponse.json(
        { error: "Missing required fields: token, parent (email, firstName, lastName), athlete (firstName, lastName, graduationYear, highSchool)" },
        { status: 400 }
      )
    }

    if (!body.waiverAccepted) {
      return NextResponse.json(
        { error: "You must accept the Waiver and Release of Liability to continue." },
        { status: 400 }
      )
    }

    const gradYear = Number(athlete.graduationYear)
    if (!Number.isFinite(gradYear) || gradYear < 2020 || gradYear > 2040) {
      return NextResponse.json({ error: "Invalid graduation year" }, { status: 400 })
    }

    const admin = createAdminClient()
    const supabase = await createClient()

    // 1) Load and validate invite
    const { data: invite, error: inviteErr } = await admin
      .from("blue_invites")
      .select("id, email, expires_at, used_at")
      .eq("token", token)
      .maybeSingle()

    if (inviteErr || !invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 400 })
    if (invite.used_at) return NextResponse.json({ error: "This invite has already been used" }, { status: 400 })
    if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "This invite has expired" }, { status: 400 })

    // 2) Resolve or create parent
    let payerUserId: string

    const { data: { user: existingUser } } = await supabase.auth.getUser()
    if (existingUser && existingUser.email?.toLowerCase() === parent.email.trim().toLowerCase()) {
      payerUserId = existingUser.id
    } else if (parent.password && parent.password.length >= 8) {
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email: parent.email.trim(),
        password: parent.password,
        email_confirm: true,
        user_metadata: {
          full_name: `${parent.firstName} ${parent.lastName}`.trim(),
          first_name: parent.firstName.trim(),
          last_name: parent.lastName.trim(),
          profile_type: "parent",
        },
      })
      if (createErr || !newUser.user) {
        return NextResponse.json({ error: createErr?.message || "Could not create account. Email may already be in use." }, { status: 400 })
      }
      payerUserId = newUser.user.id
      const { error: profileErr } = await admin.from("user_profiles").insert({
        user_id: newUser.user.id,
        email: newUser.user.email,
        full_name: `${parent.firstName} ${parent.lastName}`.trim(),
        first_name: parent.firstName.trim(),
        last_name: parent.lastName.trim(),
        cell_phone: parent.phone?.trim() || null,
        profile_type: "parent",
        role: "user",
        is_admin: false,
      })
      if (profileErr) {
        console.warn("[blue/register] user_profiles insert:", profileErr.message)
      }
    } else {
      return NextResponse.json({
        error: "Sign in with this email first, or provide a password (min 8 characters) to create an account.",
      }, { status: 400 })
    }

    // 3) Resolve or create athlete (handles existing athletes in RecruitNC)
    const athleteName = `${athlete.firstName.trim()} ${athlete.lastName.trim()}`
    let athleteId: string

    const existing = await findExistingAthlete(admin, {
      name: athleteName,
      graduationYear: gradYear,
      school: athlete.highSchool?.trim(),
    })

    if (existing) {
      athleteId = existing.id
      // Ensure Blue flag is set on existing athlete
      const cols = await getAthletesColumnNames(admin)
      const updatePayload = filterPayloadToSchema({ ncUnitedTeam: "blue", updated_at: new Date().toISOString() }, cols)
      if (Object.keys(updatePayload).length > 0) {
        await admin.from("athletes").update(updatePayload).eq("id", athleteId)
      }
    } else {
      const columns = await getAthletesColumnNames(admin)
      const athletePayload: Record<string, unknown> = {
        name: athleteName,
        firstName: athlete.firstName.trim(),
        lastName: athlete.lastName.trim(),
        graduationyear: gradYear,
        highschool: athlete.highSchool.trim(),
        weightclass: athlete.weightClass?.trim() || null,
        ncUnitedTeam: "blue",
        recruiting_status: "Uncommitted",
        is_prospect: true,
        profile_verified: false,
        updated_at: new Date().toISOString(),
      }
      const filtered = filterPayloadToSchema(athletePayload, columns)
      const { data: newAthlete, error: athleteErr } = await admin
        .from("athletes")
        .insert(filtered)
        .select("id")
        .single()
      if (athleteErr) {
        return NextResponse.json({ error: "Failed to create athlete: " + (athleteErr.message || "unknown") }, { status: 500 })
      }
      athleteId = newAthlete.id
    }

    const signerName = `${parent.firstName.trim()} ${parent.lastName.trim()}`
    const { error: waiverErr } = await admin.from("liability_waivers").upsert(
      {
        user_id: payerUserId,
        athlete_id: athleteId,
        waiver_type: "nc_united_liability",
        waiver_version: "1",
        signer_name: signerName || null,
        signed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,athlete_id,waiver_type" }
    )
    if (waiverErr) {
      console.warn("[blue/register] liability_waivers upsert:", waiverErr.message)
    }

    // 4) Link parent to athlete (link may already exist)
    const { data: existingLink } = await admin
      .from("parent_athlete_links")
      .select("id")
      .eq("user_id", payerUserId)
      .eq("athlete_id", athleteId)
      .maybeSingle()
    if (!existingLink) {
      const { error: linkErr } = await admin.from("parent_athlete_links").insert({
        user_id: payerUserId,
        athlete_id: athleteId,
      })
      if (linkErr) {
        console.warn("[blue/register] parent_athlete_links insert:", linkErr.message)
      }
    }

    // 5) Add Blue membership only if athlete doesn't already have active one (billing required for new)
    const { data: existingMembership } = await admin
      .from("blue_memberships")
      .select("id")
      .eq("athlete_id", athleteId)
      .eq("status", "active")
      .maybeSingle()

    if (existingMembership) {
      // Already in Blue: parent link is enough; no payment
      await admin.from("blue_invites").update({ used_at: new Date().toISOString() }).eq("id", invite.id)
      return NextResponse.json({
        success: true,
        athleteId,
        message: "You're already in Blue. We've linked this account.",
      })
    }

    const { data: newMembership, error: membershipErr } = await admin
      .from("blue_memberships")
      .insert({
        athlete_id: athleteId,
        payer_user_id: payerUserId,
        status: "pending_payment",
        source: "recruitnc_onboarding",
      })
      .select("id")
      .single()

    if (membershipErr || !newMembership) {
      return NextResponse.json({ error: "Failed to create membership." }, { status: 500 })
    }

    await admin.from("blue_invites").update({ used_at: new Date().toISOString() }).eq("id", invite.id)

    if (!stripeSecret || !bluePriceId) {
      console.error("[blue/register] STRIPE_SECRET_KEY or STRIPE_BLUE_PRICE_ID not set")
      return NextResponse.json(
        { error: "Payment is not configured yet. Please contact support." },
        { status: 503 }
      )
    }

    let stripeCouponId: string | null = null
    let promoRowId: string | null = null
    let promoRedemptions = 0
    if (promoCodeRaw) {
      const now = new Date().toISOString()
      const { data: promos } = await admin
        .from("blue_promo_codes")
        .select("id, stripe_coupon_id, max_redemptions, redemptions_count, valid_until")
        .ilike("code", promoCodeRaw)
        .lte("valid_from", now)
      const promo = (promos ?? []).find((p) => !p.valid_until || p.valid_until >= now)
      if (promo?.stripe_coupon_id && (promo.max_redemptions == null || (promo.redemptions_count ?? 0) < promo.max_redemptions)) {
        stripeCouponId = promo.stripe_coupon_id
        promoRowId = promo.id
        promoRedemptions = (promo.redemptions_count ?? 0) + 1
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
      metadata: { membership_id: newMembership.id },
      subscription_data: { metadata: { membership_id: newMembership.id } },
      allow_promotion_codes: true,
    }
    if (stripeCouponId) sessionParams.discounts = [{ coupon: stripeCouponId }]
    const session = await stripe.checkout.sessions.create(sessionParams)

    if (promoRowId) {
      await admin.from("blue_promo_codes").update({ redemptions_count: promoRedemptions }).eq("id", promoRowId)
    }

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      athleteId,
      checkoutUrl: session.url,
      message: "Complete payment to join Blue.",
    })
  } catch (e) {
    console.error("[blue/register]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Registration failed" }, { status: 500 })
  }
}
