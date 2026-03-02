"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function updateOrderAddress(
  orderId: string,
  address: { line1: string; line2?: string; city: string; state: string; zip: string }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createAdminClient()
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("shipping_address")
      .eq("id", orderId)
      .single()

    if (fetchError || !order) {
      return { success: false, error: fetchError?.message ?? "Order not found." }
    }

    const current = (order.shipping_address as Record<string, unknown>) || {}
    const updated = {
      ...current,
      address1: address.line1,
      line1: address.line1,
      address2: address.line2 ?? current.address2 ?? current.line2 ?? "",
      line2: address.line2 ?? current.address2 ?? current.line2 ?? null,
      city: address.city,
      state: address.state,
      zip: address.zip,
      zipCode: address.zip,
      postal_code: address.zip,
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ shipping_address: updated })
      .eq("id", orderId)

    if (updateError) return { success: false, error: updateError.message }
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update address"
    console.error("[update-order-address]", err)
    return { success: false, error: message }
  }
}
