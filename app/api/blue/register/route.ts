import { NextRequest, NextResponse } from "next/server"
import { normalizePhoneForStorage } from "@/lib/phone-format"
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

/** T-shirt sizes we accept for Blue signup (stored on blue_memberships.tshirt_size). */
const TSHIRT_SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = body.token?.trim()
    const parent: ParentInput | undefined = body.parent
    const athlete: AthleteInput | undefined = body.athlete
    const tshirtSizeRaw = typeof body.tshirtSize === "string" ? body.tshirtSize.trim() : undefined
    const promoCodeRaw = body.promoCode?.trim()

    if (!token || !parent?.email) {
      return NextResponse.json(
        { error: "Missing required fields: token and parent email." },
        { status: 400 }
      )
    }
    const admin = createAdminClient()
    const supabase = await createClient()
    const { data: { user: existingUser } } = await supabase.auth.getUser()
    const parentEmailNorm = parent.email.trim().toLowerCase()
    const isSessionUser = existingUser && existingUser.email?.toLowerCase() === parentEmailNorm
    if (!isSessionUser && (!parent.firstName?.trim() || !parent.lastName?.trim())) {
      return NextResponse.json(
        { error: "Missing required fields: parent firstName and lastName (or sign in so we can use your account name)." },
        { status: 400 }
      )
    }
    if (!athlete?.firstName || !athlete?.lastName || !athlete?.graduationYear || !athlete?.highSchool) {
      return NextResponse.json(
        { error: "Missing required fields: athlete (firstName, lastName, graduationYear, highSchool)" },
        { status: 400 }
      )
    }
    const tshirtSize = tshirtSizeRaw && TSHIRT_SIZES.includes(tshirtSizeRaw as (typeof TSHIRT_SIZES)[number]) ? tshirtSizeRaw : null
    if (!tshirtSize) {
      return NextResponse.json(
        { error: "Please select a t-shirt size for the athlete." },
        { status: 400 }
      )
    }

    if (!body.waiverAccepted) {
      return NextResponse.json(
        { error: "You must accept the Waiver and Release of Liability to continue." },
        { status: 400 }
      )
    }

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

    if (existingUser && existingUser.email?.toLowerCase() === parentEmailNorm) {
      payerUserId = existingUser.id
    } else if (parent.password && parent.password.length >= 8) {
      // Avoid createUser when email already exists — common for existing RecruitNC users
      const { data: existingProfiles } = await admin
        .from("user_profiles")
        .select("user_id")
        .ilike("email", parentEmailNorm)
        .limit(1)
      const existingProfile = Array.isArray(existingProfiles) ? existingProfiles[0] : existingProfiles
      if (existingProfile) {
        return NextResponse.json({
          error: "This email is already registered with RecruitNC. Sign in first, then return to this registration link and submit the form again with the password field left blank — we'll link your existing account to this Blue registration.",
          code: "EMAIL_ALREADY_REGISTERED",
        }, { status: 400 })
      }
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
        const msg = createErr?.message ?? ""
        const alreadyRegistered = /already been registered|already in use|already exists|duplicate/i.test(msg)
        return NextResponse.json({
          error: alreadyRegistered
            ? "This email is already registered with RecruitNC. Sign in first, then return to this registration link and submit the form again with the password field left blank — we'll link your existing account to this Blue registration."
            : (createErr?.message || "Could not create account. Please try again or sign in if you already have an account."),
          ...(alreadyRegistered ? { code: "EMAIL_ALREADY_REGISTERED" } : {}),
        }, { status: 400 })
      }
      payerUserId = newUser.user.id
      const { error: profileErr } = await admin.from("user_profiles").insert({
        user_id: newUser.user.id,
        email: newUser.user.email,
        full_name: `${parent.firstName} ${parent.lastName}`.trim(),
        first_name: parent.firstName.trim(),
        last_name: parent.lastName.trim(),
        cell_phone: parent.phone ? normalizePhoneForStorage(parent.phone) : null,
        profile_type: "parent",
        role: "user",
        is_admin: false,
      })
      if (profileErr) {
        console.warn("[blue/register] user_profiles insert:", profileErr.message)
      }
    } else {
      return NextResponse.json({
        error: "You're not signed in, or this email doesn't match your account. Sign in first and return to this link (then leave password blank), or enter a password here to create a new account.",
      }, { status: 400 })
    }

    // 3) Resolve or create athlete (find by name + grad year + school to avoid duplicates; link parent)
    const gradYear = Number(athlete.graduationYear)
    if (!Number.isFinite(gradYear) || gradYear < 2020 || gradYear > 2040) {
      return NextResponse.json({ error: "Invalid graduation year" }, { status: 400 })
    }
    const athleteName = `${athlete.firstName.trim()} ${athlete.lastName.trim()}`
    const existing = await findExistingAthlete(admin, {
      name: athleteName,
      graduationYear: gradYear,
      school: athlete.highSchool?.trim(),
    })

    let athleteId: string
    if (existing) {
      athleteId = existing.id
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

    let signerFirstName = parent.firstName?.trim() || ""
    let signerLastName = parent.lastName?.trim() || ""
    if (payerUserId && (!signerFirstName || !signerLastName)) {
      const { data: profileRow } = await admin
        .from("user_profiles")
        .select("first_name, last_name")
        .eq("user_id", payerUserId)
        .maybeSingle()
      if (profileRow) {
        signerFirstName = signerFirstName || (profileRow.first_name as string)?.trim() || ""
        signerLastName = signerLastName || (profileRow.last_name as string)?.trim() || ""
      }
      if (!signerFirstName && !signerLastName && existingUser?.user_metadata) {
        const meta = existingUser.user_metadata as Record<string, unknown>
        signerFirstName = (meta.first_name as string)?.trim() || ""
        signerLastName = (meta.last_name as string)?.trim() || ""
      }
    }
    const signerName = `${signerFirstName} ${signerLastName}`.trim() || null
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

    const membershipInsert: Record<string, unknown> = {
      athlete_id: athleteId,
      payer_user_id: payerUserId,
      status: "pending_payment",
      source: "invite",
      tshirt_size: tshirtSize,
    }
    const { data: newMembership, error: membershipErr } = await admin
      .from("blue_memberships")
      .insert(membershipInsert)
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
      metadata: {
        business: "nc_united",
        channel: "blue",
        category: "subscription",
        membership_id: newMembership.id,
      },
      subscription_data: {
        metadata: {
          business: "nc_united",
          channel: "blue",
          category: "subscription",
          membership_id: newMembership.id,
        },
      },
      allow_promotion_codes: true,
    }
    if (stripeCouponId) sessionParams.discounts = [{ coupon: stripeCouponId }]
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (stripeErr: unknown) {
      const err = stripeErr as { type?: string; statusCode?: number; message?: string }
      if (err?.type === "StripeAuthenticationError" || err?.statusCode === 401) {
        console.error("[blue/register] Stripe auth failed (invalid or wrong API key):", err?.message ?? stripeErr)
        return NextResponse.json(
          { error: "Payment configuration error. Please contact support." },
          { status: 503 }
        )
      }
      throw stripeErr
    }

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
