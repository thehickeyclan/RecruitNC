import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isMissingImportsTable } from "@/lib/public-imports/stage"
import { promoteStagedRow } from "@/lib/public-imports/promote"
import type { DualTeamProposed, PlacerProposed } from "@/lib/public-imports/types"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ batchId: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { batchId } = await context.params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const action = String(body.action || "")
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 })
  }

  const rowIds = Array.isArray(body.row_ids)
    ? body.row_ids.map(String).filter(Boolean)
    : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const admin = createAdminClient()

  let q = admin
    .from("public_import_rows")
    .select("id, dataset_key, proposed, diff_status, status")
    .eq("batch_id", batchId)
    .eq("status", "pending")

  if (rowIds?.length) q = q.in("id", rowIds)
  else if (action === "approve") {
    // default approve: only new + changed (never silent-approve matches)
    q = q.in("diff_status", ["new", "changed", "conflict"])
  }

  const { data: rows, error: rowsErr } = await q
  if (rowsErr) {
    if (isMissingImportsTable(rowsErr)) {
      return NextResponse.json({ setupRequired: true, error: rowsErr.message }, { status: 503 })
    }
    return NextResponse.json({ error: rowsErr.message }, { status: 500 })
  }

  if (!rows?.length) {
    return NextResponse.json({ ok: true, approved: 0, rejected: 0, failed: [] })
  }

  const now = new Date().toISOString()
  let approved = 0
  let rejected = 0
  const failed: Array<{ id: string; error: string }> = []

  for (const row of rows) {
    if (action === "reject") {
      const { error } = await admin
        .from("public_import_rows")
        .update({ status: "rejected", reviewed_at: now })
        .eq("id", row.id)
      if (error) failed.push({ id: row.id, error: error.message })
      else rejected += 1
      continue
    }

    try {
      await promoteStagedRow(
        admin,
        String(row.dataset_key),
        row.proposed as DualTeamProposed | PlacerProposed,
      )
      const { error } = await admin
        .from("public_import_rows")
        .update({ status: "approved", reviewed_at: now, promote_error: null })
        .eq("id", row.id)
      if (error) throw new Error(error.message)
      approved += 1
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      failed.push({ id: row.id, error: msg })
      await admin
        .from("public_import_rows")
        .update({ promote_error: msg })
        .eq("id", row.id)
    }
  }

  const { count: pendingCount } = await admin
    .from("public_import_rows")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .eq("status", "pending")

  const batchStatus =
    (pendingCount ?? 0) > 0
      ? "partial"
      : action === "reject" && approved === 0
        ? "rejected"
        : "approved"

  await admin
    .from("public_import_batches")
    .update({
      status: batchStatus,
      reviewed_at: now,
      reviewed_by: user?.id ?? null,
    })
    .eq("id", batchId)

  return NextResponse.json({ ok: true, approved, rejected, failed, batchStatus })
}
