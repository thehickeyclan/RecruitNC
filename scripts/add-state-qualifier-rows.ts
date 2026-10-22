#!/usr/bin/env npx tsx
/**
 * Add qualifier rows to a season that is already loaded, without clearing anything.
 *
 * `import-state-qualifiers.ts` replaces a whole (state, season, gender, association) slice, which
 * is right when the file IS that slice. It is destructive when the file is a part of one: Virginia's
 * 2025 VHSL boys championship arrived as four classifications from FloArena (2A, 3A, 5A, 6A, 839
 * rows) and 1A and 4A separately from a newspaper archive. Loading the 108 late rows through the
 * replacing importer would delete the 839 first — the same shape as the SCISA import that wiped
 * South Carolina's SCHSL boys rows on 15 Oct.
 *
 * So this inserts and never deletes. It refuses outright if any row already exists for a
 * classification in the file, because then the file is a reload and the replacing importer is the
 * right tool.
 *
 *   npx tsx scripts/add-state-qualifier-rows.ts <csv> [--write]
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
const WRITE = process.argv.includes("--write")
const FILE = process.argv.slice(2).find((a) => !a.startsWith("--"))

function parse(p: string): Array<Record<string, string>> {
  const lines = fs.readFileSync(p, "utf8").split("\n").filter((l) => l.trim())
  const hdr = lines[0]!.split(",").map((h) => h.trim().replace(/^﻿/, ""))
  return lines.slice(1).map((l) => {
    const c: string[] = []
    let cur = "", q = false
    for (const ch of l) {
      if (ch === '"') q = !q
      else if (ch === "," && !q) { c.push(cur); cur = "" }
      else cur += ch
    }
    c.push(cur)
    return Object.fromEntries(hdr.map((h, i) => [h, (c[i] ?? "").trim()]))
  })
}

async function main() {
  if (!FILE) { console.error("give the CSV"); process.exit(1) }
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  const rows = parse(FILE)
  const g = (r: Record<string, string>) => (/girl|female|women/i.test(r.gender ?? "") ? "Girls" : "Boys")
  const slices = [...new Set(rows.map((r) => `${r.state}|${r.season}|${g(r)}|${r.association}`))]
  const classes = [...new Set(rows.map((r) => r.division))]
  console.log(`${rows.length} rows · slices: ${slices.join(", ")} · classifications: ${classes.join(", ")}`)
  if (slices.length !== 1) throw new Error("one slice per file, so the refusal below can be trusted")
  const [state, season, gender, association] = slices[0]!.split("|")

  /* A classification already present means this is a reload, not an addition. */
  const { data: held, error } = await sb
    .from("state_tournament_placers")
    .select("classification")
    .eq("state", state!)
    .eq("season", Number(season))
    .eq("gender", gender!)
    .eq("association", association!)
  if (error) throw new Error(error.message)
  const existing = new Set((held ?? []).map((r) => String((r as { classification: string }).classification)))
  console.log(`   already on file for this slice: ${(held ?? []).length} rows across ${[...existing].sort().join(", ") || "nothing"}`)
  const clash = classes.filter((c) => existing.has(c))
  if (clash.length) {
    console.error(`\nREFUSED: ${clash.join(", ")} already loaded. This is a reload — use import-state-qualifiers.ts, which replaces the slice.`)
    process.exit(1)
  }

  const entries = rows.map((r) => ({
    season: Number(r.season),
    state: r.state,
    association: r.association,
    gender: g(r),
    classification: r.division,
    weight: r.weight,
    place: r.place ? Number(r.place) : null,
    wrestler_name: `${r.first_name} ${r.last_name}`.trim(),
    school_raw: r.school || null,
    grad_year: r.grad_year ? Number(r.grad_year) : null,
    wins: r.state_wins ? Number(r.state_wins) : null,
    losses: r.state_losses ? Number(r.state_losses) : null,
    source_url: r.source_url || null,
    source_athlete_id: r.source_wrestler_id || null,
    source_athlete_id_source: r.source_wrestler_id ? r.source : null,
  }))
  console.log(`   to insert: ${entries.length} (placed ${entries.filter((e) => e.place != null).length})`)
  if (!WRITE) { console.log("\nRe-run with --write."); return }
  let done = 0
  for (let i = 0; i < entries.length; i += 500) {
    const { error: e2 } = await sb.from("state_tournament_placers").insert(entries.slice(i, i + 500) as never)
    if (e2) { console.error(`   insert FAILED: ${e2.message}`); break }
    done += entries.slice(i, i + 500).length
  }
  console.log(`\ninserted ${done} of ${entries.length}; nothing was deleted`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
