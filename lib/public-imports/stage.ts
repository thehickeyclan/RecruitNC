import type { SupabaseClient } from "@supabase/supabase-js"
import {
  diffClassificationRows,
  diffDualTeamRows,
  diffFargoBoutRows,
  diffFargoRows,
  diffPlacerRows,
  summarizeDiffs,
} from "./diff"
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
import { parseFargoCsv, parseFargoPayload } from "./parse-fargo"
import type {
  ClassificationProposed,
  DatasetKey,
  DualTeamProposed,
  FargoBoutProposed,
  FargoProposed,
  PlacerProposed,
  StagedDiffRow,
} from "./types"
import {
  DATASET_CLASSIFICATIONS,
  DATASET_DUAL_TEAM,
  DATASET_FARGO,
  DATASET_FARGO_BOUTS,
  DATASET_PLACERS,
} from "./types"

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

async function loadExistingFargo(
  admin: SupabaseClient,
  proposed: FargoProposed[],
): Promise<Record<string, unknown>[]> {
  const years = [...new Set(proposed.map((p) => p.year))]
  if (!years.length) return []
  const { data, error } = await admin
    .from("fargo_results")
    .select(
      "id, year, athlete_name, first_name, last_name, division, style, gender, age_division, weight_class, wins, losses, record, placement, is_all_american, high_school, state, club, notes, verification_status",
    )
    .in("year", years)
  if (error) {
    if (/column .* does not exist|42703|schema cache/i.test(error.message)) {
      throw new Error(
        "Run scripts/fargo-results-harden-setup.sql in Supabase SQL Editor before staging Fargo batches.",
      )
    }
    throw new Error(error.message)
  }
  return (data ?? []) as Record<string, unknown>[]
}

async function loadExistingFargoBouts(
  admin: SupabaseClient,
  proposed: FargoBoutProposed[],
): Promise<Record<string, unknown>[]> {
  const years = [...new Set(proposed.map((p) => p.year))]
  if (!years.length) return []
  const { data, error } = await admin
    .from("fargo_bouts")
    .select(
      "id, year, style, gender, age_division, weight_class, athlete_name, opponent_name, round, result_type, score, win, match_order, source_match_id, verification_status",
    )
    .in("year", years)
  if (error) {
    if (/does not exist|42P01|42703|schema cache/i.test(error.message)) {
      throw new Error(
        "Run scripts/fargo-results-harden-setup.sql and scripts/fargo-bouts-full-setup.sql before staging Fargo bouts.",
      )
    }
    throw new Error(error.message)
  }
  return (data ?? []) as Record<string, unknown>[]
}

export async function buildDiffsForDataset(
  admin: SupabaseClient,
  dataset: DatasetKey,
  proposed:
    | DualTeamProposed[]
    | PlacerProposed[]
    | ClassificationProposed[]
    | FargoProposed[]
    | FargoBoutProposed[],
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
  if (dataset === DATASET_FARGO) {
    const rows = proposed as FargoProposed[]
    const existing = await loadExistingFargo(admin, rows)
    return diffFargoRows(rows, existing)
  }
  if (dataset === DATASET_FARGO_BOUTS) {
    const rows = proposed as FargoBoutProposed[]
    const existing = await loadExistingFargoBouts(admin, rows)
    return diffFargoBoutRows(rows, existing)
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

function parseFargoBoutPayload(json: unknown): FargoBoutProposed[] {
  const root = json as { records?: unknown[]; bouts?: unknown[] } | unknown[]
  const list = Array.isArray(root)
    ? root
    : Array.isArray(root?.records)
      ? root.records
      : Array.isArray(root?.bouts)
        ? root.bouts
        : null
  if (!list) throw new Error("Fargo bout JSON must be an array or { records|bouts: [...] }")
  const out: FargoBoutProposed[] = []
  for (const item of list) {
    if (!item || typeof item !== "object") continue
    const r = item as Record<string, unknown>
    const year = Number(r.year)
    const athlete_name = String(r.athlete_name ?? "").trim()
    const weight_class = String(r.weight_class ?? "").trim()
    if (!Number.isFinite(year) || !athlete_name || !weight_class) continue
    out.push({
      year,
      style: String(r.style ?? "FS").toUpperCase() === "GR" ? "GR" : "FS",
      gender: String(r.gender ?? "M").toUpperCase() === "F" ? "F" : "M",
      age_division: String(r.age_division ?? "Junior"),
      weight_class,
      athlete_name,
      athlete_id: r.athlete_id != null ? String(r.athlete_id) : null,
      athlete_state: r.athlete_state != null ? String(r.athlete_state) : null,
      athlete_club: r.athlete_club != null ? String(r.athlete_club) : null,
      opponent_name: r.opponent_name != null ? String(r.opponent_name) : null,
      opponent_state: r.opponent_state != null ? String(r.opponent_state) : null,
      opponent_club: r.opponent_club != null ? String(r.opponent_club) : null,
      round: r.round != null ? String(r.round) : null,
      result_type: r.result_type != null ? String(r.result_type) : null,
      score: r.score != null ? String(r.score) : null,
      win: Boolean(r.win),
      match_order: r.match_order != null ? Number(r.match_order) : null,
      source_event_id: r.source_event_id != null ? String(r.source_event_id) : null,
      source_bracket_id: r.source_bracket_id != null ? String(r.source_bracket_id) : null,
      source_match_id: r.source_match_id != null ? String(r.source_match_id) : null,
      source_url: r.source_url != null ? String(r.source_url) : null,
      source_adapter: r.source_adapter != null ? String(r.source_adapter) : null,
      source_payload: r.source_payload ?? null,
    })
  }
  return out
}

export async function stageImportBatch(admin: SupabaseClient, input: StageInput) {
  let proposed:
    | DualTeamProposed[]
    | PlacerProposed[]
    | ClassificationProposed[]
    | FargoProposed[]
    | FargoBoutProposed[] = []
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
  } else if (input.dataset === DATASET_FARGO) {
    if (input.json != null) {
      proposed = parseFargoPayload(input.json)
    } else if (input.text?.trim()) {
      proposed = parseFargoCsv(input.text, {
        year: year ?? null,
        source_label: input.source_label ?? null,
        source_url: input.source_url ?? null,
      })
    } else {
      throw new Error("Fargo staging requires JSON records or CSV text")
    }
    if (!year && proposed.length) {
      year = Math.max(...(proposed as FargoProposed[]).map((p) => p.year))
    }
  } else if (input.dataset === DATASET_FARGO_BOUTS) {
    if (input.json != null) {
      proposed = parseFargoBoutPayload(input.json)
    } else {
      throw new Error("Fargo bout staging requires JSON { bouts|records: [...] }")
    }
    if (!year && proposed.length) {
      year = Math.max(...(proposed as FargoBoutProposed[]).map((p) => p.year))
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
