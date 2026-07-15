import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  getFargoYearSources,
  listFargoConnectorYears,
} from "@/lib/public-imports/connectors/fargo-nationals"
import { isMissingImportsTable } from "@/lib/public-imports/stage"
import { runFargoNationalsConnector } from "@/lib/public-imports/run-fargo-nationals"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const years = listFargoConnectorYears()
  return NextResponse.json({
    connector: "fargo_nationals_results",
    years,
    sources_by_year: Object.fromEntries(
      years.map((y) => [y, getFargoYearSources(y)]),
    ),
    note: "Phase 1 stages CSV season aggregates. Run scripts/fargo-results-harden-setup.sql before promote. Flo is never SoR.",
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

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const admin = createAdminClient()
    const result = await runFargoNationalsConnector(admin, {
      year,
      created_by: user?.id ?? null,
    })
    return NextResponse.json(result)
  } catch (e) {
    const err = e as { message?: string; code?: string }
    if (isMissingImportsTable(err)) {
      return NextResponse.json(
        {
          error:
            "Run scripts/public-source-imports-setup.sql and scripts/fargo-results-harden-setup.sql in Supabase SQL Editor.",
          setupRequired: true,
        },
        { status: 503 },
      )
    }
    console.error("[RecruitNC] fargo nationals connector", err?.message || e)
    return NextResponse.json({ error: err?.message || "Connector failed" }, { status: 400 })
  }
}
