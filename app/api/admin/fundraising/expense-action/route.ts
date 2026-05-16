import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  try {
    const { expenseId, action } = await request.json()

    if (!expenseId || !action) {
      return NextResponse.json({ error: "Missing expenseId or action" }, { status: 400 })
    }

    if (!["paid", "rejected", "approved"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const admin = createAdminClient()
    const now = new Date().toISOString()

    const updateData: Record<string, any> = {
      status: action,
      updated_at: now,
    }

    // If marking as paid, set paid_at timestamp
    if (action === "paid") {
      updateData.paid_at = now
    }

    const { error } = await admin
      .from("athlete_expense_requests")
      .update(updateData)
      .eq("id", expenseId)

    if (error) {
      console.error("[expense-action] Update error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, status: action })
  } catch (err) {
    console.error("[expense-action] Error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
