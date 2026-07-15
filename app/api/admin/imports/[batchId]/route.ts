import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { isMissingImportsTable } from "@/lib/public-imports/stage"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ batchId: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { batchId } = await context.params
  const status = request.nextUrl.searchParams.get("status") || "actionable"
  const admin = createAdminClient()

  const { data: batch, error: batchErr } = await admin
    .from("public_import_batches")
    .select("id, dataset_key, source_label, source_url, year, status, summary, created_at, reviewed_at")
    .eq("id", batchId)
    .maybeSingle()

  if (batchErr) {
    if (isMissingImportsTable(batchErr)) {
      return NextResponse.json({ setupRequired: true, error: batchErr.message }, { status: 503 })
    }
    return NextResponse.json({ error: batchErr.message }, { status: 500 })
  }
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 })

  let q = admin
    .from("public_import_rows")
    .select(
      "id, dataset_key, natural_key, diff_status, proposed, existing, status, promote_error, reviewed_at",
    )
    .eq("batch_id", batchId)
    .order("diff_status", { ascending: true })
    .limit(2000)

  if (status === "pending") {
    q = q.eq("status", "pending")
  } else if (status === "new") {
    q = q.eq("diff_status", "new").eq("status", "pending")
  } else if (status === "changed") {
    q = q.eq("diff_status", "changed").eq("status", "pending")
  } else if (status === "actionable") {
    q = q.eq("status", "pending").in("diff_status", ["new", "changed", "conflict"])
  }
  // status === "all" → no extra filter

  const { data: rows, error: rowsErr } = await q
  if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 500 })

  return NextResponse.json({ batch, rows: rows ?? [] })
}
