/**
 * Shared Blue registration completion after Stripe payment (Checkout and/or Invoice).
 * Checkout session metadata and subscription metadata both carry signup_id from /api/blue/signup.
 */
import type Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"
import { findExistingAthlete } from "@/lib/athlete-duplicate-check"
import { getAthletesColumnNames, filterPayloadToSchema } from "@/lib/athletes-schema"
import { orderShippingFields } from "@/lib/order-shipping"
import { runBlueSignupPostPaymentSideEffects } from "@/lib/blue-post-signup-notify"

type AdminClient = SupabaseClient

function generateOrderNumber(): string {
  return "NC-" + Date.now().toString(36).toUpperCase().slice(-6) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export type BlueSignupCompleteParams = {
  signupId: string
  customerId: string | null
  subscriptionId: string | null
  /** Checkout Session id when known (links orders + blue_signups.stripe_session_id) */
  checkoutSessionId: string | null
  paymentIntentId: string | null
  amountTotalDollars: number
  customerEmail: string
  customerName: string
  /** From Stripe metadata when parent registered while signed in */
  hintPayerUserId?: string | null
  hintAthleteId?: string | null
}

/**
 * Mark signup paid, ensure membership + athlete, create store order (idempotent where possible).
 */
export async function completeBlueSignupAfterStripePayment(
  admin: AdminClient,
  getStripe: () => Stripe,
  params: BlueSignupCompleteParams,
): Promise<{ ok: boolean; error?: string }> {
  const {
    signupId,
    customerId,
    subscriptionId,
    checkoutSessionId,
    paymentIntentId,
    amountTotalDollars,
    customerEmail,
    customerName,
    hintPayerUserId,
    hintAthleteId,
  } = params

  const { data: signupBefore } = await admin
    .from("blue_signups")
    .select(
      "status, invite_id, parent_email, parent_first_name, parent_last_name, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_weight_class, athlete_cell_phone, athlete_email, athlete_gpa, athlete_wrestling_club, highest_achievement, tshirt_size",
    )
    .eq("id", signupId)
    .maybeSingle()

  const isFirstPayment = signupBefore?.status !== "paid"

  const { error: signupUpdateErr } = await admin
    .from("blue_signups")
    .update({
      status: "paid",
      ...(checkoutSessionId ? { stripe_session_id: checkoutSessionId } : {}),
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", signupId)

  if (signupUpdateErr) {
    console.error("[blue-signup-webhook-complete] update blue_signups:", signupUpdateErr.message)
    return { ok: false, error: signupUpdateErr.message }
  }

  let payerUserId: string | null = hintPayerUserId?.trim() || null
  let athleteId: string | undefined = hintAthleteId?.trim() || undefined
  let athleteName = ""

  if (subscriptionId) {
    const { data: existingMembership } = await admin
      .from("blue_memberships")
      .select("id, athlete_id, payer_user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle()

    if (existingMembership) {
      payerUserId = (existingMembership.payer_user_id as string) ?? null
      athleteId = existingMembership.athlete_id as string | undefined
    }

    if (!existingMembership) {
      const signupRow = signupBefore
      if (signupRow) {
        const parentEmail = (signupRow.parent_email as string)?.trim()?.toLowerCase() || ""
        const gradYear = Number(signupRow.athlete_graduation_year)
        athleteName = [
          (signupRow.athlete_first_name as string)?.trim(),
          (signupRow.athlete_last_name as string)?.trim(),
        ]
          .filter(Boolean)
          .join(" ")
          .trim()
        const highSchool = (signupRow.athlete_high_school as string)?.trim() || ""
        if (!payerUserId) {
          const { data: profileRow } = await admin
            .from("user_profiles")
            .select("user_id")
            .ilike("email", parentEmail)
            .limit(1)
            .maybeSingle()

          if (profileRow?.user_id) {
            payerUserId = profileRow.user_id as string
          }
        }

        if (!payerUserId && parentEmail) {
          const randomPassword = "blue-" + crypto.randomUUID() + "-" + Math.random().toString(36).slice(2, 14)
          const { data: newUser, error: createUserErr } = await admin.auth.admin.createUser({
            email: parentEmail,
            password: randomPassword,
            email_confirm: true,
            user_metadata: {
              full_name: [(signupRow.parent_first_name as string), (signupRow.parent_last_name as string)].filter(Boolean).join(" ").trim(),
              first_name: (signupRow.parent_first_name as string)?.trim(),
              last_name: (signupRow.parent_last_name as string)?.trim(),
              profile_type: "parent",
            },
          })
          if (!createUserErr && newUser?.user?.id) {
            payerUserId = newUser.user.id
            await admin.from("user_profiles").insert({
              user_id: newUser.user.id,
              email: newUser.user.email,
              full_name: newUser.user.user_metadata?.full_name ?? parentEmail,
              first_name: newUser.user.user_metadata?.first_name ?? null,
              last_name: newUser.user.user_metadata?.last_name ?? null,
              profile_type: "parent",
              role: "user",
              is_admin: false,
            })
          }
        }

        if (payerUserId && athleteName && Number.isFinite(gradYear) && gradYear >= 2020 && gradYear <= 2040) {
          const { athleteEnrichmentFromSignup } = await import("@/lib/blue-signup-enrich-athlete")
          const enrichment = athleteEnrichmentFromSignup(signupRow as import("@/lib/blue-signup-enrich-athlete").BlueSignupRow)
          if (!athleteId) {
            const existingAthlete = await findExistingAthlete(admin, {
              name: athleteName,
              graduationYear: gradYear,
              school: highSchool,
            })
            athleteId = existingAthlete?.id
          }
          if (!athleteId) {
            const columns = await getAthletesColumnNames(admin)
            const athletePayload = filterPayloadToSchema(
              {
                name: athleteName,
                firstName: (signupRow.athlete_first_name as string)?.trim(),
                lastName: (signupRow.athlete_last_name as string)?.trim(),
                graduationyear: gradYear,
                highschool: highSchool,
                weightclass: (signupRow.athlete_weight_class as string)?.trim() || null,
                ncUnitedTeam: "blue",
                recruiting_status: "Uncommitted",
                is_prospect: true,
                profile_verified: false,
                updated_at: new Date().toISOString(),
                ...enrichment,
              },
              columns,
            )
            const { data: newAthlete, error: athleteErr } = await admin
              .from("athletes")
              .insert(athletePayload)
              .select("id")
              .single()
            if (athleteErr || !newAthlete?.id) {
              console.error("[blue-signup-webhook-complete] create athlete failed", athleteErr?.message)
            } else {
              athleteId = newAthlete.id
            }
          } else {
            const columns = await getAthletesColumnNames(admin)
            const updatePayload = filterPayloadToSchema(
              { ...enrichment, ncUnitedTeam: "blue", updated_at: new Date().toISOString() },
              columns,
            )
            if (Object.keys(updatePayload).length > 1) {
              await admin.from("athletes").update(updatePayload).eq("id", athleteId)
            }
          }

          if (athleteId) {
            const startedAt = new Date().toISOString()
            let nextBillingAt: string | null = null
            if (subscriptionId) {
              try {
                const sub = await getStripe().subscriptions.retrieve(subscriptionId)
                if (sub.current_period_end) {
                  nextBillingAt = new Date(sub.current_period_end * 1000).toISOString()
                }
              } catch (_) {}
            }
            const { error: membershipErr } = await admin.from("blue_memberships").insert({
              athlete_id: athleteId,
              payer_user_id: payerUserId,
              status: "active",
              started_at: startedAt,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              signup_id: signupId,
              source: "invite",
              created_at: startedAt,
              updated_at: startedAt,
              ...(nextBillingAt && { next_billing_at: nextBillingAt }),
              ...((signupRow as { tshirt_size?: string }).tshirt_size && {
                tshirt_size: (signupRow as { tshirt_size?: string }).tshirt_size,
              }),
            })
            if (membershipErr) {
              console.error("[blue-signup-webhook-complete] membership insert failed", membershipErr.message)
            }
          }
        }
      }
    }
  }

  if (!athleteName && signupBefore) {
    athleteName = [
      (signupBefore.athlete_first_name as string)?.trim(),
      (signupBefore.athlete_last_name as string)?.trim(),
    ]
      .filter(Boolean)
      .join(" ")
      .trim()
  }

  let piForOrder = paymentIntentId
  if (!piForOrder && subscriptionId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] })
      const inv = (sub as { latest_invoice?: Stripe.Invoice | string }).latest_invoice
      if (inv && typeof inv === "object" && inv.payment_intent) {
        piForOrder =
          typeof inv.payment_intent === "string" ? inv.payment_intent : (inv.payment_intent as { id?: string })?.id ?? null
      }
    } catch (_) {}
  }

  const email = customerEmail || (signupBefore?.parent_email as string) || "blue-signup@placeholder.com"
  const name = customerName.trim() || "Blue member"

  let existingOrder = null as { id: string } | null
  if (checkoutSessionId) {
    const { data } = await admin.from("orders").select("id").eq("stripe_session_id", checkoutSessionId).maybeSingle()
    existingOrder = data
  }
  if (!existingOrder && piForOrder) {
    const { data } = await admin.from("orders").select("id").eq("stripe_payment_intent_id", piForOrder).maybeSingle()
    existingOrder = data
  }

  if (!existingOrder && (amountTotalDollars > 0 || piForOrder || subscriptionId)) {
    const orderNumber = generateOrderNumber()
    const orderId = crypto.randomUUID()
    const { error: orderErr } = await admin.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_email: email,
      email,
      customer_name: name,
      ...orderShippingFields(name, {}),
      shipping_address: {},
      shipping_method: { name: "Blue membership", price: 0, admin_category: "Blue Sub" },
      order_type: "blue_subscription",
      subtotal: amountTotalDollars,
      shipping_cost: 0,
      tax: 0,
      discount: 0,
      total: amountTotalDollars,
      status: "paid",
      channel: "blue",
      ...(checkoutSessionId ? { stripe_session_id: checkoutSessionId } : {}),
      stripe_payment_intent_id: piForOrder ?? null,
      promo_code: null,
    })
    if (!orderErr) {
      await admin.from("order_items").insert({
        order_id: orderId,
        product_id: null,
        product_name: "NC United Blue – Monthly",
        sku: syntheticOrderItemSku({
          productId: null,
          label: "NC United Blue – Monthly",
          dedupeKey: piForOrder ?? checkoutSessionId ?? signupId,
        }),
        variant: { color: "N/A", size: "N/A" },
        quantity: 1,
        price: amountTotalDollars,
        subtotal: amountTotalDollars,
        image_url: null,
      })
    } else if ((orderErr as { code?: string }).code !== "23505") {
      console.error("[blue-signup-webhook-complete] order insert:", orderErr.message)
    }
  }

  if (signupBefore) {
    await runBlueSignupPostPaymentSideEffects(admin, {
      signupId,
      payerUserId,
      athleteId: athleteId ?? null,
      parentEmail: (signupBefore.parent_email as string) || email,
      parentFirstName: (signupBefore.parent_first_name as string) || "",
      parentLastName: (signupBefore.parent_last_name as string) || "",
      athleteName: athleteName || name,
      amountDollars: amountTotalDollars,
      inviteId: (signupBefore.invite_id as string) ?? null,
      isFirstPayment,
    })
  }

  return { ok: true }
}
