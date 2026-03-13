"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "product"
}

export async function createProduct(payload: {
  name: string
  description: string
  category: string
  price: number
  comparePrice?: number
  sku?: string
  status: string
  featured: boolean
  images: Array<{ url: string } | string>
  hasVariants: boolean
  variants?: Array<{
    sku: string
    size: string
    color: string
    colorHex?: string
    priceAdjustment: number
    stock: number
    active: boolean
  }>
  trackInventory: boolean
  requiresShipping: boolean
  showInPublicStore?: boolean
}): Promise<
  | { success: true; data: { id: string } }
  | { success: false; error: string }
> {
  try {
    const supabase = createAdminClient()
    const inStock = payload.status === "active"
    const showInPublicStore = payload.showInPublicStore !== false
    const imageList = Array.isArray(payload.images) ? payload.images : []
    const firstUrl = imageList[0]
    const firstImageUrl =
      typeof firstUrl === "string" ? firstUrl : (firstUrl as { url: string })?.url ?? null

    const slug = `${slugify(payload.name)}-${Date.now()}`

    const { data: inserted, error: insertError } = await supabase
      .from("products")
      .insert({
        name: payload.name,
        description: payload.description || null,
        category: payload.category,
        price: payload.price,
        in_stock: inStock,
        featured: payload.featured,
        image_url: firstImageUrl,
        show_in_public_store: showInPublicStore,
        slug,
      })
      .select("id")
      .single()

    if (insertError || !inserted) {
      const msg = insertError?.message ?? "Failed to create product."
      console.error("[RecruitNC] createProduct insert error:", insertError?.code, msg, insertError?.details)
      return { success: false, error: msg }
    }

    const productId = String(inserted.id)

    const imageRows = imageList
      .filter((img) => {
        const url = typeof img === "string" ? img : (img as { url: string })?.url
        return url && String(url).trim()
      })
      .map((img, i) => ({
        product_id: productId,
        url: typeof img === "string" ? img : (img as { url: string }).url,
        color: null,
        display_order: i,
      }))

    if (imageRows.length > 0) {
      const { error: imagesError } = await supabase.from("product_images").insert(imageRows)
      if (imagesError) {
        return { success: false, error: imagesError.message }
      }
    }

    if (payload.hasVariants && payload.variants?.length) {
      const variantRows = payload.variants
        .filter((v) => v.active !== false)
        .map((v) => ({
          product_id: productId,
          color: v.color,
          size: v.size,
          sku: v.sku || `${payload.sku ?? "NCU"}-${v.color}-${v.size}`.replace(/\s/g, "-"),
          stock_quantity: payload.trackInventory ? Math.max(0, v.stock) : 0,
        }))
      if (variantRows.length > 0) {
        const { error: variantsError } = await supabase.from("product_variants").insert(variantRows)
        if (variantsError) {
          return { success: false, error: variantsError.message }
        }
      }
    }

    return { success: true, data: { id: productId } }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create product"
    console.error("[products] createProduct:", err)
    return { success: false, error: message }
  }
}

export async function getProduct(
  productId: string
): Promise<
  | { success: true; data: any }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient()
    const { data: product, error } = await supabase
      .from("products")
      .select(
        `
        *,
        product_variants (*),
        product_images (*)
      `
      )
      .eq("id", productId)
      .single()

    if (error || !product) {
      return { success: false, error: error?.message ?? "Product not found." }
    }

    const variants = (product.product_variants || []) as any[]
    const firstSku = variants[0]?.sku ?? ""

    const data = {
      ...product,
      slug: firstSku || product.slug || String(product.id),
      product_images: (product.product_images || []).sort(
        (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)
      ),
      product_variants: variants,
    }

    return { success: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load product"
    console.error("[products] getProduct:", err)
    return { success: false, error: message }
  }
}

export async function updateProduct(
  productId: string,
  payload: {
    name: string
    description: string
    category: string
    price: number
    comparePrice?: number
    sku?: string
    status: string
    featured: boolean
    images: Array<{ url: string; color?: string }>
    hasVariants: boolean
    variants?: Array<{
      sku: string
      size: string
      color: string
      colorHex?: string
      priceAdjustment: number
      stock: number
      active: boolean
    }>
trackInventory: boolean
    requiresShipping: boolean
    urlHandle?: string
    showInPublicStore?: boolean
  }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createAdminClient()

    const inStock = payload.status === "active"
    const firstImage = payload.images?.[0]?.url ?? null
    const showInPublicStore = payload.showInPublicStore !== false

    const { error: updateError } = await supabase
      .from("products")
      .update({
        name: payload.name,
        description: payload.description || null,
        category: payload.category,
        price: payload.price,
        in_stock: inStock,
        featured: payload.featured,
        image_url: firstImage,
        show_in_public_store: showInPublicStore,
      })
      .eq("id", productId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    const { error: deleteImagesError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId)

    if (deleteImagesError) {
      console.error("[products] delete product_images:", deleteImagesError)
    }

    if (payload.images?.length) {
      const imageRows = payload.images.map((img, i) => ({
        product_id: productId,
        url: img.url,
        color: img.color ?? null,
        display_order: i,
      }))
      const { error: insertImagesError } = await supabase
        .from("product_images")
        .insert(imageRows)
      if (insertImagesError) {
        return { success: false, error: insertImagesError.message }
      }
    }

    const { error: deleteVariantsError } = await supabase
      .from("product_variants")
      .delete()
      .eq("product_id", productId)

    if (deleteVariantsError) {
      console.error("[products] delete product_variants:", deleteVariantsError)
    }

    if (payload.hasVariants && payload.variants?.length) {
      const variantRows = payload.variants
        .filter((v) => v.active !== false)
        .map((v) => ({
          product_id: productId,
          color: v.color,
          size: v.size,
          sku: v.sku || `${payload.sku}-${v.color}-${v.size}`.replace(/\s/g, "-"),
          stock_quantity: payload.trackInventory ? Math.max(0, v.stock) : 0,
        }))
      if (variantRows.length > 0) {
        const { error: insertVariantsError } = await supabase
          .from("product_variants")
          .insert(variantRows)
        if (insertVariantsError) {
          return { success: false, error: insertVariantsError.message }
        }
      }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update product"
    console.error("[products] updateProduct:", err)
    return { success: false, error: message }
  }
}
