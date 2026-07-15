import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  getFargoEventsForYear,
  listFargoEventYears,
} from "@/lib/public-imports/connectors/fargo-events"
import { isMissingImportsTable } from "@/lib/public-imports/stage"
import { runFargoFullConnector } from "@/lib/public-imports/run-fargo-full"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const years = listFargoEventYears()
  return NextResponse.json({
    connector: "fargo_nationals_full",
    years,
    events_by_year: Object.fromEntries(years.map((y) => [y, getFargoEventsForYear(y)])),
    note: "USA Bracketing + Trackwrestling adapters. Flo never SoR. Place exports in scripts/data/fargo/exports/.",
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

  const adapterRaw = body.adapter != null ? String(body.adapter) : "auto"
  const adapter =
    adapterRaw === "usa_bracketing" || adapterRaw === "trackwrestling" || adapterRaw === "auto"
      ? adapterRaw
      : "auto"

  let paste:
    | {
        text: string
        adapter: "usa_bracketing" | "trackwrestling"
        style: "FS" | "GR"
        gender: "M" | "F"
        age_division: "16U" | "Junior"
        source_event_id?: string | null
      }
    | undefined

  if (body.paste_text && String(body.paste_text).trim()) {
    const pAdapter =
      String(body.paste_adapter || "usa_bracketing") === "trackwrestling"
        ? "trackwrestling"
        : "usa_bracketing"
    paste = {
      text: String(body.paste_text),
      adapter: pAdapter,
      style: String(body.style || "FS").toUpperCase() === "GR" ? "GR" : "FS",
      gender: String(body.gender || "M").toUpperCase() === "F" ? "F" : "M",
      age_division: String(body.age_division || "Junior") === "16U" ? "16U" : "Junior",
      source_event_id: body.source_event_id != null ? String(body.source_event_id) : null,
    }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const admin = createAdminClient()
    const result = await runFargoFullConnector(admin, {
      year,
      created_by: user?.id ?? null,
      adapter,
      nationwide: Boolean(body.nationwide),
      stateFilter: body.state_filter != null ? String(body.state_filter) : "NC",
      paste,
      stageBouts: body.stage_bouts !== false,
      stageSeasons: body.stage_seasons !== false,
    })
    return NextResponse.json(result)
  } catch (e) {
    const err = e as { message?: string; code?: string }
    if (isMissingImportsTable(err)) {
      return NextResponse.json(
        {
          error:
            "Run scripts/public-source-imports-setup.sql, scripts/fargo-results-harden-setup.sql, and scripts/fargo-bouts-full-setup.sql in Supabase.",
          setupRequired: true,
        },
        { status: 503 },
      )
    }
    console.error("[RecruitNC] fargo full connector", err?.message || e)
    return NextResponse.json({ error: err?.message || "Connector failed" }, { status: 400 })
  }
}
