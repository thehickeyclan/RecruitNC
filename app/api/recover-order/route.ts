import { NextResponse } from "next/server"
import { createOrderFromPaymentIntent } from "@/app/actions/stripe"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : ""

    if (!paymentIntentId) {
      return NextResponse.json(
        { success: false, error: "Payment Intent ID is required" },
        { status: 400 }
      )
    }

    const result = await createOrderFromPaymentIntent(paymentIntentId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        orderNumber: result.orderNumber,
      })
    }

    return NextResponse.json(
      { success: false, error: result.error ?? "Failed to recover order" },
      { status: 400 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to recover order"
    console.error("[recover-order]", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
