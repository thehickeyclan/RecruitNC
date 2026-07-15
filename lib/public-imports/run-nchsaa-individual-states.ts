import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getNchsaaIndividualStatesSources,
  listNchsaaIndividualStatesYears,
} from "./connectors/nchsaa-individual-states"
import { parseNchsaaIndividualStatesText } from "./parse"
import { fetchUrlAsText, stageImportBatch } from "./stage"
import type { PlacerProposed } from "./types"
import { DATASET_PLACERS } from "./types"

export type RunNchsaaIndividualStatesResult = {
  year: number
  sources: Array<{ url: string; label: string; parsed: number }>
  batch: Awaited<ReturnType<typeof stageImportBatch>>["batch"]
  summary: Awaited<ReturnType<typeof stageImportBatch>>["summary"]
  rowCount: number
  champions: number
}

/**
 * Priority 1 connector: fetch registered NCHSAA individual championship pages for a year,
 * parse champions/placers, stage one review batch (does not auto-publish).
 */
export async function runNchsaaIndividualStatesConnector(
  admin: SupabaseClient,
  opts: {
    year: number
    created_by?: string | null
    /** Optional extra URLs beyond the registry */
    extra_urls?: Array<{ url: string; label?: string }>
  },
): Promise<RunNchsaaIndividualStatesResult> {
  const year = opts.year
  const sources = [
    ...getNchsaaIndividualStatesSources(year),
    ...(opts.extra_urls ?? []).map((e) => ({
      url: e.url,
      label: e.label || e.url,
    })),
  ]
  if (!sources.length) {
    throw new Error(
      `No NCHSAA individual States sources registered for ${year}. Add URLs in lib/public-imports/connectors/nchsaa-individual-states.ts (known years: ${listNchsaaIndividualStatesYears().join(", ")}).`,
    )
  }

  const all: PlacerProposed[] = []
  const sourceStats: Array<{ url: string; label: string; parsed: number }> = []

  for (const src of sources) {
    const text = await fetchUrlAsText(src.url)
    const rows = parseNchsaaIndividualStatesText(text, {
      year,
      defaultClassification: src.defaultClassification,
      gender: src.gender ?? null,
    })
    sourceStats.push({ url: src.url, label: src.label, parsed: rows.length })
    all.push(...rows)
  }

  // Dedupe across pages (men/women keep separate gender in key)
  const map = new Map<string, PlacerProposed>()
  for (const r of all) {
    map.set(
      `${r.year}|${r.classification}|${r.weight_class}|${r.place}|${r.gender ?? ""}`,
      r,
    )
  }
  const proposed = [...map.values()]
  if (!proposed.length) {
    throw new Error(
      `Parsed 0 rows from ${sources.length} source(s) for ${year}. NCHSAA page layout may have changed — paste text manually or update the parser.`,
    )
  }

  const staged = await stageImportBatch(admin, {
    dataset: DATASET_PLACERS,
    source_label: `NCHSAA Individual States ${year} connector`,
    source_url: sources.map((s) => s.url).join(" | "),
    year,
    json: {
      year,
      classifications: groupPlacersAsJson(proposed),
    },
    created_by: opts.created_by ?? null,
  })

  return {
    year,
    sources: sourceStats,
    batch: staged.batch,
    summary: staged.summary,
    rowCount: staged.rowCount,
    champions: proposed.filter((p) => p.place === 1).length,
  }
}

function groupPlacersAsJson(rows: PlacerProposed[]) {
  const byClass = new Map<string, Map<string, PlacerProposed[]>>()
  for (const r of rows) {
    if (!byClass.has(r.classification)) byClass.set(r.classification, new Map())
    const byW = byClass.get(r.classification)!
    if (!byW.has(r.weight_class)) byW.set(r.weight_class, [])
    byW.get(r.weight_class)!.push(r)
  }
  return [...byClass.entries()].map(([classification, weights]) => ({
    classification,
    weight_classes: [...weights.entries()].map(([weight, places]) => ({
      weight,
      places: places.map((p) => ({
        place: p.place,
        name: p.wrestler_name,
        school: p.school,
      })),
    })),
  }))
}
