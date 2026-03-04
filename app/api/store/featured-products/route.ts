import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * API Route to fetch featured products from the NC United Store
 * Queries the products table with joins to product_images for images
 * Based on the store schema documentation
 */
export async function GET(request: Request) {
  try {
    const adminClient = createAdminClient()
    
    // Query random in-stock products with images
    // Using the actual store schema: products table with BIGINT IDs
    // We show random products instead of just featured ones - all products are good!
    const { data: products, error } = await adminClient
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        slug,
        category,
        featured,
        in_stock,
        display_order,
        product_images (
          url,
          display_order,
          color
        )
      `)
      .eq("in_stock", true)
      .eq("show_in_public_store", true)
      .limit(50) // Get more products so we can randomize
    
    if (error) {
      console.error("[Store API] Error fetching products:", error)
      // Return empty array gracefully - component will handle it
      return NextResponse.json({ products: [], count: 0, error: error.message }, { status: 200 })
    }
    
    if (!products || products.length === 0) {
      console.log("[Store API] No in-stock products found")
      return NextResponse.json({ products: [], count: 0 }, { status: 200 })
    }
    
    // Randomize the products array
    const shuffled = [...products].sort(() => Math.random() - 0.5)
    const selectedProducts = shuffled.slice(0, 6) // Take 6 random products
    
    // Transform the data to include primary image and format for component
    const formattedProducts = selectedProducts.map((product: any) => {
      // Get primary image (display_order = 0) or first image
      const images = product.product_images || []
      const primaryImage = images.find((img: any) => img.display_order === 0) || images[0]
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price) || 0,
        image_url: primaryImage?.url || null,
        slug: product.slug,
        category: product.category,
        featured: product.featured,
        in_stock: product.in_stock
      }
    })
    
    return NextResponse.json({ 
      products: formattedProducts,
      count: formattedProducts.length
    })
  } catch (err: any) {
    console.error("[Store API] Exception:", err)
    return NextResponse.json({ 
      products: [], 
      count: 0,
      error: err.message 
    }, { status: 200 }) // Return 200 so component can handle gracefully
  }
}
