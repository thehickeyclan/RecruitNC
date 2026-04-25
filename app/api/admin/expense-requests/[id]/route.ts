import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import type { ExpenseRequestStatus } from "@/lib/athlete-expense-requests"

export const dynamic = "force-dynamic"

const STATUSES: ExpenseRequestStatus[] = ["pending", "under_review", "approved", "rejected", "paid"]

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  let body: {
    status?: string
    admin_notes?: string
    amount_approved_cents?: number | null
    paid_at?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const status = body.status
  if (status != null && !STATUSES.includes(status as ExpenseRequestStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  if (body.amount_approved_cents != null) {
    const a = body.amount_approved_cents
    if (typeof a !== "number" || !Number.isInteger(a) || a <= 0 || a > 100_000_000) {
      return NextResponse.json({ error: "Invalid approved amount" }, { status: 400 })
    }
  }

  const admin = createAdminClient()
  const { data: existing, error: fetchErr } = await admin
    .from("athlete_expense_requests")
    .select("id, amount_cents, status, reviewed_at, paid_at")
    .eq("id", id)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }

  const now = new Date().toISOString()
  const nextStatus = (status ?? existing.status) as ExpenseRequestStatus

  const updates: Record<string, unknown> = {
    updated_at: now,
  }
  if (body.admin_notes !== undefined) {
    updates.admin_notes = body.admin_notes
  }
  if (body.amount_approved_cents !== undefined) {
    updates.amount_approved_cents = body.amount_approved_cents
  }
  if (status != null) {
    updates.status = nextStatus
  }

  if (status != null) {
    if (["approved", "rejected", "paid"].includes(nextStatus) && !existing.reviewed_at) {
      updates.reviewed_at = now
    }
    if (nextStatus === "paid") {
      if (body.paid_at) {
        updates.paid_at = body.paid_at
      } else {
        updates.paid_at = now
      }
    } else {
      updates.paid_at = null
    }
  } else if (body.paid_at !== undefined) {
    updates.paid_at = body.paid_at
  }

  const { data: row, error: upErr } = await admin
    .from("athlete_expense_requests")
    .update(updates)
    .eq("id", id)
    .select("id, status, admin_notes, amount_approved_cents, reviewed_at, paid_at, updated_at")
    .single()

  if (upErr) {
    console.error("[RecruitNC] admin expense-requests PATCH", upErr)
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, request: row })
}
