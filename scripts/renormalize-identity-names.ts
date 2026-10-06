#!/usr/bin/env npx tsx
/**
 * Re-normalise stored identity names after a change to the name normaliser.
 *
 * `normalized_name` is computed once at seed time, so a fix to `normalizeApostrophes` does not
 * reach rows already written. Folding the backtick split seven wrestlers into two identities each
 * — "K'von Engram" against "K`von Engram" — and they stay split until their stored names agree.
 *
 *   npx tsx scripts/renormalize-identity-names.ts            # dry run
 *   npx tsx scripts/renormalize-identity-names.ts --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { nameWords } from "@/lib/athlete-name-match"

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
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  const rows: Array<{ id: string; canonical_name: string; normalized_name: string; first_name: string | null; last_name: string | null }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("athlete_identities")
      .select("id, canonical_name, normalized_name, first_name, last_name")
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as typeof rows))
    if (!data || data.length < 1000) break
  }
  const stale = rows.filter((r) => r.normalized_name && nn(r.canonical_name) !== r.normalized_name)
  console.log(`identities: ${rows.length}   whose stored name disagrees with the current rule: ${stale.length}`)
  for (const s of stale.slice(0, 8)) console.log(`   "${s.canonical_name}": "${s.normalized_name}" -> "${nn(s.canonical_name)}"`)
  if (!stale.length || !WRITE) { if (stale.length) console.log("\nRe-run with --write."); return }

  let done = 0
  for (const s of stale) {
    const norm = nn(s.canonical_name)
    const words = norm.split(" ")
    const { error } = await sb
      .from("athlete_identities")
      .update({
        normalized_name: norm,
        first_name: words[0] ?? null,
        last_name: words.length > 1 ? words[words.length - 1] : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", s.id)
    /*
     * A collision here means this row is now identical to another identity — which is the point,
     * and the de-duplicator is what merges them. Report it rather than failing the whole run.
     */
    if (error) { console.log(`   "${s.canonical_name}" could not be updated: ${error.message.slice(0, 80)}`); continue }
    done++
  }
  console.log(`\nre-normalised: ${done} of ${stale.length}`)
  console.log(`now re-run: npx tsx scripts/find-duplicate-identities.ts --write`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
