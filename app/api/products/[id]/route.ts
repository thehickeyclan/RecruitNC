import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: "Product ID required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_variants (*),
      product_images (*),
      product_reviews (*)
    `
    )
    .eq("id", id)
    .eq("show_in_public_store", true)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    console.error("[api/products/[id]] Error fetching product:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
