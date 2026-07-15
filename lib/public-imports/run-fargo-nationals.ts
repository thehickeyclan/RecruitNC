import fs from "fs"
import path from "path"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getFargoYearSources,
  listFargoConnectorYears,
} from "./connectors/fargo-nationals"
import { fargoNaturalKey } from "./normalize"
import { fargoMetaFromFilename, parseFargoCsv } from "./parse-fargo"
import { stageImportBatch } from "./stage"
import type { FargoProposed } from "./types"
import { DATASET_FARGO } from "./types"

export type RunFargoNationalsResult = {
  year: number
  sources: Array<{ path: string; label: string; parsed: number }>
  batch: Awaited<ReturnType<typeof stageImportBatch>>["batch"]
  summary: Awaited<ReturnType<typeof stageImportBatch>>["summary"]
  rowCount: number
  athletes: number
  allAmericans: number
  freestyle: number
  greco: number
}

function repoRoot(): string {
  return process.cwd()
}

/**
 * Read registered Fargo CSV snapshots for a year, parse season rows, stage one review batch.
 * Does not auto-publish. Does not invent Greco rows when CSVs are Freestyle-only.
 */
export async function runFargoNationalsConnector(
  admin: SupabaseClient,
  opts: {
    year: number
    created_by?: string | null
  },
): Promise<RunFargoNationalsResult> {
  const year = opts.year
  const sources = getFargoYearSources(year)
  if (!sources.length) {
    throw new Error(
      `No Fargo CSV sources registered for ${year}. Add files under scripts/data/fargo/ and register in lib/public-imports/connectors/fargo-nationals.ts (known years: ${listFargoConnectorYears().join(", ")}).`,
    )
  }

  const all: FargoProposed[] = []
  const sourceStats: Array<{ path: string; label: string; parsed: number }> = []

  for (const src of sources) {
    const abs = path.join(repoRoot(), src.path)
    if (!fs.existsSync(abs)) {
      throw new Error(`Fargo source file missing: ${src.path}`)
    }
    const raw = fs.readFileSync(abs, "utf8")
    const meta = {
      ...fargoMetaFromFilename(src.path),
      source_label: src.label,
      source_url: `file://${src.path}`,
    }
    let rows = parseFargoCsv(raw, meta)
    if (src.yearFilter != null) {
      rows = rows.filter((r) => r.year === src.yearFilter)
    } else {
      rows = rows.filter((r) => r.year === year)
    }
    sourceStats.push({ path: src.path, label: src.label, parsed: rows.length })
    all.push(...rows)
  }

  const map = new Map<string, FargoProposed>()
  for (const r of all) {
    map.set(
      fargoNaturalKey(
        r.year,
        r.style,
        r.age_division,
        r.gender,
        r.weight_class,
        r.athlete_name,
      ),
      r,
    )
  }
  const proposed = [...map.values()]
  if (!proposed.length) {
    throw new Error(
      `Parsed 0 Fargo rows for ${year} from ${sources.length} file(s). Check CSV layouts / year filters.`,
    )
  }

  const staged = await stageImportBatch(admin, {
    dataset: DATASET_FARGO,
    source_label: `Fargo Nationals ${year} connector (CSV SoR)`,
    source_url: sources.map((s) => s.path).join(" | "),
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
    athletes: proposed.length,
    allAmericans: proposed.filter((p) => p.is_all_american).length,
    freestyle: proposed.filter((p) => p.style === "FS").length,
    greco: proposed.filter((p) => p.style === "GR").length,
  }
}
