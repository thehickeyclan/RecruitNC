#!/usr/bin/env npx tsx
/**
 * Run the Flo commitment sync from a terminal.
 *
 * Dry by default: it reads Flo, works out every change and every match, and writes nothing.
 * --write applies the full-key matches and records the rest.
 *
 *   npx tsx scripts/sync-flo-commitments.ts [--write] [--all]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { runCommitmentSync } from "@/lib/college-commitments/run"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const WRITE = process.argv.includes("--write")
const ALL = process.argv.includes("--all")

async function main() {
  const out = await runCommitmentSync(sb, { dryRun: !WRITE })
  console.log(`${WRITE ? "WROTE" : "DRY RUN — nothing written"}\n`)
  console.log("Lists read:")
  for (const l of out.lists) {
    console.log(`  ${l.error ? "FAILED  " : "        "}${l.title} — class ${l.classYear || "?"}, ${l.gender || "?"}, ${l.rows} rows`)
    console.log(`          ${l.sourceUrl}  retrieved ${l.retrievedAt}${l.error ? `\n          ${l.error}` : ""}`)
  }
  console.log(`\nRows read: ${out.rowsRead}`)
  console.log(`Changes: ${out.counts.added} added · ${out.counts.flipped} flipped · ${out.counts.removed} removed · ${out.counts.corrected} corrected`)
  console.log(`Applied to a profile: ${out.applied.length}`)
  for (const a of out.applied.slice(0, ALL ? out.applied.length : 25)) {
    console.log(`  ${a.athleteName} → ${a.college}${a.previousCollege ? ` (was ${a.previousCollege})` : ""} [${a.change}]`)
  }
  if (!ALL && out.applied.length > 25) console.log(`  … ${out.applied.length - 25} more (--all)`)

  const byReason = new Map<string, number>()
  for (const h of out.held) byReason.set(h.reason, (byReason.get(h.reason) ?? 0) + 1)
  console.log(`\nHeld, unmatched: ${out.held.length}`)
  for (const [reason, n] of [...byReason].sort((a, b) => b[1] - a[1])) console.log(`  ${reason.padEnd(20)} ${n}`)
  const notable = out.held.filter((h) => h.reason !== "no-profile")
  if (notable.length) {
    console.log(`\n  Held for a reason other than "we have no profile" (${notable.length}):`)
    for (const h of notable.slice(0, ALL ? notable.length : 20)) console.log(`   ${h.wrestlerName} (${h.state ?? "?"}, ${h.classYear}) → ${h.college}\n     ${h.reason}: ${h.detail}`)
  }
  if (out.unresolvedColleges.length) {
    console.log(`\nCollege names our program list does not answer to (${out.unresolvedColleges.length}):`)
    console.log(`  ${out.unresolvedColleges.join(", ")}`)
  }
  if (out.recentCommitNotes.length) {
    console.log("\nFlo's own recent-commit notes (corroboration only):")
    for (const n of out.recentCommitNotes.slice(0, 8)) console.log(`  ${n}`)
  }
  if (out.errors.length) {
    console.log("\nErrors:")
    for (const e of out.errors) console.log(`  ${e}`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
