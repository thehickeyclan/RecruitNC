#!/usr/bin/env npx tsx
/**
 * Export NCHSAA state placers for weight classes 103 & 106 (all divisions), years 1990–2026.
 *
 * Output is meant to paste/share with GPT for historical PDF diffs.
 *
 * Usage (from repo root, with .env.local service role):
 *   npx tsx scripts/export-nchsaa-placers-103-106.ts
 *   npx tsx scripts/export-nchsaa-placers-103-106.ts --out ./tmp/nchsaa-103-106-placers.json
 *   npx tsx scripts/export-nchsaa-placers-103-106.ts --include-sq   # also place=0 (SQ)
 *   npx tsx scripts/export-nchsaa-placers-103-106.ts --csv
 *
 * Defaults: place >= 1 (placers only), weights matching 103 and 106 (any formatting).
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function loadEnvFile(rel: string) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
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
    if (!process.env[key]) process.env[key] = val.replace(/\r$/, "").trim()
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

function trimEnv(s: string | undefined) {
  return (s ?? "").replace(/^\s+|\s+$/g, "").replace(/\r/g, "").trim()
}

const YEAR_MIN = 1990
const YEAR_MAX = 2026
const WEIGHT_TARGETS = new Set([103, 106])

function parseArgs(argv: string[]) {
  let out = path.join(root, "scripts/data/nchsaa-placers-103-106-1990-2026.json")
  let includeSq = false
  let csv = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--include-sq") includeSq = true
    else if (a === "--csv") csv = true
    else if (a === "--out" && argv[i + 1]) out = path.resolve(root, argv[++i])
    else if (!a.startsWith("-")) out = path.resolve(root, a)
  }
  return { out, includeSq, csv }
}

/** Normalize weight_class text ("106", "106 lbs", "103lb") → number or null. */
function parseWeight(raw: unknown): number | null {
  const s = String(raw ?? "").trim()
  if (!s) return null
  const m = s.match(/(\d{2,3})/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

type Row = {
  year: number
  classification: string | null
  weight_class: string | null
  weight_normalized: number
  place: number | null
  wrestler_name: string | null
  school: string | null
}

async function main() {
  const { out, includeSq, csv } = parseArgs(process.argv.slice(2))
  const url = trimEnv(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL).replace(
    /\/+$/,
    "",
  )
  const key = trimEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE,
  )
  if (!url || !key) {
    console.error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const pageSize = 1000
  const raw: Array<Record<string, unknown>> = []
  let from = 0
  for (;;) {
    let q = supabase
      .from("wrestling_nchsaa_results")
      .select("year, classification, weight_class, place, wrestler_name, school")
      .gte("year", YEAR_MIN)
      .lte("year", YEAR_MAX)
      .order("year", { ascending: true })
      .order("classification", { ascending: true })
      .order("weight_class", { ascending: true })
      .order("place", { ascending: true })
      .range(from, from + pageSize - 1)

    if (includeSq) {
      q = q.gte("place", 0)
    } else {
      q = q.gte("place", 1)
    }

    const { data, error } = await q
    if (error) {
      console.error("Query failed:", error.message)
      process.exit(1)
    }
    if (!data?.length) break
    raw.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  const rows: Row[] = []
  for (const r of raw) {
    const w = parseWeight(r.weight_class)
    if (w == null || !WEIGHT_TARGETS.has(w)) continue
    rows.push({
      year: Number(r.year),
      classification: r.classification != null ? String(r.classification) : null,
      weight_class: r.weight_class != null ? String(r.weight_class) : null,
      weight_normalized: w,
      place: r.place == null ? null : Number(r.place),
      wrestler_name: r.wrestler_name != null ? String(r.wrestler_name) : null,
      school: r.school != null ? String(r.school) : null,
    })
  }

  rows.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    const ca = a.classification ?? ""
    const cb = b.classification ?? ""
    if (ca !== cb) return ca.localeCompare(cb)
    if (a.weight_normalized !== b.weight_normalized) return a.weight_normalized - b.weight_normalized
    return (a.place ?? 99) - (b.place ?? 99)
  })

  const byYear: Record<string, number> = {}
  const byWeight: Record<string, number> = {}
  const byClass: Record<string, number> = {}
  for (const r of rows) {
    byYear[String(r.year)] = (byYear[String(r.year)] ?? 0) + 1
    byWeight[String(r.weight_normalized)] = (byWeight[String(r.weight_normalized)] ?? 0) + 1
    const c = r.classification || "(null)"
    byClass[c] = (byClass[c] ?? 0) + 1
  }

  const payload = {
    schema_version: "1.0",
    dataset: "nchsaa_state_placers_103_106",
    title: "NCHSAA state placers — 103 & 106 lbs, all divisions, 1990–2026",
    source_table: "wrestling_nchsaa_results",
    filters: {
      year_min: YEAR_MIN,
      year_max: YEAR_MAX,
      weight_classes: [103, 106],
      place_min: includeSq ? 0 : 1,
      include_state_qualifiers: includeSq,
      note: "place=0 is SQ (did not place). Placers are place>=1 (1–8 historically; 1–4 in 2026+).",
    },
    exported_at: new Date().toISOString(),
    record_count: rows.length,
    summary: {
      by_year: byYear,
      by_weight: byWeight,
      by_classification: byClass,
    },
    records: rows,
  }

  fs.mkdirSync(path.dirname(out), { recursive: true })

  if (csv) {
    const csvPath = out.endsWith(".csv") ? out : out.replace(/\.json$/i, "") + ".csv"
    const header = [
      "year",
      "classification",
      "weight_class",
      "weight_normalized",
      "place",
      "wrestler_name",
      "school",
    ]
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.year,
          r.classification,
          r.weight_class,
          r.weight_normalized,
          r.place,
          r.wrestler_name,
          r.school,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ]
    fs.writeFileSync(csvPath, lines.join("\n"), "utf8")
    console.log(`Wrote ${rows.length} rows → ${csvPath}`)
  } else {
    fs.writeFileSync(out, JSON.stringify(payload, null, 2), "utf8")
    console.log(`Wrote ${rows.length} rows → ${out}`)
  }

  console.log(
    JSON.stringify(
      {
        record_count: rows.length,
        years_present: Object.keys(byYear).length,
        weights: byWeight,
        include_sq: includeSq,
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
