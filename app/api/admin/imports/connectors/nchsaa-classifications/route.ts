import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  getNchsaaClassificationSources,
  listNchsaaClassificationYears,
} from "@/lib/public-imports/connectors/nchsaa-classifications"
import { isMissingImportsTable } from "@/lib/public-imports/stage"
import { runNchsaaClassificationsConnector } from "@/lib/public-imports/run-nchsaa-classifications"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const years = listNchsaaClassificationYears()
  return NextResponse.json({
    connector: "nchsaa_school_classifications",
    years,
    sources_by_year: Object.fromEntries(
      years.map((y) => [y, getNchsaaClassificationSources(y)]),
    ),
  })
}

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

  const year = Number(body.year)
  if (!Number.isFinite(year) || year < 1990 || year > 2100) {
    return NextResponse.json({ error: "year required (e.g. 2026)" }, { status: 400 })
  }

  const extra_urls = Array.isArray(body.extra_urls)
    ? (body.extra_urls as Array<{ url?: string; label?: string; cycle_label?: string }>)
        .filter((e) => e?.url)
        .map((e) => ({
          url: String(e.url),
          label: e.label ? String(e.label) : undefined,
          cycle_label: e.cycle_label ? String(e.cycle_label) : undefined,
        }))
    : undefined

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const admin = createAdminClient()
    const result = await runNchsaaClassificationsConnector(admin, {
      year,
      created_by: user?.id ?? null,
      extra_urls,
    })
    return NextResponse.json(result)
  } catch (e) {
    const err = e as { message?: string; code?: string }
    if (isMissingImportsTable(err)) {
      return NextResponse.json(
        {
          error:
            "Run scripts/public-source-imports-setup.sql (and scripts/school-classification-years-setup.sql) in Supabase SQL Editor.",
          setupRequired: true,
        },
        { status: 503 },
      )
    }
    console.error("[RecruitNC] nchsaa classifications connector", err?.message || e)
    return NextResponse.json({ error: err?.message || "Connector failed" }, { status: 400 })
  }
}
