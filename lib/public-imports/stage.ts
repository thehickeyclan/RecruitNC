import type { SupabaseClient } from "@supabase/supabase-js"
import { diffClassificationRows, diffDualTeamRows, diffPlacerRows, summarizeDiffs } from "./diff"
import {
  inferYearFromText,
  parseDualTeamPayload,
  parseNchsaaDualTeamChampionshipsText,
  parseNchsaaIndividualStatesText,
  parsePlacerJsonPayload,
} from "./parse"
import {
  parseClassificationPayload,
  parseNchsaaSchoolsClassificationHtml,
  parseNchsaaSchoolsClassificationText,
} from "./parse-classifications"
import type {
  ClassificationProposed,
  DatasetKey,
  DualTeamProposed,
  PlacerProposed,
  StagedDiffRow,
} from "./types"
import { DATASET_CLASSIFICATIONS, DATASET_DUAL_TEAM, DATASET_PLACERS } from "./types"

export function isMissingImportsTable(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  const msg = (err.message || "").toLowerCase()
  return (
    err.code === "42P01" ||
    msg.includes("public_import_batches") ||
    msg.includes("public_import_rows") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  )
}

async function loadExistingDuals(
  admin: SupabaseClient,
  proposed: DualTeamProposed[],
): Promise<Record<string, unknown>[]> {
  const years = [...new Set(proposed.map((p) => p.year))]
  if (!years.length) return []
  const { data, error } = await admin
    .from("dual_team_champions")
    .select(
      "id, year, division, champion_school, runner_up_school, champion_score, runner_up_score, is_vacated, held, notes",
    )
    .in("year", years)
  if (error) throw new Error(error.message)
  return (data ?? []) as Record<string, unknown>[]
}

async function loadExistingPlacers(
  admin: SupabaseClient,
  proposed: PlacerProposed[],
): Promise<Record<string, unknown>[]> {
  const years = [...new Set(proposed.map((p) => p.year))]
  if (!years.length) return []
  const places = [...new Set(proposed.map((p) => p.place))]
  const { data, error } = await admin
    .from("wrestling_nchsaa_results")
    .select("id, year, classification, weight_class, place, wrestler_name, school")
    .in("year", years)
    .in("place", places)
  if (error) throw new Error(error.message)
  return (data ?? []) as Record<string, unknown>[]
}

async function loadExistingClassifications(
  admin: SupabaseClient,
  proposed: ClassificationProposed[],
): Promise<Record<string, unknown>[]> {
  const years = [...new Set(proposed.map((p) => p.effective_year))]
  if (!years.length) return []

  // Prefer year history when present
  const { data: yearRows, error: yearErr } = await admin
    .from("school_classification_years")
    .select("id, school_name, classification, region, conference, enrollment, effective_year")
    .in("effective_year", years)

  if (!yearErr && yearRows?.length) {
    return yearRows as Record<string, unknown>[]
  }

  // Fallback: compare against current snapshot (first import of a cycle)
  const { data, error } = await admin
    .from("school_classifications")
    .select("id, school_name, classification, region, conference, enrollment, effective_year")
  if (error) throw new Error(error.message)
  return (data ?? []) as Record<string, unknown>[]
}

export async function buildDiffsForDataset(
  admin: SupabaseClient,
  dataset: DatasetKey,
  proposed: DualTeamProposed[] | PlacerProposed[] | ClassificationProposed[],
): Promise<StagedDiffRow[]> {
  if (dataset === DATASET_DUAL_TEAM) {
    const rows = proposed as DualTeamProposed[]
    const existing = await loadExistingDuals(admin, rows)
    return diffDualTeamRows(rows, existing)
  }
  if (dataset === DATASET_CLASSIFICATIONS) {
    const rows = proposed as ClassificationProposed[]
    const existing = await loadExistingClassifications(admin, rows)
    return diffClassificationRows(rows, existing)
  }
  const rows = proposed as PlacerProposed[]
  const existing = await loadExistingPlacers(admin, rows)
  return diffPlacerRows(rows, existing)
}

export type StageInput = {
  dataset: DatasetKey
  source_label?: string | null
  source_url?: string | null
  year?: number | null
  /** Structured JSON (dual records / placer classifications / school membership) */
  json?: unknown
  /** Raw NCHSAA page text/HTML for parsers */
  text?: string | null
  /** Optional cycle label for classifications (e.g. 2025-2029) */
  cycle_label?: string | null
  created_by?: string | null
}

export async function stageImportBatch(admin: SupabaseClient, input: StageInput) {
  let proposed: DualTeamProposed[] | PlacerProposed[] | ClassificationProposed[] = []
  let year = input.year ?? null

  if (input.dataset === DATASET_DUAL_TEAM) {
    if (input.json != null) {
      proposed = parseDualTeamPayload(input.json)
    } else if (input.text?.trim()) {
      year =
        year ??
        inferYearFromText(input.source_url, input.source_label, input.text.slice(0, 500))
      if (year == null) throw new Error("Could not infer year — pass year explicitly")
      proposed = parseNchsaaDualTeamChampionshipsText(input.text, { year })
    } else {
      throw new Error("Dual team staging requires JSON or dual championship page text")
    }
    if (!year && proposed.length) {
      year = Math.max(...(proposed as DualTeamProposed[]).map((p) => p.year))
    }
  } else if (input.dataset === DATASET_CLASSIFICATIONS) {
    const effective =
      year ??
      inferYearFromText(input.source_url, input.source_label, input.text?.slice(0, 500))
    if (input.json != null) {
      proposed = parseClassificationPayload(input.json)
    } else if (input.text?.trim()) {
      if (effective == null) throw new Error("Could not infer year — pass year explicitly")
      proposed = /<table/i.test(input.text)
        ? parseNchsaaSchoolsClassificationHtml(input.text, {
            effective_year: effective,
            cycle_label: input.cycle_label,
          })
        : parseNchsaaSchoolsClassificationText(input.text, {
            effective_year: effective,
            cycle_label: input.cycle_label,
          })
    } else {
      throw new Error("Classification staging requires JSON or NCHSAA schools page HTML/text")
    }
    if (!year && proposed.length) {
      year = Math.max(
        ...(proposed as ClassificationProposed[]).map((p) => p.effective_year),
      )
    }
  } else {
    if (input.json != null) {
      proposed = parsePlacerJsonPayload(input.json)
    } else if (input.text?.trim()) {
      year =
        year ??
        inferYearFromText(input.source_url, input.source_label, input.text.slice(0, 500))
      if (year == null) throw new Error("Could not infer year — pass year explicitly")
      proposed = parseNchsaaIndividualStatesText(input.text, { year })
    } else {
      throw new Error("Placer staging requires JSON or page text")
    }
    if (!year && proposed.length) {
      year = (proposed as PlacerProposed[])[0]?.year ?? null
    }
  }

  if (!proposed.length) throw new Error("No rows parsed from input")

  const diffs = await buildDiffsForDataset(admin, input.dataset, proposed)
  const summary = summarizeDiffs(diffs)

  const { data: batch, error: batchErr } = await admin
    .from("public_import_batches")
    .insert({
      dataset_key: input.dataset,
      source_label: input.source_label ?? null,
      source_url: input.source_url ?? null,
      year,
      status: "pending",
      summary,
      created_by: input.created_by ?? null,
    })
    .select("id, dataset_key, source_label, source_url, year, status, summary, created_at")
    .single()

  if (batchErr) throw batchErr
  if (!batch?.id) throw new Error("Failed to create import batch")

  const rowInserts = diffs.map((d) => ({
    batch_id: batch.id,
    dataset_key: d.dataset_key,
    natural_key: d.natural_key,
    diff_status: d.diff_status,
    proposed: d.proposed,
    existing: d.existing,
    status: d.diff_status === "match" ? "skipped" : "pending",
  }))

  for (let i = 0; i < rowInserts.length; i += 200) {
    const chunk = rowInserts.slice(i, i + 200)
    const { error } = await admin.from("public_import_rows").insert(chunk)
    if (error) throw error
  }

  return { batch, summary, rowCount: diffs.length }
}

function assertNchsaaHost(url: string): URL {
  const u = new URL(url)
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Only http(s) URLs allowed")
  }
  const host = u.hostname.toLowerCase()
  if (host !== "nchsaa.org" && !host.endsWith(".nchsaa.org")) {
    throw new Error("Fetch limited to nchsaa.org hosts")
  }
  return u
}

export async function fetchUrlAsHtml(url: string): Promise<string> {
  assertNchsaaHost(url)
  const res = await fetch(url, {
    headers: { "user-agent": "RecruitNC-PublicImports/1.0" },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return res.text()
}

export async function fetchUrlAsText(url: string): Promise<string> {
  const html = await fetchUrlAsHtml(url)
  return htmlToRoughText(html)
}

function htmlToRoughText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr|br|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
}
