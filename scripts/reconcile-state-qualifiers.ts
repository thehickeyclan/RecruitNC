#!/usr/bin/env npx tsx
/**
 * Reconcile the qualifier files against the database, group by group.
 *
 * A net total is exactly what hid the problem: 43 groups disagreed, some because rows had never
 * imported and some because stale rows from an older collection were still there, and the two
 * cancelled to a 0.3% difference that read like rounding. Only a per-group comparison shows it.
 *
 *   npx tsx scripts/reconcile-state-qualifiers.ts <dir> [<dir>...]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const DIRS = process.argv.slice(2).map((d) => d.replace(/^~/, process.env.HOME ?? "~"))

function csv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "").trim()
  if (!text) return []
  const rows: string[][] = []
  let row: string[] = []
  let cur = ""
  let q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ",") { row.push(cur); cur = "" }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = "" }
    else if (ch !== "\r") cur += ch
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  const cols = (rows.shift() ?? []).map((c) => c.trim())
  return rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(cols.map((c, i) => [c, (r[i] ?? "").trim()])))
}

async function main() {
  const onDisk = new Map<string, number>()
  for (const dir of DIRS) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".csv"))) {
      for (const r of csv(path.join(dir, f))) {
        const state = String(r.state ?? "").trim().toUpperCase()
        const k = `${state}|${r.season}|${r.gender === "girls" ? "Girls" : "Boys"}`
        onDisk.set(k, (onDisk.get(k) ?? 0) + 1)
      }
    }
  }
  const inDb = new Map<string, number>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("state_tournament_placers").select("state, season, gender").range(from, from + 999)
    if (error) throw new Error(error.message)
    for (const r of (data ?? []) as Array<{ state: string; season: number; gender: string }>) {
      const k = `${r.state}|${r.season}|${r.gender}`
      inDb.set(k, (inDb.get(k) ?? 0) + 1)
    }
    if (!data || data.length < 1000) break
  }

  /* North Carolina is held in wrestling_nchsaa_results on purpose and is not expected here. */
  const keys = [...new Set([...onDisk.keys(), ...inDb.keys()])].filter((k) => !k.startsWith("NC|")).sort()
  const rows = keys.map((k) => ({ k, disk: onDisk.get(k) ?? 0, db: inDb.get(k) ?? 0 }))
  const diffs = rows.filter((r) => r.disk !== r.db)
  const diskTotal = rows.reduce((n, r) => n + r.disk, 0)
  const dbTotal = rows.reduce((n, r) => n + r.db, 0)
  console.log(`groups: ${rows.length}   on disk: ${diskTotal}   in the database: ${dbTotal}   net: ${dbTotal - diskTotal}`)
  console.log(`groups that agree exactly: ${rows.length - diffs.length}/${rows.length}`)
  if (!diffs.length) { console.log("\nevery group reconciles."); return }
  console.log(`\ngroups that differ: ${diffs.length}`)
  for (const d of diffs.sort((a, b) => Math.abs(b.db - b.disk) - Math.abs(a.db - a.disk))) {
    const why = d.disk === 0 ? "in the database but not in any file — an older collection" : d.db === 0 ? "in the files but never imported" : "counts differ"
    console.log(`   ${d.k.padEnd(20)} disk ${String(d.disk).padStart(5)}  db ${String(d.db).padStart(5)}  ${d.db - d.disk > 0 ? "+" : ""}${d.db - d.disk}   ${why}`)
  }
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
