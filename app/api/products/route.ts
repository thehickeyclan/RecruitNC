import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const category = searchParams.get("category")
  const featured = searchParams.get("featured")
  const search = searchParams.get("search")

  let query = supabase
    .from("products")
    .select(
      `
      *,
      product_variants (*),
      product_images (*)
    `
    )
    .eq("show_in_public_store", true)

  if (category) {
    query = query.eq("category", category)
  }

  if (featured === "true") {
    query = query.eq("featured", true)
  }

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data, error } = await query
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[api/products] Error fetching products:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
