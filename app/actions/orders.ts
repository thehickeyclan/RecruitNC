"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function updateOrderStatus(
  orderId: string,
  newStatus: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)
    if (error) return { success: false, error: error.message }
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
  trackingNumber: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createAdminClient()
    const trackingInfo = { carrier, tracking_number: trackingNumber }
    const { error } = await supabase
      .from("orders")
      .update({
        status: "shipped",
        tracking_info: trackingInfo,
      })
      .eq("id", orderId)
    if (error) return { success: false, error: error.message }
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

    const orderWithItems = {
      ...order,
      order_items: orderItems ?? [],
    }

    return { success: true, order: orderWithItems }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load order"
    console.error("[orders] getOrderDetails:", err)
    return { success: false, error: message }
  }
}
