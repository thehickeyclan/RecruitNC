import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { fetchAdminExpenseRequestBundle } from "@/lib/admin-expense-requests-data"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const bundle = await fetchAdminExpenseRequestBundle()
  if (!bundle.ok) {
    return NextResponse.json({ error: bundle.error }, { status: 500 })
  }

  const { requests, summary } = bundle.data
  const requestsJson = requests.map(
    ({
      id,
      user_id,
      user_email,
      user_display_name,
      athlete_id,
      athlete_name,
      expense_type,
      amount_cents,
      amount_approved_cents,
      payment_method,
      zelle_info,
      venmo_info,
      parent_notes,
      document_url,
      status,
      admin_notes,
      created_at,
      updated_at,
      reviewed_at,
      paid_at,
    }) => ({
      id,
      user_id,
      user_email,
      user_display_name,
      athlete_id,
      athlete_name,
      expense_type,
      amount_cents,
      amount_approved_cents,
      payment_method,
      zelle_info,
      venmo_info,
      parent_notes,
      document_url,
      status,
      admin_notes,
      created_at,
      updated_at,
      reviewed_at,
      paid_at,
    }),
  )

  return NextResponse.json({
    requests: requestsJson,
    summary,
  })
}
