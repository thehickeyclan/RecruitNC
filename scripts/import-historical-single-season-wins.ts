#!/usr/bin/env npx tsx
/**
 * Import NCHSAA single-season most victories JSON into winningest_wrestlers.
 *
 * Prerequisites:
 *   - scripts/historical-record-sources-and-winningest-extend.sql applied in Supabase
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   - JSON at --file (default scripts/data/nc_wrestling_most_victories_canonical_v1.json)
 *
 * Usage:
 *   npm run import:historical-wins -- --file ./scripts/data/nc_wrestling_most_victories_canonical_v1.json --dry-run
 *   npm run import:historical-wins -- --file ./scripts/data/nc_wrestling_most_victories_canonical_v1.json --purge-legacy
 */

import fs from "fs"
import path from "path"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import {
  HISTORICAL_WINS_DATASET_KEY,
  HISTORICAL_WINS_SOURCE_KEY,
  HISTORICAL_WINS_VERSION,
} from "../lib/historical-wins/constants"
import { formatTiedRank } from "../lib/historical-wins/display"
import {
  matchHistoricalAthlete,
  normalizeHistoricalName,
  type AthleteMatchCandidate,
  type SchoolMatchCandidate,
} from "../lib/historical-wins/match"
import { parseHistoricalWinsDataset, parseSeasonYears } from "../lib/historical-wins/schema"

const root = path.resolve(__dirname, "..")

function loadEnvFile(rel: string) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) return
  const text = fs.readFileSync(p, "utf8")
  for (const line of text.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    val = val.replace(/\r$/, "").trim()
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

function trimEnv(s: string | undefined) {
  return (s ?? "").replace(/^\s+|\s+$/g, "").replace(/\r/g, "").trim()
}

function parseArgs(argv: string[]) {
  let file = path.join(root, "scripts/data/nc_wrestling_most_victories_canonical_v1.json")
  let dryRun = false
  let purgeLegacy = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--dry-run") dryRun = true
    else if (a === "--purge-legacy") purgeLegacy = true
    else if (a === "--file" && argv[i + 1]) {
      file = path.resolve(root, argv[++i])
    } else if (!a.startsWith("-")) {
      file = path.resolve(root, a)
    }
  }
  return { file, dryRun, purgeLegacy }
}

async function loadSchools(supabase: SupabaseClient): Promise<SchoolMatchCandidate[]> {
  const { data, error } = await supabase.from("schools").select("id, name").limit(5000)
  if (error) {
    console.warn("[schools]", error.message)
    return []
  }
  return (data ?? [])
    .filter((r) => r.id && r.name)
    .map((r) => ({ id: String(r.id), name: String(r.name) }))
}

async function loadAthleteCandidates(
  supabase: SupabaseClient,
  names: string[],
): Promise<AthleteMatchCandidate[]> {
  const out: AthleteMatchCandidate[] = []
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))]
  const chunk = 40
  for (let i = 0; i < unique.length; i += chunk) {
    const slice = unique.slice(i, i + chunk)
    const or = slice
      .map((n) => `name.ilike.${n.replace(/[,]/g, "")}`)
      .join(",")
    // PostgREST: use eq via filter - ILIKE pattern without wildcards ≈ case-insensitive equality
    const { data, error } = await supabase
      .from("athletes")
      .select("id, name, highschool, graduationyear")
      .or(or)
      .limit(500)
    if (error) {
      // Fallback: one-by-one exact-ish
      for (const n of slice) {
        const { data: rows } = await supabase
          .from("athletes")
          .select("id, name, highschool, graduationyear")
          .ilike("name", n)
          .limit(20)
        for (const r of rows ?? []) {
          if (r.id && r.name) {
            out.push({
              id: String(r.id),
              name: String(r.name),
              highschool: r.highschool ?? null,
              graduationyear: r.graduationyear ?? null,
            })
          }
        }
      }
      continue
    }
    for (const r of data ?? []) {
      if (r.id && r.name) {
        out.push({
          id: String(r.id),
          name: String(r.name),
          highschool: r.highschool ?? null,
          graduationyear: r.graduationyear ?? null,
        })
      }
    }
  }
  return out
}

async function normalizeSchoolViaDb(
  supabase: SupabaseClient,
  schoolName: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("normalize_school_name", {
    input_name: schoolName,
  })
  if (error) return null
  return typeof data === "string" && data.trim() ? data.trim() : null
}

async function main() {
  const { file, dryRun, purgeLegacy } = parseArgs(process.argv.slice(2))
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
  const key = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!fs.existsSync(file)) {
    console.error("File not found:", file)
    console.error("Place nc_wrestling_most_victories_canonical_v1.json or pass --file")
    process.exit(1)
  }

  let raw: unknown
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"))
  } catch (e) {
    console.error("Invalid JSON:", e instanceof Error ? e.message : e)
    process.exit(1)
  }

  let dataset
  try {
    dataset = parseHistoricalWinsDataset(raw)
  } catch (e: unknown) {
    console.error("Validation failed:")
    if (e && typeof e === "object" && "issues" in e) {
      console.error(JSON.stringify((e as { issues: unknown }).issues, null, 2))
    } else {
      console.error(e instanceof Error ? e.message : e)
    }
    process.exit(1)
  }

  console.log(`Validated ${dataset.records.length} records · dataset=${dataset.dataset}`)
  console.log(`dryRun=${dryRun} purgeLegacy=${purgeLegacy}`)
  console.log(`file=${file}`)

  if (!url || !key) {
    if (dryRun) {
      console.log("Dry-run OK (validation only — no Supabase credentials for match preview).")
      process.exit(0)
    }
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(url.replace(/\/+$/, ""), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const schools = await loadSchools(supabase)
  const names = dataset.records.map((r) => r.name)
  const athletes = await loadAthleteCandidates(supabase, names)
  const athletesByNorm = new Map<string, AthleteMatchCandidate[]>()
  for (const a of athletes) {
    const k = normalizeHistoricalName(a.name)
    const list = athletesByNorm.get(k) ?? []
    list.push(a)
    athletesByNorm.set(k, list)
  }

  const uniqueSchools = [...new Set(dataset.records.map((r) => r.school))]
  const schoolCanon = new Map<string, string | null>()
  for (const s of uniqueSchools) {
    schoolCanon.set(s, await normalizeSchoolViaDb(supabase, s))
  }

  type RowStatus = "matched" | "unmatched" | "needs_review"
  const stats = {
    matched: 0,
    unmatched: 0,
    needs_review: 0,
    inserts: 0,
    updates: 0,
    skipped_manual: 0,
  }

  const rows = []
  for (const rec of dataset.records) {
    const { start, end } = parseSeasonYears(rec.season)
    const candidates = athletesByNorm.get(normalizeHistoricalName(rec.name)) ?? []
    const match = matchHistoricalAthlete({
      sourceName: rec.name,
      sourceSchool: rec.school,
      seasonEndYear: end,
      athleteCandidates: candidates,
      schoolCandidates: schools,
      dbCanonicalSchool: schoolCanon.get(rec.school) ?? null,
    })
    const st = match.match_status as RowStatus
    stats[st]++

    rows.push({
      rank_position: formatTiedRank(rec.rank, rec.tie),
      rank_numeric: rec.rank,
      is_tied: rec.tie,
      wrestler_name: rec.name,
      school: rec.school,
      record: rec.record,
      wins: rec.wins,
      losses: rec.losses,
      year: rec.season,
      season_start_year: start,
      season_end_year: end,
      source_record_id: rec.id,
      athlete_id: match.athlete_id,
      school_id: match.school_id,
      match_status: match.match_status,
      match_confidence: match.match_confidence,
      match_reasons: match.proposed_athlete_id
        ? [...match.match_reasons, `proposed_athlete:${match.proposed_athlete_id}`]
        : match.match_reasons,
      source_payload: rec,
    })
  }

  console.log(
    `Match preview: matched=${stats.matched} needs_review=${stats.needs_review} unmatched=${stats.unmatched}`,
  )

  if (dryRun) {
    console.log("Dry-run complete — no writes.")
    const sample = rows.slice(0, 3).map((r) => ({
      id: r.source_record_id,
      name: r.wrestler_name,
      school: r.school,
      status: r.match_status,
      athlete_id: r.athlete_id,
    }))
    console.log("Sample:", JSON.stringify(sample, null, 2))
    process.exit(0)
  }

  const now = new Date().toISOString()
  const { data: sourceRow, error: sourceErr } = await supabase
    .from("historical_record_sources")
    .upsert(
      {
        source_key: HISTORICAL_WINS_SOURCE_KEY,
        title: dataset.title,
        dataset_key: HISTORICAL_WINS_DATASET_KEY,
        version: HISTORICAL_WINS_VERSION,
        source_type: "nchsaa_record_book",
        metadata: {
          schema_version: dataset.schema_version,
          ranking_method: dataset.ranking_method ?? null,
          record_count: dataset.record_count,
        },
        updated_at: now,
      },
      { onConflict: "dataset_key,version" },
    )
    .select("id")
    .single()

  if (sourceErr || !sourceRow?.id) {
    console.error("Source upsert failed:", sourceErr?.message || "no id")
    console.error("Did you run scripts/historical-record-sources-and-winningest-extend.sql?")
    process.exit(1)
  }

  const sourceId = sourceRow.id as string
  console.log(`Source id=${sourceId}`)

  // Existing rows for this source (preserve manual review)
  const { data: existing } = await supabase
    .from("winningest_wrestlers")
    .select("id, source_record_id, match_status, athlete_id, school_id")
    .eq("source_id", sourceId)

  const existingByRecord = new Map(
    (existing ?? []).map((r) => [String(r.source_record_id), r]),
  )

  const upsertPayload = rows.map((r) => {
    const prev = existingByRecord.get(r.source_record_id)
    const preserveManual =
      prev &&
      (prev.match_status === "manually_confirmed" || prev.match_status === "manually_rejected")

    if (preserveManual) stats.skipped_manual++

    return {
      source_id: sourceId,
      source_record_id: r.source_record_id,
      rank_position: r.rank_position,
      rank_numeric: r.rank_numeric,
      is_tied: r.is_tied,
      wrestler_name: r.wrestler_name,
      school: r.school,
      record: r.record,
      wins: r.wins,
      losses: r.losses,
      year: r.year,
      season_start_year: r.season_start_year,
      season_end_year: r.season_end_year,
      source_payload: r.source_payload,
      athlete_id: preserveManual ? prev.athlete_id : r.athlete_id,
      school_id: preserveManual ? prev.school_id : r.school_id,
      match_status: preserveManual ? prev.match_status : r.match_status,
      match_confidence: preserveManual ? undefined : r.match_confidence,
      match_reasons: preserveManual ? undefined : r.match_reasons,
      updated_at: now,
    }
  })

  // Upsert in chunks
  const batchSize = 100
  for (let i = 0; i < upsertPayload.length; i += batchSize) {
    const batch = upsertPayload.slice(i, i + batchSize)
    const { error } = await supabase.from("winningest_wrestlers").upsert(batch, {
      onConflict: "source_id,source_record_id",
      ignoreDuplicates: false,
    })
    if (error) {
      // PostgREST may not support partial unique as onConflict — try without and report
      console.error("Upsert batch failed:", error.message, error.details || "")
      console.error(
        "Hint: ensure unique index winningest_wrestlers_source_record_uq exists, or use a full UNIQUE(source_id, source_record_id) constraint.",
      )
      process.exit(1)
    }
    for (const b of batch) {
      if (existingByRecord.has(b.source_record_id)) stats.updates++
      else stats.inserts++
    }
  }

  if (purgeLegacy) {
    const { error: delErr, count } = await supabase
      .from("winningest_wrestlers")
      .delete({ count: "exact" })
      .is("source_id", null)
    if (delErr) {
      console.error("purge-legacy failed:", delErr.message)
      process.exit(1)
    }
    console.log(`Purged legacy rows (source_id null): ${count ?? "?"}`)
  }

  const { count: finalCount, error: countErr } = await supabase
    .from("winningest_wrestlers")
    .select("id", { count: "exact", head: true })
    .eq("source_id", sourceId)

  if (countErr) {
    console.error("Count failed:", countErr.message)
    process.exit(1)
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        source_id: sourceId,
        inserts: stats.inserts,
        updates: stats.updates,
        matched: stats.matched,
        needs_review: stats.needs_review,
        unmatched: stats.unmatched,
        skipped_manual: stats.skipped_manual,
        rows_for_source: finalCount,
        expected: dataset.record_count,
      },
      null,
      2,
    ),
  )

  if (finalCount !== dataset.record_count) {
    console.error(
      `FAIL: expected ${dataset.record_count} rows for source, got ${finalCount}`,
    )
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
