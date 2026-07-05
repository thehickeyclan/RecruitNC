import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  type DataDawgFeedbackRow,
  DATA_DAWG_FEEDBACK_TABLE_SETUP_HINT,
  isDataDawgFeedbackTableMissingError,
} from "@/lib/data-dawg-feedback"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const status = request.nextUrl.searchParams.get("status")
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "100")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100

  const admin = createAdminClient()
  let query = admin
    .from("data_dawg_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query

    if (error) {
      if (isDataDawgFeedbackTableMissingError(error)) {
        return NextResponse.json({
          items: [] as DataDawgFeedbackRow[],
          pendingCount: 0,
          tableMissing: true,
          setupHint: DATA_DAWG_FEEDBACK_TABLE_SETUP_HINT,
        })
      }
    console.error("[RecruitNC] admin data-dawg feedback GET", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let pendingCount = 0
  const { count: pendingTotal } = await admin
    .from("data_dawg_feedback")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
  pendingCount = pendingTotal ?? 0

  const items = (data ?? []) as DataDawgFeedbackRow[]

  return NextResponse.json({ items, pendingCount })
}
