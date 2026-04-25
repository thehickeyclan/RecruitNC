import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import type { ExpenseRequestStatus } from "@/lib/athlete-expense-requests"

export const dynamic = "force-dynamic"

type RequestRow = {
  id: string
  user_id: string
  athlete_id: string
  expense_type: string
  amount_cents: number
  amount_approved_cents: number | null
  payment_method: string
  zelle_info: string | null
  venmo_info: string | null
  parent_notes: string | null
  document_url: string | null
  status: string
  admin_notes: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  paid_at: string | null
  athletes: { name: string } | { name: string }[] | null
}

function embedName(emb: { name: string } | { name: string }[] | null | undefined): string {
  if (emb == null) return ""
  return Array.isArray(emb) ? emb[0]?.name ?? "" : emb.name
}

function openAmountCents(r: Pick<RequestRow, "status" | "amount_cents" | "amount_approved_cents">): number {
  const s = r.status
  if (s === "rejected" || s === "paid") return 0
  if (s === "approved") return r.amount_approved_cents ?? r.amount_cents
  return r.amount_cents
}

function reviewQueueCents(r: Pick<RequestRow, "status" | "amount_cents">): number {
  if (r.status === "pending" || r.status === "under_review") return r.amount_cents
  return 0
}

function awaitingPayoutCents(r: Pick<RequestRow, "status" | "amount_cents" | "amount_approved_cents">): number {
  if (r.status === "approved") return r.amount_approved_cents ?? r.amount_cents
  return 0
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClient()
  const { data: list, error } = await admin
    .from("athlete_expense_requests")
    .select(
      "id, user_id, athlete_id, expense_type, amount_cents, amount_approved_cents, payment_method, zelle_info, venmo_info, parent_notes, document_url, status, admin_notes, created_at, updated_at, reviewed_at, paid_at, athletes ( name )",
    )
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[RecruitNC] admin expense-requests GET", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (list ?? []) as RequestRow[]
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
  const safeUserIds = userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]

  const { data: userProfiles, error: profErr } = await admin
    .from("user_profiles")
    .select("user_id, email, first_name, last_name, full_name")
    .in("user_id", safeUserIds)

  if (profErr) {
    console.error("[RecruitNC] admin expense-requests profiles", profErr)
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  const userMap = new Map(
    (userProfiles ?? []).map((u) => {
      const up = u as {
        user_id: string
        email: string | null
        first_name: string | null
        last_name: string | null
        full_name: string | null
      }
      const display =
        up.full_name?.trim() || `${up.first_name ?? ""} ${up.last_name ?? ""}`.trim() || up.email || "Unknown"
      return [up.user_id, { email: up.email, displayName: display }]
    }),
  )

  let reviewQueue = 0
  let awaitingPayout = 0
  let totalOpen = 0
  const byUser = new Map<string, { user_id: string; email: string; display_name: string; open_cents: number }>()

  for (const r of rows) {
    const o = openAmountCents(r)
    reviewQueue += reviewQueueCents(r)
    awaitingPayout += awaitingPayoutCents(r)
    totalOpen += o
    const p = userMap.get(r.user_id)
    const email = p?.email || "unknown"
    const display_name = p?.displayName || email
    const cur = byUser.get(r.user_id) ?? { user_id: r.user_id, email, display_name, open_cents: 0 }
    cur.open_cents += o
    cur.email = email
    cur.display_name = display_name
    byUser.set(r.user_id, cur)
  }

  const requests = rows.map((r) => {
    const p = userMap.get(r.user_id)
    return {
      id: r.id,
      user_id: r.user_id,
      user_email: p?.email,
      user_display_name: p?.displayName ?? p?.email ?? "Unknown",
      athlete_id: r.athlete_id,
      athlete_name: embedName(r.athletes) || "Unknown",
      expense_type: r.expense_type,
      amount_cents: r.amount_cents,
      amount_approved_cents: r.amount_approved_cents,
      payment_method: r.payment_method,
      zelle_info: r.zelle_info,
      venmo_info: r.venmo_info,
      parent_notes: r.parent_notes,
      document_url: r.document_url,
      status: r.status as ExpenseRequestStatus,
      admin_notes: r.admin_notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
      reviewed_at: r.reviewed_at,
      paid_at: r.paid_at,
    }
  })

  return NextResponse.json({
    requests,
    summary: {
      reviewQueueCents: reviewQueue,
      awaitingPayoutCents: awaitingPayout,
      totalOpenCents: totalOpen,
      byUser: Array.from(byUser.values()).sort((a, b) => b.open_cents - a.open_cents),
    },
  })
}
