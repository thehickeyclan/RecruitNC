#!/usr/bin/env npx tsx
/**
 * Give a result row the profile its own bouts already reach.
 *
 * The two tables are matched separately, and a bout row often wins where the result row lost: the
 * bracket names a wrestler's club on every bout line, while a placement list may carry nothing.
 * At the 2026 Frank E. Rader Southeast Regional, 13 NC girls' bouts reached a profile and only 6
 * of their placement rows did - so their matches showed on the profile and their 1st, 3rd and 5th
 * place finishes did not.
 *
 * Only ever within one event and one name, and only onto a row that has no athlete_id. Where the
 * bouts for a name disagree about the profile, nothing is written.
 *
 *   npx tsx scripts/link-results-from-bouts.ts [--event-key KEY] [--write]
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
const ONE_KEY = (() => {
  const i = process.argv.indexOf("--event-key")
  return i > 0 ? process.argv[i + 1] : null
})()
const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ")

async function page<T>(table: string, select: string, build?: (q: ReturnType<typeof sb.from>) => unknown): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(select).range(from, from + 999) as never
    if (build) q = build(q as never) as never
    const { data, error } = await (q as unknown as Promise<{ data: T[] | null; error: { message: string } | null }>)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  type Bout = { event_key: string; athlete_name: string; athlete_id: string | null }
  type Result = { id: string; event_key: string; event_name: string; athlete_name: string; athlete_id: string | null }
  const bouts = await page<Bout>("other_tournament_bouts", "event_key, athlete_name, athlete_id", (q) =>
    ONE_KEY ? (q as never as { eq: (a: string, b: string) => unknown }).eq("event_key", ONE_KEY) : q,
  )
  const results = await page<Result>("other_tournament_results", "id, event_key, event_name, athlete_name, athlete_id", (q) =>
    ONE_KEY ? (q as never as { eq: (a: string, b: string) => unknown }).eq("event_key", ONE_KEY) : q,
  )

  /* One profile per (event, name), and only when every bout for that name agrees. */
  const claims = new Map<string, Set<string>>()
  for (const b of bouts) {
    if (!b.athlete_id) continue
    const k = `${b.event_key}|${norm(b.athlete_name)}`
    if (!claims.has(k)) claims.set(k, new Set())
    claims.get(k)!.add(b.athlete_id)
  }
  const fixes: Array<{ id: string; athlete_id: string; label: string }> = []
  let disagreed = 0
  for (const r of results) {
    if (r.athlete_id) continue
    const ids = claims.get(`${r.event_key}|${norm(r.athlete_name)}`)
    if (!ids?.size) continue
    if (ids.size > 1) { disagreed++; continue }
    fixes.push({ id: r.id, athlete_id: [...ids][0]!, label: `${r.event_name} — ${r.athlete_name}` })
  }
  console.log(`result rows with no profile that their own bouts can supply: ${fixes.length}`)
  console.log(`   bouts disagreed about the profile, left alone: ${disagreed}`)
  const byEvent = new Map<string, number>()
  for (const f of fixes) byEvent.set(f.label.split(" — ")[0]!, (byEvent.get(f.label.split(" — ")[0]!) ?? 0) + 1)
  for (const [k, v] of [...byEvent].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`   ${String(v).padStart(4)}  ${k.slice(0, 68)}`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }
  let done = 0
  for (const f of fixes) {
    const { error } = await sb.from("other_tournament_results").update({ athlete_id: f.athlete_id, updated_at: new Date().toISOString() }).eq("id", f.id).is("athlete_id", null)
    if (error) { console.error(`  ${f.label}: ${error.message}`); continue }
    done++
  }
  console.log(`\nlinked ${done} result rows`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
