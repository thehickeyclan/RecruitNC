"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"

export type InventoryVariant = {
  id: string
  sku: string
  size: string
  color: string
  stock_quantity: number
}

export type InventoryProduct = {
  id: string
  name: string
  image_url: string | null
  category: string | null
  variants: InventoryVariant[]
  total_stock: number
}

export async function getInventoryProducts(): Promise<InventoryProduct[]> {
  const auth = await requireAdmin()
  if (!auth.ok) {
    console.warn("[inventory] unauthorized inventory read")
    return []
  }

  const supabase = await createClient()

  const { data: productsData, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      image_url,
      category,
      product_variants (id, sku, size, color, stock_quantity)
    `
    )
    .order("name")

  if (error) {
    console.error("[inventory] getInventoryProducts:", error)
    return []
  }

  const products: InventoryProduct[] = (productsData || []).map((p: any) => {
    const variants = (p.product_variants || []).map((v: any, i: number) => ({
      id: v.id != null ? String(v.id) : `${p.id}-v-${i}`,
      sku: v.sku ?? "",
      size: v.size ?? "",
      color: v.color ?? "",
      stock_quantity: Number(v.stock_quantity ?? 0),
    }))
    const total_stock = variants.reduce((sum: number, v: InventoryVariant) => sum + v.stock_quantity, 0)

    return {
      id: String(p.id),
      name: p.name ?? "",
      image_url: p.image_url ?? null,
      category: p.category ?? null,
      variants,
      total_stock,
    }
  })

  return products
}

export async function updateVariantStock(
  variantId: string,
  newQuantity: number
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: auth.error }

    if (newQuantity < 0) {
      return { success: false, error: "Stock quantity cannot be negative" }
    }
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("product_variants")
      .update({ stock_quantity: Math.floor(newQuantity) })
      .eq("id", variantId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update stock"
    console.error("[inventory] updateVariantStock:", err)
    return { success: false, error: message }
  }
}
