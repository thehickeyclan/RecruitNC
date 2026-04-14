import "server-only"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"

const stripeSecret = process.env.STRIPE_SECRET_KEY

function getStripe(): Stripe {
  if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(stripeSecret)
}

/** Pause a Stripe subscription and set resume_at in DB. */
export async function pauseBlueSubscription(
  membershipId: string,
  resumeAt: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const { data: row, error: fetchErr } = await admin
    .from("blue_memberships")
    .select("id, stripe_subscription_id, status")
    .eq("id", membershipId)
    .single()
  if (fetchErr || !row?.stripe_subscription_id) {
    return { ok: false, error: "Membership not found or no Stripe subscription" }
  }
  if (row.status !== "active" && row.status !== "pending_payment") {
    return { ok: false, error: "Only active subscriptions can be paused" }
  }
  const stripe = getStripe()
  try {
    await stripe.subscriptions.update(row.stripe_subscription_id as string, {
      pause_collection: { behavior: "void" },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
  const resumeAtIso = new Date(resumeAt).toISOString()
  const { error: updateErr } = await admin
    .from("blue_memberships")
    .update({
      status: "paused",
      resume_at: resumeAtIso,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membershipId)
  if (updateErr) return { ok: false, error: updateErr.message }
  return { ok: true }
}

/** Resume a paused Stripe subscription and clear resume_at in DB. */
export async function resumeBlueSubscription(membershipId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const { data: row, error: fetchErr } = await admin
    .from("blue_memberships")
    .select("id, stripe_subscription_id, status")
    .eq("id", membershipId)
    .single()
  if (fetchErr || !row?.stripe_subscription_id) {
    return { ok: false, error: "Membership not found or no Stripe subscription" }
  }
  if (row.status !== "paused") {
    return { ok: false, error: "Subscription is not paused" }
  }
  const stripe = getStripe()
  try {
    await stripe.subscriptions.resume(row.stripe_subscription_id as string)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
  const { error: updateErr } = await admin
    .from("blue_memberships")
    .update({
      status: "active",
      resume_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membershipId)
  if (updateErr) return { ok: false, error: updateErr.message }
  return { ok: true }
}

/** Cancel: at period end (default) or immediately. */
export async function cancelBlueSubscription(
  membershipId: string,
  immediately: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const { data: row, error: fetchErr } = await admin
    .from("blue_memberships")
    .select("id, stripe_subscription_id, status")
    .eq("id", membershipId)
    .single()
  if (fetchErr || !row?.stripe_subscription_id) {
    return { ok: false, error: "Membership not found or no Stripe subscription" }
  }
  const stripe = getStripe()
  try {
    if (immediately) {
      await stripe.subscriptions.cancel(row.stripe_subscription_id as string)
      await admin
        .from("blue_memberships")
        .update({
          status: "cancelled",
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", membershipId)
    } else {
      await stripe.subscriptions.update(row.stripe_subscription_id as string, {
        cancel_at_period_end: true,
      })
      // DB status stays active until Stripe sends subscription.deleted or subscription.updated with cancel_at_period_end; webhook will set cancelled when period ends
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
  return { ok: true }
}

export async function retryBlueSubscriptionPayment(
  membershipId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const { data: row, error: fetchErr } = await admin
    .from("blue_memberships")
    .select("id, stripe_subscription_id, status")
    .eq("id", membershipId)
    .single()
  if (fetchErr || !row?.stripe_subscription_id) {
    return { ok: false, error: "Membership not found or no Stripe subscription" }
  }
  const stripe = getStripe()
  try {
    const invoices = await stripe.invoices.list({
      subscription: row.stripe_subscription_id as string,
      status: "open",
      limit: 1,
    })
    if (!invoices.data.length) {
      return { ok: false, error: "no_open_invoice" }
    }
    await stripe.invoices.pay(invoices.data[0].id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
  // Do NOT update blue_memberships.status here.
  // The invoice.paid webhook owns that transition.
  return { ok: true }
}

/** Run resume for all paused memberships where resume_at <= today. */
export async function runResumeDueSubscriptions(): Promise<{ resumed: number; errors: string[] }> {
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const endOfToday = `${today}T23:59:59.999Z`
  const { data: rows, error } = await admin
    .from("blue_memberships")
    .select("id")
    .eq("status", "paused")
    .not("resume_at", "is", null)
    .lte("resume_at", endOfToday)
  if (error || !rows?.length) return { resumed: 0, errors: [] }
  const errors: string[] = []
  let resumed = 0
  for (const r of rows) {
    const result = await resumeBlueSubscription(r.id)
    if (result.ok) resumed++
    else errors.push(result.error)
  }
  return { resumed, errors }
}
