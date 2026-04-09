import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { sendDropInApprovalEmail } from "@/lib/email/drop-in-approval-email"

/**
 * NC United calendar drop-in Checkout sessions carry metadata.drop_in_request_id.
 * Handles paid vs pending (async) the same way as the legacy /api/stripe/webhook calendar app.
 */
export async function processNcUnitedDropInCheckoutSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
  context: "checkout.session.completed" | "checkout.session.async_payment_succeeded",
): Promise<boolean> {
  const dropInRequestId = session.metadata?.drop_in_request_id
  if (!dropInRequestId) {
    return false
  }

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null

  const isPaid =
    context === "checkout.session.async_payment_succeeded" ? true : session.payment_status === "paid"

  if (!isPaid) {
    await admin
      .from("drop_in_requests")
      .update({
        payment_status: session.payment_status === "unpaid" ? "pending" : session.payment_status,
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dropInRequestId)

    return true
  }

  const paymentAmount = session.amount_total ?? 0
  const paymentCurrency = session.currency ?? "usd"

  const { data: updatedRequest, error: updateError } = await admin
    .from("drop_in_requests")
    .update({
      status: "approved",
      payment_status: "paid",
      payment_amount_cents: paymentAmount,
      payment_currency: paymentCurrency,
      payment_paid_at: new Date().toISOString(),
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dropInRequestId)
    .select(
      `
        *,
        events (
          title,
          start_date,
          start_time,
          location,
          drop_in_registration_link
        )
      `,
    )
    .single()

  if (updateError || !updatedRequest) {
    console.error("[nc-united calendar] drop_in_requests update after payment:", updateError)
    throw updateError ?? new Error("drop_in_requests update failed")
  }

  const row = updatedRequest as {
    parent_email?: string | null
    wrestler_name?: string | null
    events?: {
      title?: string | null
      start_date?: string | null
      start_time?: string | null
      location?: string | null
      drop_in_registration_link?: string | null
    } | null
    event_title?: string | null
    event_date?: string | null
  }

  const email = row.parent_email
  if (email) {
    try {
      await sendDropInApprovalEmail({
        recipientEmail: email,
        recipientName: row.wrestler_name || "Wrestler",
        eventTitle: row.events?.title || row.event_title || "NC United Practice",
        eventDate: row.events?.start_date || row.event_date || new Date().toISOString(),
        eventTime: row.events?.start_time,
        eventLocation: row.events?.location,
        registrationLink: row.events?.drop_in_registration_link,
      })
    } catch (e) {
      console.error("[nc-united calendar] drop-in approval email:", e)
    }
  }

  return true
}

export async function processNcUnitedDropInCheckoutFailed(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  const dropInRequestId = session.metadata?.drop_in_request_id
  if (!dropInRequestId) {
    return false
  }

  const { error } = await admin
    .from("drop_in_requests")
    .update({
      payment_status: "failed",
      status: "pending",
      stripe_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dropInRequestId)

  if (error) {
    console.error("[nc-united calendar] drop-in failed session update:", error)
  }
  return true
}
