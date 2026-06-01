"use server"

import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendOrderStatusEmail } from "@/lib/email"
import {
  nhscaDualsRegistrationOrderLines,
  nhscaDualsRegistrationOrderSummary,
  type NhscaDuals2026Registration,
} from "@/lib/nhsca-duals-2026-registrations"
import { isGenericPlaceholderOrderItemName } from "@/lib/national-team-order-items"
import {
  hydrateOrderCustomerFromStripe,
  overlayOrderFromStripeForDisplay,
} from "@/lib/store/hydrate-order-from-stripe"
import { resolveAdminOrderDisplay } from "@/lib/admin/resolve-order-display"
import { reconcileStoreOrderItemsFromStripe } from "@/lib/store/reconcile-order-items-from-stripe"
import { analyzeStoreOrderIntegrity } from "@/lib/store/store-order-integrity"
import { buildOrderReceiptPreview } from "@/lib/store/order-receipt-preview"
import { fetchMergedStoreMetadata } from "@/lib/store/stripe-legacy-metadata"

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key?.trim()) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(key)
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  options?: { sendEmail?: boolean }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createAdminClient()
    
    // Get order details for email
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("order_number, customer_email, customer_name, tracking_info, status")
      .eq("id", orderId)
      .single()
    
    if (fetchError || !order) {
      return { success: false, error: fetchError?.message || "Order not found" }
    }
    
    // Don't send email if status hasn't changed
    const shouldSendEmail = options?.sendEmail !== false && 
      order.status !== newStatus &&
      ["shipped", "delivered", "processing"].includes(newStatus)
    
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)
    
    if (error) return { success: false, error: error.message }
    
    // Send status notification email
    if (shouldSendEmail && order.customer_email) {
      const trackingInfo = order.tracking_info as { carrier?: string; tracking_number?: string } | null
      
      try {
        await sendOrderStatusEmail({
          orderNumber: order.order_number || orderId,
          customerName: order.customer_name || "Customer",
          customerEmail: order.customer_email,
          status: newStatus as "shipped" | "delivered" | "processing",
          trackingNumber: trackingInfo?.tracking_number,
          trackingCarrier: trackingInfo?.carrier,
          orderUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"}/order-status?order=${order.order_number || orderId}`,
        })
      } catch (emailErr) {
        // Log email error but don't fail the status update
        console.error("[orders] Failed to send status email:", emailErr)
      }
    }
    
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update order status"
    console.error("[orders] updateOrderStatus:", err)
    return { success: false, error: message }
  }
}

export async function deleteOrder(orderId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createAdminClient()
    const { error: itemsError } = await supabase.from("order_items").delete().eq("order_id", orderId)
    if (itemsError) {
      return { success: false, error: itemsError.message }
    }
    const { error: orderError } = await supabase.from("orders").delete().eq("id", orderId)
    if (orderError) {
      return { success: false, error: orderError.message }
    }
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete order"
    console.error("[orders] deleteOrder:", err)
    return { success: false, error: message }
  }
}

export async function addTrackingInfo(
  orderId: string,
  carrier: string,
  trackingNumber: string,
  options?: { sendEmail?: boolean }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createAdminClient()
    
    // Get order details for email
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("order_number, customer_email, customer_name")
      .eq("id", orderId)
      .single()
    
    if (fetchError || !order) {
      return { success: false, error: fetchError?.message || "Order not found" }
    }
    
    const trackingInfo = { carrier, tracking_number: trackingNumber }
    const { error } = await supabase
      .from("orders")
      .update({
        status: "shipped",
        tracking_info: trackingInfo,
      })
      .eq("id", orderId)
    
    if (error) return { success: false, error: error.message }
    
    // Send shipped notification email with tracking
    if (options?.sendEmail !== false && order.customer_email) {
      try {
        await sendOrderStatusEmail({
          orderNumber: order.order_number || orderId,
          customerName: order.customer_name || "Customer",
          customerEmail: order.customer_email,
          status: "shipped",
          trackingNumber,
          trackingCarrier: carrier,
          orderUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"}/order-status?order=${order.order_number || orderId}`,
        })
      } catch (emailErr) {
        console.error("[orders] Failed to send shipped email:", emailErr)
      }
    }
    
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add tracking"
    console.error("[orders] addTrackingInfo:", err)
    return { success: false, error: message }
  }
}

export async function addOrderNote(
  orderId: string,
  note: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createAdminClient()
    const { data: order } = await supabase.from("orders").select("notes").eq("id", orderId).single()
    const existing = (order as any)?.notes ?? ""
    const appended = existing ? `${existing}\n[${new Date().toISOString()}] ${note}` : `[${new Date().toISOString()}] ${note}`
    const { error } = await supabase.from("orders").update({ notes: appended }).eq("id", orderId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add note"
    console.error("[orders] addOrderNote:", err)
    return { success: false, error: message }
  }
}

export async function getOrderDetails(orderId: string): Promise<
  | { success: true; order: any }
  | { success: false; error: string }
> {
  try {
    const supabase = createAdminClient()
    const isUuid = /^[0-9a-f-]{36}$/i.test(orderId)

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq(isUuid ? "id" : "order_number", orderId)
      .single()

    if (orderError || !order) {
      return { success: false, error: orderError?.message ?? "Order not found." }
    }

    try {
      await hydrateOrderCustomerFromStripe(supabase, order as Record<string, unknown>)
      const { data: refreshed } = await supabase.from("orders").select("*").eq("id", order.id).single()
      if (refreshed) Object.assign(order, refreshed)
      await overlayOrderFromStripeForDisplay(order as Record<string, unknown>)
    } catch (hydrateErr) {
      console.warn("[orders] hydrateOrderCustomerFromStripe:", hydrateErr)
      try {
        await overlayOrderFromStripeForDisplay(order as Record<string, unknown>)
      } catch {
        // ignore
      }
    }

    if (order.stripe_payment_intent_id) {
      try {
        await reconcileStoreOrderItemsFromStripe(supabase, order.id, getStripe())
      } catch (reconcileErr) {
        console.warn("[orders] reconcileStoreOrderItemsFromStripe:", reconcileErr)
      }
    }

    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select(
        `
        *,
        product:products (
          name,
          image_url,
          product_images (url, display_order)
        )
      `,
      )
      .eq("order_id", order.id)
      .order("created_at")

    if (itemsError) {
      return { success: false, error: itemsError.message }
    }

    let nationalTeamRegistration: Record<string, unknown> | null = null
    let nationalTeamLineItems: { name: string; amount_cents: number; quantity?: number }[] | null = null
    let nationalTeamSummary: string | null = null

    const { data: ntReg } = await supabase
      .from("national_team_event_registrations")
      .select(
        "id, athlete_first_name, athlete_last_name, event_slug, reg_fee_cents, apparel_fee_cents, singlet_size, shorts_size, shirt_size, checkout_lines"
      )
      .eq("order_id", order.id)
      .maybeSingle()

    if (ntReg) {
      nationalTeamRegistration = ntReg as Record<string, unknown>
      nationalTeamLineItems = nhscaDualsRegistrationOrderLines(ntReg as Parameters<typeof nhscaDualsRegistrationOrderLines>[0])
      nationalTeamSummary = nhscaDualsRegistrationOrderSummary(ntReg as Parameters<typeof nhscaDualsRegistrationOrderSummary>[0])
    }

    const itemsList = orderItems ?? []
    const displayUsesNationalTeam =
      Boolean(nationalTeamLineItems?.length) &&
      (itemsList.length === 0 ||
        itemsList.every((i) => isGenericPlaceholderOrderItemName((i as { product_name?: string }).product_name)))

    let dropInRequest: Record<string, unknown> | null = null
    if (order.stripe_session_id || order.stripe_payment_intent_id) {
      let dropInQuery = supabase
        .from("drop_in_requests")
        .select(
          `
          *,
          events ( title, start_date, start_time, location )
        `,
        )
        .limit(1)
      if (order.stripe_session_id) {
        dropInQuery = dropInQuery.eq("stripe_session_id", order.stripe_session_id)
      } else {
        dropInQuery = dropInQuery.eq("stripe_payment_intent_id", order.stripe_payment_intent_id as string)
      }
      const { data: dropInRow } = await dropInQuery.maybeSingle()
      if (dropInRow) dropInRequest = dropInRow as Record<string, unknown>
    }

    let blueSignup: Record<string, unknown> | null = null
    if (order.stripe_session_id) {
      const { data: signupRow } = await supabase
        .from("blue_signups")
        .select(
          "parent_email, parent_first_name, parent_last_name, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school",
        )
        .eq("stripe_session_id", order.stripe_session_id)
        .maybeSingle()
      if (signupRow) blueSignup = signupRow as Record<string, unknown>
    }

    let blueMembership: Record<string, unknown> | null = null
    const membershipEmail =
      (blueSignup?.parent_email as string | undefined)?.trim() ||
      (order.customer_email as string | undefined)?.trim() ||
      (order.email as string | undefined)?.trim()
    if (membershipEmail) {
      const { data: membershipRow } = await supabase
        .from("blue_memberships")
        .select("status, next_billing_at, stripe_subscription_id")
        .eq("parent_email", membershipEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (membershipRow) blueMembership = membershipRow as Record<string, unknown>
    }

    let spartanDonation: Record<string, unknown> | null = null
    const sessionId = order.stripe_session_id as string | undefined
    if (sessionId?.startsWith("cs_")) {
      const { data: donationRow } = await supabase
        .from("spartan_donations")
        .select("id, donor_name, athlete_code, amount_cents, campaign_slug")
        .eq("id", sessionId)
        .maybeSingle()
      if (donationRow) spartanDonation = donationRow as Record<string, unknown>
    }

    let storeIntegrity: Parameters<typeof resolveAdminOrderDisplay>[0]["storeIntegrity"] = null
    if (order.stripe_payment_intent_id && !displayUsesNationalTeam && !spartanDonation && !dropInRequest) {
      try {
        const { meta } = await fetchMergedStoreMetadata(getStripe(), order.stripe_payment_intent_id as string)
        const { data: productCache } = await supabase.from("products").select("id, name, image_url").limit(5000)
        const itemsList = orderItems ?? []
        const dbQty = itemsList.reduce((s, i) => s + Math.max(1, Number((i as { quantity?: number }).quantity ?? 1)), 0)
        const integrity = analyzeStoreOrderIntegrity({
          meta,
          dbItemCount: itemsList.length,
          dbQuantitySum: dbQty,
          subtotal: Number(order.subtotal ?? 0),
          productsList: productCache ?? [],
        })
        if (integrity.fulfillmentUnsafe) {
          storeIntegrity = {
            fulfillmentUnsafe: true,
            summary: integrity.summary,
            detail: integrity.detail,
          }
        }
      } catch (integrityErr) {
        console.warn("[orders] analyzeStoreOrderIntegrity:", integrityErr)
      }
    }

    const orderWithItems = {
      ...order,
      order_items: orderItems ?? [],
      national_team_registration: nationalTeamRegistration,
      national_team_line_items: nationalTeamLineItems,
      national_team_summary: nationalTeamSummary,
      display_uses_national_team: displayUsesNationalTeam,
    }

    const adminDisplay = resolveAdminOrderDisplay({
      order: orderWithItems,
      nationalTeamRegistration: nationalTeamRegistration as NhscaDuals2026Registration | null,
      dropInRequest: dropInRequest as Parameters<typeof resolveAdminOrderDisplay>[0]["dropInRequest"],
      blueSignup: blueSignup as Parameters<typeof resolveAdminOrderDisplay>[0]["blueSignup"],
      blueMembership: blueMembership as Parameters<typeof resolveAdminOrderDisplay>[0]["blueMembership"],
      spartanDonation: spartanDonation as Parameters<typeof resolveAdminOrderDisplay>[0]["spartanDonation"],
      useNationalTeamDisplay: displayUsesNationalTeam,
      storeIntegrity,
    })

    let receiptLog: { sent_at?: string | null; recipient_email?: string | null } | null = null
    try {
      const { data: receiptRow } = await supabase
        .from("order_receipt_emails")
        .select("sent_at, recipient_email")
        .eq("order_id", order.id)
        .maybeSingle()
      if (receiptRow) receiptLog = receiptRow
    } catch {
      // table may not exist in some envs
    }

    const receiptPreview = buildOrderReceiptPreview(order, itemsList, receiptLog)

    return {
      success: true,
      order: {
        ...orderWithItems,
        admin_display: adminDisplay,
        receipt_preview: receiptPreview,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load order"
    console.error("[orders] getOrderDetails:", err)
    return { success: false, error: message }
  }
}
