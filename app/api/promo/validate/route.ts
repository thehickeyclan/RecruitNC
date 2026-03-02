import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const normalizedCode = (body.code ?? "").toString().toUpperCase().trim()
  const codeWithoutPercent = normalizedCode.replace(/%/g, "")

  if (!normalizedCode) {
    return NextResponse.json({ valid: false, message: "Promo code is required" }, { status: 400 })
  }

  let existingCode: { code: string; is_active?: boolean; valid_until?: string; valid_from?: string; max_uses?: number; current_uses?: number; min_order_value?: number; discount_type?: string; discount_value?: number } | null = null

  const { data: codeWithPercent } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle()

  if (codeWithPercent) {
    existingCode = codeWithPercent
  } else {
    const { data: codeWithout } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", codeWithoutPercent)
      .maybeSingle()

    if (codeWithout) {
      existingCode = codeWithout
    }
  }

  if (!existingCode) {
    return NextResponse.json(
      { valid: false, message: `Promo code "${normalizedCode}" not found` },
      { status: 404 },
    )
  }

  const { data: promoCode, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", existingCode.code)
    .eq("is_active", true)
    .maybeSingle()

  if (error || !promoCode) {
    return NextResponse.json(
      { valid: false, message: `Promo code "${existingCode.code}" is not active` },
      { status: 404 },
    )
  }

  if (promoCode.valid_until && new Date(promoCode.valid_until) < new Date()) {
    return NextResponse.json({ valid: false, message: "Promo code has expired" }, { status: 400 })
  }

  if (promoCode.valid_from && new Date(promoCode.valid_from) > new Date()) {
    return NextResponse.json({ valid: false, message: "Promo code is not yet valid" }, { status: 400 })
  }

  if (
    promoCode.max_uses != null &&
    promoCode.current_uses != null &&
    promoCode.current_uses >= promoCode.max_uses
  ) {
    return NextResponse.json({ valid: false, message: "Promo code usage limit reached" }, { status: 400 })
  }

  const subtotal = Number(body.subtotal) || 0
  if (promoCode.min_order_value != null && promoCode.min_order_value > 0 && subtotal < promoCode.min_order_value) {
    return NextResponse.json(
      {
        valid: false,
        message: `Minimum purchase of $${promoCode.min_order_value} required`,
      },
      { status: 400 },
    )
  }

  return NextResponse.json({
    valid: true,
    promoCode: {
      code: promoCode.code,
      discount_type: promoCode.discount_type,
      discount_value: promoCode.discount_value,
    },
  })
}
