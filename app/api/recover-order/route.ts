import { NextResponse } from "next/server"
import { createOrderFromPaymentIntent, createOrderFromSession } from "@/app/actions/stripe"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    // Creates order rows from any Stripe id the caller supplies. Admin only.
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

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
    const isSchemaError =
      typeof message === "string" &&
      (message.includes("customer_email") || message.includes("schema cache") || message.includes("column") && message.includes("orders"))
    const error = isSchemaError
      ? "Your orders table is missing columns (e.g. customer_email). Run the migration in docs/STORE_FLOWS_FOR_RECRUITNC.md in Supabase → SQL Editor (search for \"customer_email\"), then try again."
      : message
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
