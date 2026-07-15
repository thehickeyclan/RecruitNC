/**
 * Full Fargo Nationals connector:
 * USA Bracketing + Trackwrestling adapters → bouts + season aggregates → admin review.
 */

import fs from "fs"
import path from "path"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { FargoAdapterId, FargoAdapterParseResult } from "./adapters/fargo-adapter-types"
import {
  expandMatchesToBouts,
  filterBoutsByAthleteState,
  materializeFargoSeasons,
} from "./adapters/fargo-materialize"
import { parseTrackwrestlingExport } from "./adapters/fargo-trackwrestling"
import { parseUsaBracketingText } from "./adapters/fargo-usa-bracketing"
import {
  buildFargoValidationReport,
  countUniqueDualMatches,
  formatFargoValidationSummary,
  type FargoValidationReport,
} from "./adapters/fargo-validate"
import {
  getFargoEventsForYear,
  listFargoEventYears,
  type FargoEventSlot,
} from "./connectors/fargo-events"
import { getBundledFargoExport } from "./fixtures/fargo"
import { fargoBoutNaturalKey, fargoNaturalKey } from "./normalize"
import { fetchOfficialUrl, isUsaBracketingLoginWall } from "./fetch-official"
import { stageImportBatch } from "./stage"
import type { FargoBoutProposed, FargoProposed } from "./types"
import { DATASET_FARGO, DATASET_FARGO_BOUTS } from "./types"

export type RunFargoFullResult = {
  year: number
  adapter: FargoAdapterId | "mixed"
  slots_attempted: number
  slots_loaded: number
  report: FargoValidationReport
  report_summary: string
  seasons_batch: Awaited<ReturnType<typeof stageImportBatch>>["batch"] | null
  bouts_batch: Awaited<ReturnType<typeof stageImportBatch>>["batch"] | null
  seasons_summary: Awaited<ReturnType<typeof stageImportBatch>>["summary"] | null
  bouts_summary: Awaited<ReturnType<typeof stageImportBatch>>["summary"] | null
  warnings: string[]
  sources: Array<{ label: string; path?: string | null; url?: string | null; status: string }>
}

function repoRoot(): string {
  return process.cwd()
}

function readLocal(rel: string): string | null {
  const abs = path.join(repoRoot(), rel)
  if (!fs.existsSync(abs)) return null
  return fs.readFileSync(abs, "utf8")
}

function isDemoJsonText(text: string): boolean {
  try {
    const j = JSON.parse(text) as { recruitnc_demo?: unknown }
    return Boolean(j?.recruitnc_demo)
  } catch {
    return false
  }
}

async function loadSlotPayload(
  slot: FargoEventSlot,
  opts?: { allowDemo?: boolean },
): Promise<{
  text: string
  source_url: string | null
  status: string
}> {
  // 1) Bundled fixture (works on Vercel — scripts/ is not in the serverless filesystem)
  const bundled = getBundledFargoExport(slot.local_path, { allowDemo: opts?.allowDemo })
  if (bundled?.trim()) {
    return {
      text: bundled,
      source_url: slot.local_path ? `bundle://${slot.local_path}` : null,
      status: opts?.allowDemo && isDemoJsonText(bundled) ? "bundled_demo" : "bundled_export",
    }
  }

  // Demo fixtures exist but are blocked without allowDemo
  if (slot.local_path && !opts?.allowDemo) {
    const demoOnly = getBundledFargoExport(slot.local_path, { allowDemo: true })
    if (demoOnly && isDemoJsonText(demoOnly)) {
      throw new Error(
        `Demo fixture only for ${slot.label} (skipped — not official SoR). Add a real USA Bracketing export, or pass allow_demo only for connector plumbing tests.`,
      )
    }
  }

  // 2) Repo filesystem (local dev / Node scripts)
  if (slot.local_path) {
    const text = readLocal(slot.local_path)
    if (text?.trim()) {
      if (isDemoJsonText(text) && !opts?.allowDemo) {
        throw new Error(
          `Demo fixture only for ${slot.label} (skipped — not official SoR). Add a real USA Bracketing export.`,
        )
      }
      return { text, source_url: `file://${slot.local_path}`, status: "local_export" }
    }
  }

  // 3) Live JSON URL only (never HTML hub pages)
  if (slot.fetch_url) {
    const fetched = await fetchOfficialUrl(slot.fetch_url)
    if (isUsaBracketingLoginWall(fetched.text)) {
      throw new Error(
        `USA Bracketing login wall at ${slot.fetch_url}. Bundle a JSON export in lib/public-imports/fixtures/fargo/ (and scripts/data/fargo/exports/).`,
      )
    }
    const trimmed = fetched.text.trim()
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return { text: trimmed, source_url: fetched.finalUrl, status: "fetched_json" }
    }
    throw new Error(
      `fetch_url did not return JSON (${slot.fetch_url}). Event hub HTML is not an export — use bundled USA Bracketing JSON.`,
    )
  }

  throw new Error(
    `Export not available for ${slot.label}. Add JSON under lib/public-imports/fixtures/fargo/ and scripts/data/fargo/exports/, register in fargo-events.ts (hub pages are not fetched).`,
  )
}

function parseSlot(slot: FargoEventSlot, text: string, source_url: string | null): FargoAdapterParseResult {
  const ctx = {
    year: slot.year,
    style: slot.style,
    gender: slot.gender,
    age_division: slot.age_division,
    source_event_id: slot.source_event_id ?? null,
    source_url,
    source_label: slot.label,
    source_adapter: slot.adapter,
  }

  if (slot.adapter === "usa_bracketing") {
    return parseUsaBracketingText(text, ctx)
  }
  if (slot.adapter === "trackwrestling") {
    return parseTrackwrestlingExport(text, ctx)
  }
  throw new Error(`Unsupported adapter ${slot.adapter} for full connector (use CSV season connector for csv_season)`)
}

function dedupeSeasons(rows: FargoProposed[]): FargoProposed[] {
  const map = new Map<string, FargoProposed>()
  for (const r of rows) {
    map.set(
      fargoNaturalKey(r.year, r.style, r.age_division, r.gender, r.weight_class, r.athlete_name),
      r,
    )
  }
  return [...map.values()]
}

function dedupeBouts(rows: FargoBoutProposed[]): FargoBoutProposed[] {
  const map = new Map<string, FargoBoutProposed>()
  for (const r of rows) {
    map.set(
      fargoBoutNaturalKey(
        r.year,
        r.style,
        r.age_division,
        r.gender,
        r.weight_class,
        r.athlete_name,
        r.source_match_id,
        r.match_order ?? null,
        r.opponent_name,
      ),
      r,
    )
  }
  return [...map.values()]
}

/**
 * Run full Fargo connector for a year.
 * Loads custom paste payloads via opts.paste when provided (adapter + context).
 */
export async function runFargoFullConnector(
  admin: SupabaseClient,
  opts: {
    year: number
    created_by?: string | null
    /** Default NC — season staging filtered; bouts keep NC athlete perspectives */
    stateFilter?: string | null
    adapter?: FargoAdapterId | "auto"
    /** When true, stage nationwide seasons (not only NC) */
    nationwide?: boolean
    /** Optional direct paste bypassing registry files */
    paste?: {
      text: string
      adapter: "usa_bracketing" | "trackwrestling"
      style: "FS" | "GR"
      gender: "M" | "F"
      age_division: "16U" | "Junior"
      source_event_id?: string | null
    }
    stageBouts?: boolean
    stageSeasons?: boolean
    /** Only for connector plumbing tests — never for production SoR */
    allowDemo?: boolean
  },
): Promise<RunFargoFullResult> {
  const year = opts.year
  const stateFilter = opts.nationwide ? null : (opts.stateFilter ?? "NC")
  const stageBouts = opts.stageBouts !== false
  const stageSeasons = opts.stageSeasons !== false
  const allowDemo = Boolean(opts.allowDemo)
  const warnings: string[] = []
  const sources: RunFargoFullResult["sources"] = []

  const parsedAll: FargoAdapterParseResult[] = []

  if (opts.paste) {
    const slotLike: FargoEventSlot = {
      year,
      style: opts.paste.style,
      gender: opts.paste.gender,
      age_division: opts.paste.age_division,
      label: `${year} paste ${opts.paste.age_division} ${opts.paste.gender} ${opts.paste.style}`,
      adapter: opts.paste.adapter,
      source_event_id: opts.paste.source_event_id ?? null,
    }
    const parsed = parseSlot(slotLike, opts.paste.text, null)
    parsedAll.push(parsed)
    warnings.push(...parsed.warnings)
    sources.push({ label: slotLike.label, status: "paste" })
  } else {
    let slots = getFargoEventsForYear(year)
    if (opts.adapter && opts.adapter !== "auto") {
      slots = slots.filter((s) => s.adapter === opts.adapter)
    }
    if (!slots.length) {
      throw new Error(
        `No Fargo event slots registered for ${year}. Known years: ${listFargoEventYears().join(", ")}. Add slots in lib/public-imports/connectors/fargo-events.ts`,
      )
    }

    let loaded = 0
    for (const slot of slots) {
      try {
        const payload = await loadSlotPayload(slot, { allowDemo })
        const parsed = parseSlot(slot, payload.text, payload.source_url)
        parsedAll.push(parsed)
        warnings.push(...parsed.warnings)
        sources.push({
          label: slot.label,
          path: slot.local_path,
          url: slot.fetch_url,
          status: payload.status,
        })
        loaded += 1
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        warnings.push(`${slot.label}: ${msg}`)
        sources.push({
          label: slot.label,
          path: slot.local_path,
          url: slot.fetch_url,
          status: `skipped: ${msg}`,
        })
      }
    }

    if (!loaded) {
      throw new Error(
        `No official Fargo exports loaded for ${year}. Demo fixtures are blocked by default (they must never invent real athlete results). Add USA Bracketing JSON to lib/public-imports/fixtures/fargo/ without recruitnc_demo, and scripts/data/fargo/exports/.`,
      )
    }

    if (loaded < slots.length) {
      warnings.push(
        `Loaded ${loaded}/${slots.length} ${year} brackets; missing exports were skipped (expected until each style/age dump is added).`,
      )
    }
  }

  let allBouts: FargoBoutProposed[] = []
  let allSeasons: FargoProposed[] = []
  let matchCount = 0
  let placerCount = 0

  for (const parsed of parsedAll) {
    matchCount += parsed.matches.length
    placerCount += parsed.placers.length
    const bouts = expandMatchesToBouts(parsed)
    allBouts.push(...(stateFilter ? filterBoutsByAthleteState(bouts, stateFilter) : bouts))
    allSeasons.push(...materializeFargoSeasons(parsed, { stateFilter }))
  }

  allBouts = dedupeBouts(allBouts)
  allSeasons = dedupeSeasons(allSeasons)

  if (!allSeasons.length && !allBouts.length) {
    throw new Error(
      `Parsed sources for ${year} but produced 0 season rows and 0 bouts after filters (stateFilter=${stateFilter ?? "none"}).`,
    )
  }

  let seasons_batch = null
  let seasons_summary = null
  let bouts_batch = null
  let bouts_summary = null

  if (stageSeasons && allSeasons.length) {
    const staged = await stageImportBatch(admin, {
      dataset: DATASET_FARGO,
      source_label: `Fargo full connector ${year} (seasons)`,
      source_url: sources.map((s) => s.path || s.url || s.label).join(" | "),
      year,
      json: { records: allSeasons },
      created_by: opts.created_by ?? null,
    })
    seasons_batch = staged.batch
    seasons_summary = staged.summary
  }

  if (stageBouts && allBouts.length) {
    const staged = await stageImportBatch(admin, {
      dataset: DATASET_FARGO_BOUTS,
      source_label: `Fargo full connector ${year} (bouts)`,
      source_url: sources.map((s) => s.path || s.url || s.label).join(" | "),
      year,
      json: { bouts: allBouts },
      created_by: opts.created_by ?? null,
    })
    bouts_batch = staged.batch
    bouts_summary = staged.summary
  }

  const report = buildFargoValidationReport({
    seasons: allSeasons,
    bouts: allBouts,
    matchCount: matchCount || countUniqueDualMatches(allBouts),
    placerCount,
    diffSummary: seasons_summary ?? undefined,
    warnings,
  })

  const adapters = new Set(parsedAll.map((p) => p.adapter))
  const adapter: RunFargoFullResult["adapter"] =
    adapters.size === 1 ? ([...adapters][0] as FargoAdapterId) : "mixed"

  return {
    year,
    adapter,
    slots_attempted: opts.paste ? 1 : getFargoEventsForYear(year).length,
    slots_loaded: parsedAll.length,
    report,
    report_summary: formatFargoValidationSummary(report),
    seasons_batch,
    bouts_batch,
    seasons_summary,
    bouts_summary,
    warnings,
    sources,
  }
}
