import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { isMissingImportsTable } from "@/lib/public-imports/stage"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "40"), 1), 100)
  const dataset = request.nextUrl.searchParams.get("dataset")
  const admin = createAdminClient()

  let q = admin
    .from("public_import_batches")
    .select("id, dataset_key, source_label, source_url, year, status, summary, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (dataset) q = q.eq("dataset_key", dataset)

  const { data, error } = await q
  if (error) {
    if (isMissingImportsTable(error)) {
      return NextResponse.json({
        batches: [],
        setupRequired: true,
        setupSql: "scripts/public-source-imports-setup.sql",
        error: "Run scripts/public-source-imports-setup.sql in Supabase SQL Editor.",
      })
    }
    console.error("[RecruitNC] imports list", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ batches: data ?? [], setupRequired: false })
}
