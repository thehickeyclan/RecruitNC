import { NextResponse } from "next/server"
import { createOrderFromPaymentIntent, createOrderFromSession } from "@/app/actions/stripe"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : ""
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""

    if (sessionId) {
      const result = await createOrderFromSession(sessionId)
      if (result.success) {
        return NextResponse.json({
          success: true,
          orderNumber: result.orderNumber,
          alreadyExisted: result.alreadyExisted ?? false,
        })
      }
      return NextResponse.json(
        { success: false, error: result.error ?? "Failed to recover order from session" },
        { status: 400 }
      )
    }

    if (!paymentIntentId) {
      return NextResponse.json(
        { success: false, error: "Payment Intent ID or Checkout Session ID is required" },
        { status: 400 }
      )
    }

    const result = await createOrderFromPaymentIntent(paymentIntentId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        orderNumber: result.orderNumber,
        alreadyExisted: result.alreadyExisted ?? false,
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
