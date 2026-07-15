import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  isMissingImportsTable,
  stageImportBatch,
  type StageInput,
} from "@/lib/public-imports/stage"
import {
  DATASET_CLASSIFICATIONS,
  DATASET_DUAL_TEAM,
  DATASET_FARGO,
  DATASET_FARGO_BOUTS,
  DATASET_PLACERS,
  type DatasetKey,
} from "@/lib/public-imports/types"

export const dynamic = "force-dynamic"

function isDataset(v: unknown): v is DatasetKey {
  return (
    v === DATASET_DUAL_TEAM ||
    v === DATASET_PLACERS ||
    v === DATASET_CLASSIFICATIONS ||
    v === DATASET_FARGO ||
    v === DATASET_FARGO_BOUTS
  )
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

  if (!isDataset(body.dataset)) {
    return NextResponse.json(
      {
        error: `dataset must be ${DATASET_DUAL_TEAM}, ${DATASET_PLACERS}, ${DATASET_CLASSIFICATIONS}, ${DATASET_FARGO}, or ${DATASET_FARGO_BOUTS}`,
      },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const input: StageInput = {
    dataset: body.dataset,
    source_label: body.source_label != null ? String(body.source_label) : null,
    source_url: body.source_url != null ? String(body.source_url) : null,
    year: body.year != null ? Number(body.year) : null,
    json: body.json,
    text: body.text != null ? String(body.text) : null,
    cycle_label: body.cycle_label != null ? String(body.cycle_label) : null,
    created_by: user?.id ?? null,
  }

  try {
    const admin = createAdminClient()
    const result = await stageImportBatch(admin, input)
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
    console.error("[RecruitNC] imports/stage", err?.message || e)
    return NextResponse.json(
      { error: err?.message || "Staging failed" },
      { status: 400 },
    )
  }
}
