import { StorePageClient } from "@/components/store-page-client"
import { createClient } from "@/lib/supabase/server"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

export default async function StorePage() {
  const supabase = await createClient()

  const { data: productsData, error } = await supabase
    .from("products")
    .select(`
      *,
      product_variants (*),
      product_images (url, display_order)
    `)
    .eq("in_stock", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching products:", error)
  }

  // Fetch all reviews to calculate ratings
  const { data: allReviews } = await supabase
    .from("product_reviews")
    .select("product_id, rating")

  // Calculate average rating per product
  const ratingsMap: Record<string, { sum: number; count: number }> = {}
  allReviews?.forEach((review: { product_id: string; rating: number }) => {
    const productId = review.product_id
    if (!ratingsMap[productId]) {
      ratingsMap[productId] = { sum: 0, count: 0 }
    }
    ratingsMap[productId].sum += review.rating
    ratingsMap[productId].count += 1
  })

  const products = (productsData || []).map((product: Record<string, unknown>) => {
    const variants = (product.product_variants as Record<string, unknown>[]) || []
    const images = ((product.product_images as Array<{ url: string; display_order?: number }>) || []).sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    )
    const totalStock = variants.reduce(
      (sum: number, v: Record<string, unknown>) =>
        sum + Number((v as { stock_quantity?: number }).stock_quantity ?? 0),
      0
    )
    const ratingData = ratingsMap[String(product.id)]
    const rating = ratingData && ratingData.count > 0 ? ratingData.sum / ratingData.count : 0
    const firstVariant = variants[0] as { sku?: string } | undefined

    return {
      ...product,
      stock_quantity: totalStock,
      rating,
      sku: firstVariant?.sku ?? `NC-${String(product.id).slice(0, 8)}`,
      variants,
      images,
      image_url: product.image_url,
    }
  })

  console.log("[v0] Products fetched:", products.length)
  console.log(
    "[v0] Product categories:",
    products.map((p: Record<string, unknown>) => ({ name: p.name, category: p.category })),
  )

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <StorePageClient initialProducts={products} />
    </Suspense>
  )
}
