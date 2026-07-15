import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { fetchUrlAsText, isMissingImportsTable, stageImportBatch } from "@/lib/public-imports/stage"
import { inferYearFromText } from "@/lib/public-imports/parse"
import { DATASET_PLACERS } from "@/lib/public-imports/types"

export const dynamic = "force-dynamic"

/**
 * Fetch an NCHSAA championship page and stage Guaranteed Places as placers.
 * Duals: paste/stage JSON instead (annual dual pages vary); use dataset dual JSON export.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const url = String(body.url || "").trim()
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 })

  const year = body.year != null ? Number(body.year) : inferYearFromText(url)
  if (year == null || !Number.isFinite(year)) {
    return NextResponse.json({ error: "Pass year (could not infer from URL)" }, { status: 400 })
  }

  try {
    const text = await fetchUrlAsText(url)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const admin = createAdminClient()
    const result = await stageImportBatch(admin, {
      dataset: DATASET_PLACERS,
      source_label: body.source_label != null ? String(body.source_label) : `NCHSAA fetch ${year}`,
      source_url: url,
      year,
      text,
      created_by: user?.id ?? null,
    })
    return NextResponse.json(result)
  } catch (e) {
    const err = e as { message?: string; code?: string }
    if (isMissingImportsTable(err)) {
      return NextResponse.json(
        {
          error: "Run scripts/public-source-imports-setup.sql in Supabase SQL Editor.",
          setupRequired: true,
        },
        { status: 503 },
      )
    }
    console.error("[RecruitNC] imports/fetch", err?.message || e)
    return NextResponse.json({ error: err?.message || "Fetch/stage failed" }, { status: 400 })
  }
}
