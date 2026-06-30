import type Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import { isTocRegistrationStripeMetadata } from "@/lib/toc/stripe-metadata"
import { TOC_REGISTRATION_FEE_USD } from "@/lib/toc/registration-policy"
import { orderShippingFields } from "@/lib/order-shipping"

function generateOrderNumber(): string {
  return (
    "NC-" +
    Date.now().toString(36).toUpperCase().slice(-6) +
    "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  )
}

export async function processTocRegistrationCheckoutSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  if (!isTocRegistrationStripeMetadata(session.metadata as Record<string, string>)) {
    return false
  }

  if (session.payment_status !== "paid") {
    return true
  }

  const invitationId = String(session.metadata?.invitation_id ?? "").trim()
  const athleteId = String(session.metadata?.athlete_id ?? "").trim()
  if (!invitationId || !athleteId) {
    console.error("[toc/register] checkout missing invitation_id or athlete_id in metadata")
    return true
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as { id?: string } | null)?.id ?? null

  const { data: invitation, error: invError } = await admin
    .from("toc_invitations")
    .select("id, athlete_id, weight_class, status, payment_status, paid_at")
    .eq("id", invitationId)
    .maybeSingle()

  if (invError) {
    if (invError.code === "42703") {
      console.error("[toc/register] payment columns missing — run docs/sql/toc-phase-3-registration-payment.sql.txt")
      return true
    }
    console.error("[toc/register] load invitation:", invError.message)
    return true
  }

  if (!invitation) {
    console.error("[toc/register] invitation not found:", invitationId)
    return true
  }

  if (String(invitation.athlete_id) !== athleteId) {
    console.error("[toc/register] athlete_id mismatch for invitation", invitationId)
    return true
  }

  if (invitation.status !== "confirmed") {
    console.warn("[toc/register] payment received but invitation not confirmed:", invitationId)
  }

  const now = new Date().toISOString()
  const amountCents = session.amount_total ?? TOC_REGISTRATION_FEE_USD * 100

  if (invitation.payment_status !== "paid") {
    const { data: athlete } = await admin.from("athletes").select("name").eq("id", athleteId).maybeSingle()
    const athleteName = typeof athlete?.name === "string" ? athlete.name : "TOC athlete"
    const customerEmail =
      (session.customer_email ?? (session.customer_details as { email?: string } | null)?.email ?? "").trim() ||
      "unknown@example.com"

    let orderId: string | null = null
    if (paymentIntentId) {
      const { data: existingOrder } = await admin
        .from("orders")
        .select("id")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle()
      orderId = existingOrder?.id ?? null

      if (!orderId) {
        orderId = crypto.randomUUID()
        const { error: orderErr } = await admin.from("orders").insert({
          id: orderId,
          order_number: generateOrderNumber(),
          customer_email: customerEmail,
          email: customerEmail,
          customer_name: athleteName,
          ...orderShippingFields(athleteName, {}),
          shipping_address: {},
          shipping_method: { name: "TOC Reg", price: 0 },
          subtotal: amountCents / 100,
          shipping_cost: 0,
          tax: 0,
          discount: 0,
          total: amountCents / 100,
          status: "paid",
          stripe_payment_intent_id: paymentIntentId,
          stripe_session_id: session.id,
          promo_code: null,
          channel: "recruitnc",
          business: "nc_united",
        })

        if (orderErr && (orderErr as { code?: string }).code !== "23505") {
          console.error("[toc/register] order insert:", orderErr.message)
          orderId = null
        }
      }
    }

    const { error: updateError } = await admin
      .from("toc_invitations")
      .update({
        payment_status: "paid",
        paid_at: now,
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        order_id: orderId,
        updated_at: now,
      })
      .eq("id", invitationId)

    if (updateError) {
      console.error("[toc/register] mark paid:", updateError.message)
    }
  }

  return true
}
