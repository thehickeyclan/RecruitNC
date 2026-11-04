#!/usr/bin/env npx tsx
/**
 * One table: every registered state, what is missing, and which lever moves it.
 *
 * Written 4 Nov 2026 after the same defect was found twice in one day by accident - North
 * Carolina's 2026 folkstyle key and all three of Tennessee's. Both were imported early, against a
 * roster far smaller than today's, before unlinked sides were banked. The key looked populated, so
 * nothing reported it, and a two-time state champion's title bout simply was not on his page.
 *
 * The detector is mirroring, not size. A complete ledger stores BOTH sides of every bout, so its
 * rows come in reverse pairs; a one-sided load does not, whatever its row count. That test needs no
 * cross-state yardstick and no knowledge of what was delivered - NC 2026 read 34% mirrored against
 * 100% for 2024 and 2025, and that was the whole finding.
 *
 * The second column that matters is the class-year ceiling. A placer with no class year cannot be
 * minted and cannot receive bouts (the importers match on a class-year window), so a state's
 * profile count is capped by its grad-year coverage long before anything else. Tennessee passes
 * every data gate with 195 profiles because 1,244 of its 2,288 placer rows carry no year.
 *
 *   npx tsx scripts/all-states-launch-sweep.ts [--state XX] [--full]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { RECRUITING_BRAND } from "@/lib/recruiting/brand"
import { HOME_STATE, inState } from "@/lib/recruiting/states"
import { championshipKeySlug } from "@/lib/athlete-state"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
const ONLY = process.argv.includes("--state") ? String(process.argv[process.argv.indexOf("--state") + 1]).toUpperCase() : null
const FULL = process.argv.includes("--full")

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim()
/*
 * The round, less the per-wrestler "· Bout N" suffix. That suffix is assigned inside each
 * wrestler's own bout list, so the two sides of one bout can carry different numbers - the winner's
 * second bout is the loser's first. Comparing it read a fully two-sided NC 2026 key as 63%.
 * The profile reader removes the same suffix before display.
 */
const roundKey = (s: unknown) => norm(String(s ?? "").replace(/\s*·\s*Bout\s*\d+\s*$/i, ""))

/** Every row of a query, paged by id - never by range, which drifts as rows are written. */
async function pageById<T>(build: (q: any) => any, limit = Infinity): Promise<T[]> {
  const out: T[] = []
  let last = ""
  for (;;) {
    let q = build(sb).order("id").limit(1000)
    if (last) q = q.gt("id", last)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    if (!data?.length) break
    out.push(...(data as T[]))
    last = (data[data.length - 1] as any).id
    if (data.length < 1000 || out.length >= limit) break
  }
  return out
}

type KeyReport = { key: string; rows: number; mirrored: number; linked: number }

/**
 * The freestyle/Greco layer stores ONLY sides that linked to a profile at import time - unlinked
 * sides are dropped, unlike the folkstyle importer which banks them. So a `*-usaw-states-*` key is
 * one-sided by design and its mirroring says nothing; what it needs instead is a re-import after
 * any mint, because it cannot pick up new profiles on its own.
 */
const isFsGrKey = (key: string) => /-usaw-states-/.test(key)

/**
 * Championship bout keys for a state. Derived from the associations its own placer rows name, run
 * through the same `championshipKeySlug` the importer uses - so a state whose keys are named for its
 * association (`tssaa-states-2024`) is found as surely as one named for its code. North Carolina's
 * placements live in `wrestling_nchsaa_results`, not the placers table, so its associations are
 * named here; the FS/GR layer is `<code>-usaw-states-*` in every state.
 */
const EXTRA_ASSOCIATIONS: Record<string, string[]> = { NC: ["NCHSAA", "NCISA"] }

async function boutKeys(state: string, associations: Set<string>): Promise<KeyReport[]> {
  const lower = state.toLowerCase()
  const prefixes = new Set<string>()
  for (const a of [...associations, ...(EXTRA_ASSOCIATIONS[state] ?? [])]) {
    const slug = championshipKeySlug(state, a)
    if (slug) prefixes.add(`${slug}-states-`)
  }
  prefixes.add(`${lower}-usaw-states-`)
  const keys = new Set<string>()
  for (const prefix of prefixes) {
    const rows = await pageById<{ id: string; event_key: string }>((q) =>
      q.from("other_tournament_bouts").select("id,event_key").like("event_key", `${prefix}%`),
    )
    for (const r of rows) keys.add(r.event_key)
  }
  const reports: KeyReport[] = []
  for (const key of [...keys].sort()) {
    const { count } = await sb.from("other_tournament_bouts").select("*", { count: "exact", head: true }).eq("event_key", key)
    /*
     * EVERY row of the key, never a sample. A sampled mirror test counts a pair whose other half
     * fell outside the sample as unmirrored, which read NC's 2025 key - verified 100% two-sided -
     * as 87% and would have sent a complete ledger back for re-import.
     */
    const all = await pageById<any>((q) =>
      q.from("other_tournament_bouts").select("id,weight_class,round,athlete_name,athlete_id,opponent_name").eq("event_key", key),
    )
    const set = new Set(all.map((r) => `${r.weight_class}|${roundKey(r.round)}|${norm(r.athlete_name)}|${norm(r.opponent_name)}`))
    let mirrored = 0
    for (const r of all) if (set.has(`${r.weight_class}|${roundKey(r.round)}|${norm(r.opponent_name)}|${norm(r.athlete_name)}`)) mirrored++
    reports.push({
      key,
      rows: count ?? 0,
      mirrored: all.length ? Math.round((mirrored / all.length) * 100) : 0,
      linked: all.filter((r) => r.athlete_id).length,
    })
  }
  return reports
}

async function main() {
  const states = RECRUITING_BRAND.states.filter((s) => !ONLY || s.code === ONLY)
  const out: string[] = []
  const flags: string[] = []
  console.log(`\n${"state".padEnd(6)}${"live".padEnd(6)}${"placers".padEnd(9)}${"yr%".padEnd(6)}${"profiles".padEnd(10)}${"sides".padEnd(8)}mirrored`)
  console.log("-".repeat(64))
  for (const s of states) {
    /*
     * North Carolina's placements live in `wrestling_nchsaa_results`, not the placers table, and
     * that table carries no class year - the year is on the profile. So NC's rows are counted from
     * its own table and its class-year column reads n/a rather than 0%, which looked like the worst
     * state in the sweep when it is the baseline.
     */
    const isHome = s.code === HOME_STATE
    const placers = isHome
      ? (await pageById<any>((q) => q.from("wrestling_nchsaa_results").select("id,place,classification"))).map((r) => ({
          ...r,
          grad_year: undefined,
          association: r.classification === "NCISA" ? "NCISA" : "NCHSAA",
        }))
      : await pageById<any>((q) =>
          q.from("state_tournament_placers").select("id,place,grad_year,season,association").eq("state", s.code),
        )
    const associations = new Set(placers.map((r) => String(r.association ?? "")).filter(Boolean))
    const placed = placers.filter((r) => r.place)
    const withYear = placers.filter((r) => r.grad_year != null).length
    const yearPct = isHome ? null : placers.length ? Math.round((withYear / placers.length) * 100) : 0
    const { count: profiles } = await inState(
      sb.from("athletes").select("*", { count: "exact", head: true }),
      s.code,
    )
      .gte("graduationyear", 2027)
      .lte("graduationyear", 2030)
    const keys = await boutKeys(s.code, associations)
    const sides = keys.reduce((n, k) => n + k.rows, 0)
    const folkstyle = keys.filter((k) => !isFsGrKey(k.key) && k.rows)
    const worst = folkstyle.length ? Math.min(...folkstyle.map((k) => k.mirrored)) : 0
    const mirrorLabel = folkstyle.length
      ? `${worst}%${folkstyle.length > 1 ? ` (worst of ${folkstyle.length})` : ""}`
      : keys.length
        ? "FS/GR only"
        : "no ledger"
    console.log(
      `${s.code.padEnd(6)}${String(s.live).padEnd(6)}${String(placers.length).padEnd(9)}${String(yearPct == null ? "n/a" : `${yearPct}%`).padEnd(6)}${String(profiles ?? 0).padEnd(10)}${String(sides).padEnd(8)}${mirrorLabel}`,
    )
    // A folkstyle ledger below 90% mirrored was loaded one-sided: re-import the complete set.
    for (const k of keys) {
      if (!k.rows || isFsGrKey(k.key)) continue
      if (k.mirrored < 90) flags.push(`  ${s.code} ${k.key}: ${k.rows} rows, only ${k.mirrored}% mirrored - one-sided load, re-import the complete set`)
    }
    if (yearPct != null && placers.length && yearPct < 60) flags.push(`  ${s.code}: only ${yearPct}% of ${placers.length} placer rows carry a class year - the profile ceiling, needs a grad-year pass`)
    if (placed.length && !sides) flags.push(`  ${s.code}: ${placed.length} placed rows and NO bout ledger - results with no matches behind them`)
    if (FULL) for (const k of keys) out.push(`  ${s.code} ${k.key.padEnd(28)} ${String(k.rows).padStart(6)} rows · ${k.mirrored}% mirrored`)
  }
  if (FULL && out.length) console.log(`\nevery key:\n${out.join("\n")}`)
  console.log(`\n${flags.length} thing(s) to fix:`)
  console.log(flags.length ? flags.join("\n") : "  nothing - every state's ledgers are two-sided and class years are covered")
}

main().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
