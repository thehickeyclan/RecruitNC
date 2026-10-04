#!/usr/bin/env npx tsx
/**
 * The girls' Fargo brackets were stored under the boys' event names. Rename them.
 *
 * scripts/import-fargo-bouts.py picked an event label from the age and the style and never looked
 * at the gender, so every row from a girls' national file was written as "2025 Fargo Junior
 * Freestyle" — 17,774 of them. Two things went wrong with that: a girl's Fargo row on her own
 * profile carried the boys' bracket name, and the event as an event held both fields at once, so
 * anything reading a bracket or a placement out of "Junior Freestyle" was reading a mixed field.
 *
 * Renamed in place rather than re-imported. The rows are right — the same bouts, already matched
 * to profiles — and a delete-and-reload would throw away the athlete_id links and rebuild them
 * from scratch for no gain.
 *
 * event_key is deliberately left alone. lib/other-tournaments.ts fargoEventKey() builds the key
 * from a fargo_results row, which carries no gender, so the boys' key is the only one a girl's
 * bouts can hang from on her profile. Changing it would detach every girl's matches from her own
 * Fargo row — the opposite of the fix.
 *
 *   npx tsx scripts/fix-fargo-girls-event-names.ts          # dry run
 *   npx tsx scripts/fix-fargo-girls-event-names.ts --write
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

/* "2025 Fargo Junior Freestyle" -> "2025 Fargo Junior Women's Freestyle". */
const womensName = (name: string) => name.replace(/\b(Freestyle|Greco-Roman)\b/, "Women's $1")

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")

  const rows: Array<{ event_name: string; source_file: string }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("other_tournament_bouts")
      .select("event_name, source_file")
      .ilike("source_file", "%girls%")
      /*
       * Fargo only. NHSCA and Super 32 run their girls' divisions inside the one tournament and
       * our rows name it that way for both genders — "2026 NHSCA High School Nationals" — which
       * is right, and renaming those would invent two events where the sport has one. Fargo is
       * different: its freestyle brackets really are separate championships.
       */
      .ilike("event_name", "%Fargo%")
      .range(from, from + 999)
    if (error) { console.error(error.message); return }
    rows.push(...((data ?? []) as typeof rows))
    if (!data || data.length < 1000) break
  }

  const groups = new Map<string, number>()
  for (const r of rows) {
    if (/women/i.test(r.event_name)) continue
    groups.set(`${r.source_file}|${r.event_name}`, (groups.get(`${r.source_file}|${r.event_name}`) ?? 0) + 1)
  }
  if (!groups.size) {
    console.log(`nothing to rename — all ${rows.length} rows from girls' files already carry a women's event name`)
    return
  }

  console.log(`rows from a girls' file under a boys' event name: ${[...groups.values()].reduce((a, b) => a + b, 0)}\n`)
  for (const [k, n] of [...groups.entries()].sort()) {
    const [file, name] = k.split("|")
    console.log(`   ${String(n).padStart(6)}  ${name}  ->  ${womensName(name)}`)
    console.log(`           from ${file}`)
  }

  if (!WRITE) { console.log("\nRe-run with --write to rename."); return }

  for (const [k] of [...groups.entries()].sort()) {
    const [file, name] = k.split("|")
    const to = womensName(name)
    if (to === name) { console.log(`SKIPPED (no style in the name): ${name}`); continue }
    const { error } = await sb
      .from("other_tournament_bouts")
      .update({ event_name: to })
      .eq("source_file", file)
      .eq("event_name", name)
    if (error) { console.error(`FAILED ${name}:`, error.message); return }
    console.log(`renamed: ${name} -> ${to}  (${file})`)
  }

  /* Read it back, because an update that silently matched nothing looks identical to a success. */
  const after: Array<{ event_name: string }> = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb
      .from("other_tournament_bouts")
      .select("event_name")
      .ilike("source_file", "%girls%")
      .ilike("event_name", "%Fargo%")
      .range(from, from + 999)
    after.push(...((data ?? []) as typeof after))
    if (!data || data.length < 1000) break
  }
  const left = after.filter((r) => !/women/i.test(r.event_name)).length
  console.log(`\nverified: ${after.length} rows from girls' files, ${left} still under a boys' name`)
}
main()
