import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  assertWeightClassHasCapacity,
  resolveAthleteNotificationEmails,
} from "@/lib/toc/invitation-service"
import { tocAthleteConfirmSchema } from "@/lib/toc/invitations"
import {
  confirmDeadlineMessage,
  formatTocRegistrationFee,
  isConfirmPastDeadline,
  isInvitationPaymentPastDue,
  TOC_CONFIRM_WITHIN_DAYS,
  TOC_REGISTRATION_FEE_COVERS,
  TOC_REGISTRATION_FEE_USD,
} from "@/lib/toc/registration-policy"
import { buildTocRegistrationCheckoutMetadata, TOC_STRIPE_REGISTRATION_TYPE } from "@/lib/toc/stripe-metadata"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

export async function POST(request: Request) {
  try {
    if (!stripeSecret?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Stripe is not configured. Contact NC United if this persists." },
        { status: 503 },
      )
    }

    const body = await request.json()
    const parsed = tocAthleteConfirmSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission" },
        { status: 400 },
      )
    }

    const input = parsed.data
    const admin = createAdminClient()

    const { data: invitation, error: findError } = await admin
      .from("toc_invitations")
      .select("*")
      .eq("athlete_id", input.athleteId)
      .maybeSingle()

    if (findError?.code === "42P01") {
      return NextResponse.json({ ok: false, error: "Confirmation is not available yet." }, { status: 503 })
    }
    if (findError) {
      console.error("[toc/athlete-confirm]", findError)
      return NextResponse.json({ ok: false, error: "Failed to load invitation" }, { status: 500 })
    }
    if (!invitation) {
      return NextResponse.json(
        { ok: false, error: "No invitation found for this athlete. Contact NC United if you believe this is an error." },
        { status: 400 },
      )
    }
    if (invitation.status === "confirmed") {
      return NextResponse.json({ ok: true, alreadyConfirmed: true })
    }
    if (invitation.status !== "invited") {
      return NextResponse.json(
        { ok: false, error: "This invitation is not open for confirmation." },
        { status: 400 },
      )
    }

    if (isConfirmPastDeadline(invitation.invited_at, new Date(), invitation.confirmation_token_expires_at)) {
      const deadline = confirmDeadlineMessage(invitation.invited_at, invitation.confirmation_token_expires_at)
      return NextResponse.json(
        {
          ok: false,
          error: deadline
            ? `The confirmation window closed on ${deadline}. Contact ${process.env.TOC_CONTACT_EMAIL ?? "info@ncwrestlingunited.com"}.`
            : `Confirmation must be completed within ${TOC_CONFIRM_WITHIN_DAYS} days of your invite. Contact NC United.`,
        },
        { status: 400 },
      )
    }

    const capacity = await assertWeightClassHasCapacity(admin, input.weightClass, invitation.id)
    if (!capacity.ok) {
      return NextResponse.json({ ok: false, error: capacity.message }, { status: 400 })
    }

    if (isInvitationPaymentPastDue(invitation.confirmation_token_expires_at, invitation.invited_at)) {
      const deadline = confirmDeadlineMessage(invitation.invited_at, invitation.confirmation_token_expires_at)
      return NextResponse.json(
        {
          ok: false,
          error: `Registration payment was due${deadline ? ` by ${deadline}` : ""}. Contact ${process.env.TOC_CONTACT_EMAIL ?? "info@ncwrestlingunited.com"}.`,
        },
        { status: 400 },
      )
    }

    const medicalNotes = input.medicalNotes?.trim() || null
    const now = new Date().toISOString()

    const { data: updated, error: updateError } = await admin
      .from("toc_invitations")
      .update({
        updated_at: now,
        weight_class: input.weightClass,
        jacket_size: input.jacketSize,
        medical_notes: medicalNotes,
        attendance_acknowledgment: true,
        weight_acknowledgment: true,
        usaw_acknowledgment: true,
        photo_release_accepted: true,
      })
      .eq("id", invitation.id)
      .eq("status", "invited")
      .select("id, athlete_id, weight_class, jacket_size")
      .maybeSingle()

    if (updateError) {
      console.error("[toc/athlete-confirm]", updateError)
      if (updateError.code === "42703") {
        return NextResponse.json(
          {
            ok: false,
            error: "Database needs Phase 2 TOC columns. Run docs/sql/toc-phase-2-invitations.sql.txt in Supabase.",
          },
          { status: 503 },
        )
      }
      return NextResponse.json({ ok: false, error: "Failed to save registration details" }, { status: 500 })
    }
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Invitation was already updated. Refresh and try again." }, { status: 409 })
    }

    const { data: athlete } = await admin.from("athletes").select("*").eq("id", input.athleteId).maybeSingle()
    const athleteName = typeof athlete?.name === "string" ? athlete.name : "Athlete"
    const emails = await resolveAthleteNotificationEmails(
      admin,
      input.athleteId,
      athlete as Record<string, unknown> | undefined,
    )
    const customerEmail = emails[0] ?? undefined
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
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
      cancel_url: `${baseUrl}/tournament-of-champions/confirm?athlete=${encodeURIComponent(input.athleteId)}&cancelled=1`,
      metadata: buildTocRegistrationCheckoutMetadata({
        invitationId: updated.id,
        athleteId: input.athleteId,
        weightClass: input.weightClass,
        athleteName,
      }),
    })

    if (!session.url) {
      return NextResponse.json({ ok: false, error: "Could not create checkout session." }, { status: 500 })
    }

    const { error: patchError } = await admin
      .from("toc_invitations")
      .update({
        payment_status: "pending",
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updated.id)

    if (patchError) {
      console.error("[toc/athlete-confirm] patch checkout session:", patchError.message)
    }

    return NextResponse.json({ ok: true, checkoutUrl: session.url, weightClass: input.weightClass })
  } catch (e) {
    console.error("[toc/athlete-confirm]", e)
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 })
  }
}
