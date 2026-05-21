"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendOrderStatusEmail } from "@/lib/email"
import {
  nhscaDualsRegistrationOrderLines,
  nhscaDualsRegistrationOrderSummary,
} from "@/lib/nhsca-duals-2026-registrations"
import { isGenericPlaceholderOrderItemName } from "@/lib/national-team-order-items"

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

    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
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

    const orderWithItems = {
      ...order,
      order_items: orderItems ?? [],
      national_team_registration: nationalTeamRegistration,
      national_team_line_items: nationalTeamLineItems,
      national_team_summary: nationalTeamSummary,
      display_uses_national_team: displayUsesNationalTeam,
    }

    return { success: true, order: orderWithItems }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load order"
    console.error("[orders] getOrderDetails:", err)
    return { success: false, error: message }
  }
}
