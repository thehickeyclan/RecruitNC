import { notFound } from "next/navigation"
import { ProductHeader } from "@/components/product-header"
import { ProductDetailClient } from "@/components/product-detail-client"
import { CustomerReviews } from "@/components/customer-reviews"
import { RelatedProducts } from "@/components/related-products"
import { createClient } from "@/lib/supabase/server"
import { getColorHex } from "@/lib/color-utils"
import { getProductReviews } from "@/app/actions/reviews"
import { sortSizes } from "@/lib/size-utils"

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
    .eq("id", id)
    .eq("in_stock", true)
    .eq("show_in_public_store", true)
    .single()

  if (error || !product) {
    notFound()
  }

  const { data: relatedProductsData } = await supabase
    .from("products")
    .select(
      `
      *,
      product_variants (*),
      product_images (*)
    `
    )
    .eq("category", product.category)
    .eq("in_stock", true)
    .eq("show_in_public_store", true)
    .neq("id", id)
    .limit(4)

  const { reviews, averageRating, totalReviews } = await getProductReviews(id)

  const variants = (product.product_variants as any[]) || []
  const productImages = (product.product_images as any[]) || []

  const imagesByColor: Record<string, string[]> = {}
  const generalImages: string[] = []

  productImages
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .forEach((img: any) => {
      if (img.color) {
        if (!imagesByColor[img.color]) {
          imagesByColor[img.color] = []
        }
        imagesByColor[img.color].push(img.url)
      } else {
        generalImages.push(img.url)
      }
    })

  const defaultImages =
    generalImages.length > 0 ? generalImages : [product.image_url].filter(Boolean)

  const totalStock = variants.reduce(
    (sum: number, v: any) => sum + (v.stock_quantity || 0),
    0
  )

  const details = {
    sku: variants[0]?.sku ?? `NC-${String(product.id).slice(0, 8)}`,
    description: product.description ?? "",
    features: [
      "Premium quality materials",
      "Comfortable fit for all-day wear",
      "Official NC United branding",
      "Machine washable",
    ],
    colors: variants.reduce((acc: any[], v: any) => {
      if (v.color && !acc.find((c: any) => c.name === v.color)) {
        const colorHasStock = variants.some(
          (variant: any) =>
            variant.color === v.color && (variant.stock_quantity ?? 0) > 0
        )
        acc.push({
          name: v.color,
          hex: getColorHex(v.color),
          inStock: colorHasStock,
        })
      }
      return acc
    }, []),
    availableSizes: sortSizes(
      [...new Set(variants.map((v: any) => v.size).filter(Boolean))]
    ),
    stockStatus:
      totalStock > 10 ? "in-stock" : totalStock > 0 ? "low-stock" : "out-of-stock",
    reviewCount: totalReviews,
    imagesByColor,
    defaultImages,
    reviews,
    variants,
  }

  const relatedProductIds = (relatedProductsData ?? []).map((p: any) => p.id)
  const { data: relatedReviews } =
    relatedProductIds.length > 0
      ? await supabase
          .from("product_reviews")
          .select("product_id, rating")
          .in("product_id", relatedProductIds)
      : { data: [] }

  const relatedRatingsMap: Record<string, { sum: number; count: number }> = {}
  ;(relatedReviews ?? []).forEach((review: any) => {
    const productId = String(review.product_id)
    if (!relatedRatingsMap[productId]) {
      relatedRatingsMap[productId] = { sum: 0, count: 0 }
    }
    relatedRatingsMap[productId].sum += Number(review.rating ?? 0)
    relatedRatingsMap[productId].count += 1
  })

  const relatedProducts = (relatedProductsData ?? []).map((p: any) => {
    const imgs = (p.product_images ?? []) as any[]
    const sortedImages = imgs.sort(
      (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)
    )
    const firstImage =
      sortedImages.length > 0 ? sortedImages[0]?.url : p.image_url ?? ""

    const ratingData = relatedRatingsMap[String(p.id)]
    const rating =
      ratingData && ratingData.count > 0
        ? ratingData.sum / ratingData.count
        : 0

    return {
      ...p,
      id: p.id,
      name: p.name,
      price: p.price,
      image: firstImage || "/placeholder.svg",
      category: p.category,
      rating,
      sizes: [
        ...new Set(
          (p.product_variants ?? []).map((v: any) => v.size).filter(Boolean)
        ),
      ],
      stock_quantity: (p.product_variants ?? []).reduce(
        (sum: number, v: any) => sum + (v.stock_quantity ?? 0),
        0
      ),
    }
  })

  return (
    <div className="min-h-screen bg-background">
      <ProductHeader productName={product.name} category={product.category} />

      <div className="container mx-auto px-4 py-8">
        <ProductDetailClient
          product={{
            ...product,
            stock_quantity: totalStock,
            rating: averageRating,
            variants,
          }}
          details={details}
        />

        <CustomerReviews
          reviews={reviews}
          averageRating={averageRating}
          productId={id}
        />

        <RelatedProducts products={relatedProducts} />
      </div>
    </div>
  )
}
