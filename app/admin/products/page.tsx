import { createClient } from "@/lib/supabase/server"
import { AdminProductsClient } from "@/components/admin-products-client"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
  const supabase = await createClient()

  const { data: productsData, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_variants (*)
    `
    )
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[admin/products] Error fetching products:", error)
  }

  const products = (productsData || []).map((product: any) => {
    const variants = product.product_variants || []
    const totalStock = variants.reduce(
      (sum: number, v: any) => sum + (v.stock_quantity || 0),
      0
    )

    let status: "active" | "draft" | "out-of-stock" = "active"
    if (!product.in_stock) {
      status = "draft"
    } else if (totalStock === 0) {
      status = "out-of-stock"
    }

    return {
      id: String(product.id),
      name: product.name,
      sku: variants[0]?.sku || `NC-${product.id}`,
      status,
      price: Number(product.price),
      stock: totalStock,
      image: product.image_url ?? null,
      featured: Boolean(product.featured ?? product.is_featured),
      category: product.category || "uncategorized",
    }
  })

  return <AdminProductsClient products={products} />
}
