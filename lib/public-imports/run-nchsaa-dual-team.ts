import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getNchsaaDualTeamSources,
  listNchsaaDualTeamYears,
} from "./connectors/nchsaa-dual-team"
import { parseNchsaaDualTeamChampionshipsText } from "./parse"
import { fetchUrlAsText, stageImportBatch } from "./stage"
import type { DualTeamProposed } from "./types"
import { DATASET_DUAL_TEAM } from "./types"
import { dualNaturalKey } from "./normalize"

export type RunNchsaaDualTeamResult = {
  year: number
  sources: Array<{ url: string; label: string; parsed: number }>
  batch: Awaited<ReturnType<typeof stageImportBatch>>["batch"]
  summary: Awaited<ReturnType<typeof stageImportBatch>>["summary"]
  rowCount: number
  champions: number
}

/**
 * Fetch registered NCHSAA dual-team championship pages for a year,
 * parse year×division champions, stage one review batch (does not auto-publish).
 */
export async function runNchsaaDualTeamConnector(
  admin: SupabaseClient,
  opts: {
    year: number
    created_by?: string | null
    extra_urls?: Array<{ url: string; label?: string }>
  },
): Promise<RunNchsaaDualTeamResult> {
  const year = opts.year
  const sources = [
    ...getNchsaaDualTeamSources(year),
    ...(opts.extra_urls ?? []).map((e) => ({
      url: e.url,
      label: e.label || e.url,
    })),
  ]
  if (!sources.length) {
    throw new Error(
      `No NCHSAA dual-team sources registered for ${year}. Add URLs in lib/public-imports/connectors/nchsaa-dual-team.ts (known years: ${listNchsaaDualTeamYears().join(", ")}).`,
    )
  }

  const all: DualTeamProposed[] = []
  const sourceStats: Array<{ url: string; label: string; parsed: number }> = []

  for (const src of sources) {
    const text = await fetchUrlAsText(src.url)
    const rows = parseNchsaaDualTeamChampionshipsText(text, { year })
    sourceStats.push({ url: src.url, label: src.label, parsed: rows.length })
    all.push(...rows)
  }

  const map = new Map<string, DualTeamProposed>()
  for (const r of all) {
    map.set(dualNaturalKey(r.year, r.division), r)
  }
  const proposed = [...map.values()]
  if (!proposed.length) {
    throw new Error(
      `Parsed 0 dual-team rows from ${sources.length} source(s) for ${year}. NCHSAA page layout may have changed — paste year×division JSON manually or update the parser.`,
    )
  }

  const staged = await stageImportBatch(admin, {
    dataset: DATASET_DUAL_TEAM,
    source_label: `NCHSAA Dual Team ${year} connector`,
    source_url: sources.map((s) => s.url).join(" | "),
    year,
    json: { records: proposed },
    created_by: opts.created_by ?? null,
  })

  return {
    year,
    sources: sourceStats,
    batch: staged.batch,
    summary: staged.summary,
    rowCount: staged.rowCount,
    champions: proposed.length,
  }
}
