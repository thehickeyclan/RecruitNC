import type { SupabaseClient } from "@supabase/supabase-js"

type InventoryOperationResult =
  | { ok: true }
  | { ok: false; error: string }

function friendlyInventoryError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes("insufficient inventory")) {
    return "One or more items just sold out or no longer have the requested quantity. Please review your cart."
  }
  if (normalized.includes("could not find the function") || normalized.includes("schema cache")) {
    return "Store inventory protection is not configured. Please contact NC United before retrying checkout."
  }
  return message || "Inventory could not be verified."
}

export async function reserveStoreOrderInventory(
  supabase: SupabaseClient,
  orderId: string,
): Promise<InventoryOperationResult> {
  const { error } = await supabase.rpc("reserve_store_order_inventory", {
    p_order_id: orderId,
  })
  if (error) {
    console.error("[store] reserve inventory:", error)
    return { ok: false, error: friendlyInventoryError(error.message) }
  }
  return { ok: true }
}

export async function consumeStoreOrderInventory(
  supabase: SupabaseClient,
  orderId: string,
): Promise<InventoryOperationResult> {
  const { error } = await supabase.rpc("consume_store_order_inventory", {
    p_order_id: orderId,
  })
  if (error) {
    console.error("[store] consume inventory:", error)
    return { ok: false, error: friendlyInventoryError(error.message) }
  }
  return { ok: true }
}

export async function releaseStoreOrderInventory(
  supabase: SupabaseClient,
  orderId: string,
): Promise<void> {
  const { error } = await supabase.rpc("release_store_order_inventory", {
    p_order_id: orderId,
  })
  if (error) console.error("[store] release inventory:", error)
}
