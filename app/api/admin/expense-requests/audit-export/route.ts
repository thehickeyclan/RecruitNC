import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { fetchAdminExpenseRequestBundle } from "@/lib/admin-expense-requests-data"
import { EXPENSE_STATUS_LABELS } from "@/lib/athlete-expense-requests"

export const dynamic = "force-dynamic"

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function centsToUsdString(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return ""
  return (cents / 100).toFixed(2)
}

/**
 * Admin-only: full reimbursement ledger for record retention / tax documentation.
 * Includes receipt URLs, payout instructions, timestamps, and notes.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const bundle = await fetchAdminExpenseRequestBundle()
  if (!bundle.ok) {
    return NextResponse.json({ error: bundle.error }, { status: 500 })
  }

  const { requests } = bundle.data
  const exportedAt = new Date().toISOString()
  const header = [
    "export_generated_at_utc",
    "request_id",
    "created_at",
    "updated_at",
    "reviewed_at",
    "paid_at",
    "status",
    "status_label",
    "parent_user_id",
    "parent_email",
    "parent_display_name",
    "athlete_id",
    "athlete_name",
    "expense_category_code",
    "expense_category_label",
    "amount_requested_usd",
    "amount_requested_cents",
    "amount_approved_usd",
    "amount_approved_cents",
    "payment_method",
    "zelle_pay_to",
    "venmo_pay_to",
    "submitter_notes",
    "admin_notes",
    "receipt_attachment_url",
    "has_receipt_attachment",
  ]

  const lines = [
    header.join(","),
    ...requests.map((r) =>
      [
        csvEscape(exportedAt),
        csvEscape(r.id),
        csvEscape(r.created_at),
        csvEscape(r.updated_at),
        csvEscape(r.reviewed_at),
        csvEscape(r.paid_at),
        csvEscape(r.status),
        csvEscape(EXPENSE_STATUS_LABELS[r.status]),
        csvEscape(r.user_id),
        csvEscape(r.user_email),
        csvEscape(r.user_display_name),
        csvEscape(r.athlete_id),
        csvEscape(r.athlete_name),
        csvEscape(r.expense_type),
        csvEscape(r.expense_type_label),
        csvEscape(centsToUsdString(r.amount_cents)),
        csvEscape(r.amount_cents),
        csvEscape(centsToUsdString(r.amount_approved_cents ?? undefined)),
        csvEscape(r.amount_approved_cents ?? ""),
        csvEscape(r.payment_method),
        csvEscape(r.zelle_info),
        csvEscape(r.venmo_info),
        csvEscape(r.parent_notes),
        csvEscape(r.admin_notes),
        csvEscape(r.document_url),
        csvEscape(r.document_url ? "Y" : "N"),
      ].join(","),
    ),
  ]

  // UTF-8 BOM helps Excel recognize encoding for examiner / finance workflows.
  const csv = `\uFEFF${lines.join("\r\n")}`
  const day = exportedAt.slice(0, 10)
  const filename = `nc-united-reimbursement-audit-${day}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
