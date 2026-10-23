#!/usr/bin/env npx tsx
/**
 * Record which state tournaments the state did NOT sanction.
 *
 * Everything is sanctioned unless a row says otherwise, so this only ever writes the exceptions.
 * Today that is West Virginia's girls: the WVSSAC does not sanction girls' wrestling until
 * 2026-27, so the 2024, 2025 and 2026 events were the WV Girls State Invitational, and a title
 * there is not a state championship.
 *
 * Needs the column first:
 *   ALTER TABLE state_tournament_divisions
 *     ADD COLUMN IF NOT EXISTS sanctioned boolean NOT NULL DEFAULT true;
 *
 *   npx tsx scripts/set-state-event-sanctioning.ts [--write]
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

/** Every event a state ran but did not sanction, with why. */
const UNSANCTIONED: Array<{ state: string; gender: string; seasons: number[]; why: string }> = [
  {
    state: "WV",
    gender: "Girls",
    seasons: [2024, 2025, 2026],
    why: "WVSSAC sanctioning of girls' wrestling begins 2026-27 (Board vote 2026-02-18); these were the WV Girls State Invitational, run in Huntington.",
  },
]

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  for (const rule of UNSANCTIONED) {
    const { data, error } = await sb
      .from("state_tournament_divisions")
      .select("id, season, association, gender, classification")
      .eq("state", rule.state)
      .eq("gender", rule.gender)
      .in("season", rule.seasons)
    if (error) {
      console.error(`${rule.state} ${rule.gender}: ${error.message}`)
      continue
    }
    console.log(`${rule.state} ${rule.gender}: ${(data ?? []).length} divisions`)
    console.log(`   ${rule.why}`)
    for (const d of data ?? []) console.log(`   - ${d.season} "${d.classification}"`)
    if (!WRITE) continue
    const { error: e2, count } = await sb
      .from("state_tournament_divisions")
      .update({ sanctioned: false }, { count: "exact" })
      .eq("state", rule.state)
      .eq("gender", rule.gender)
      .in("season", rule.seasons)
    console.log(e2 ? `   FAILED: ${e2.message}` : `   marked ${count ?? 0} unsanctioned`)
  }
  if (!WRITE) console.log("\nRe-run with --write once the column exists.")
}
main().catch((e) => {
  console.error("FAILED:", e.message)
  process.exit(1)
})
