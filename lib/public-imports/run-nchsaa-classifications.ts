import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getNchsaaClassificationSources,
  listNchsaaClassificationYears,
} from "./connectors/nchsaa-classifications"
import { parseNchsaaSchoolsClassificationHtml } from "./parse-classifications"
import { fetchUrlAsHtml, stageImportBatch } from "./stage"
import type { ClassificationProposed } from "./types"
import { DATASET_CLASSIFICATIONS } from "./types"
import { classificationNaturalKey } from "./normalize"

export type RunNchsaaClassificationsResult = {
  year: number
  sources: Array<{ url: string; label: string; parsed: number }>
  batch: Awaited<ReturnType<typeof stageImportBatch>>["batch"]
  summary: Awaited<ReturnType<typeof stageImportBatch>>["summary"]
  rowCount: number
  schools: number
}

/**
 * Fetch registered NCHSAA schools directory for a season year,
 * parse school→classification membership, stage one review batch (does not auto-publish).
 */
export async function runNchsaaClassificationsConnector(
  admin: SupabaseClient,
  opts: {
    year: number
    created_by?: string | null
    extra_urls?: Array<{ url: string; label?: string; cycle_label?: string }>
  },
): Promise<RunNchsaaClassificationsResult> {
  const year = opts.year
  const sources = [
    ...getNchsaaClassificationSources(year),
    ...(opts.extra_urls ?? []).map((e) => ({
      url: e.url,
      label: e.label || e.url,
      cycle_label: e.cycle_label,
    })),
  ]
  if (!sources.length) {
    throw new Error(
      `No NCHSAA classification sources registered for ${year}. Add URLs in lib/public-imports/connectors/nchsaa-classifications.ts (known years: ${listNchsaaClassificationYears().join(", ")}).`,
    )
  }

  const all: ClassificationProposed[] = []
  const sourceStats: Array<{ url: string; label: string; parsed: number }> = []
  let cycle_label: string | null = null

  for (const src of sources) {
    const html = await fetchUrlAsHtml(src.url)
    const rows = parseNchsaaSchoolsClassificationHtml(html, {
      effective_year: year,
      cycle_label: src.cycle_label ?? null,
    })
    if (src.cycle_label) cycle_label = src.cycle_label
    sourceStats.push({ url: src.url, label: src.label, parsed: rows.length })
    all.push(...rows)
  }

  const map = new Map<string, ClassificationProposed>()
  for (const r of all) {
    map.set(classificationNaturalKey(r.effective_year, r.school_name), r)
  }
  const proposed = [...map.values()]
  if (!proposed.length) {
    throw new Error(
      `Parsed 0 classification rows from ${sources.length} source(s) for ${year}. NCHSAA /schools/ table layout may have changed.`,
    )
  }

  const staged = await stageImportBatch(admin, {
    dataset: DATASET_CLASSIFICATIONS,
    source_label: `NCHSAA School Classifications ${year} connector`,
    source_url: sources.map((s) => s.url).join(" | "),
    year,
    cycle_label,
    json: { records: proposed },
    created_by: opts.created_by ?? null,
  })

  return {
    year,
    sources: sourceStats,
    batch: staged.batch,
    summary: staged.summary,
    rowCount: staged.rowCount,
    schools: proposed.length,
  }
}
