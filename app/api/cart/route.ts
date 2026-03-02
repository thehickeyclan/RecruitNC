import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const cartItem = {
    user_id: user?.id ?? null,
    session_id: !user ? body.sessionId : null,
    product_id: body.productId,
    variant_id: body.variantId ?? null,
    quantity: body.quantity ?? 1,
  }

  let query = supabase.from("cart_items").select("*").eq("product_id", body.productId)

  if (body.variantId) {
    query = query.eq("variant_id", body.variantId)
  } else {
    query = query.is("variant_id", null)
  }

  if (user) {
    query = query.eq("user_id", user.id)
  } else {
    query = query.eq("session_id", body.sessionId)
  }

  const { data: existing } = await query.maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + cartItem.quantity })
      .eq("id", existing.id)
      .select()
      .single()

    if (error) {
      console.error("[api/cart] Error updating cart item:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  const { data, error } = await supabase.from("cart_items").insert(cartItem).select().single()

  if (error) {
    console.error("[api/cart] Error adding to cart:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId")
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user ?? null

  let query = supabase.from("cart_items").select(`
      *,
      product:products (*),
      variant:product_variants (*)
    `)

  if (user) {
    query = query.eq("user_id", user.id)
  } else if (sessionId) {
    query = query.eq("session_id", sessionId)
  } else {
    return NextResponse.json([])
  }

  const { data, error } = await query

  if (error) {
    console.error("[api/cart] Error fetching cart:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get("id")

  if (!itemId) {
    return NextResponse.json({ error: "Item ID required" }, { status: 400 })
  }

  const { error } = await supabase.from("cart_items").delete().eq("id", itemId)

  if (error) {
    console.error("[api/cart] Error removing from cart:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("cart_items")
    .update({ quantity: body.quantity })
    .eq("id", body.id)
    .select()
    .single()

  if (error) {
    console.error("[api/cart] Error updating cart quantity:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
