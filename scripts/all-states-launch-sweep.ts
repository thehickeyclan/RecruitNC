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

type KeyReport = { key: string; rows: number; mirrored: number; linked: number; soloRows: number }

/**
 * The freestyle/Greco layer USED to store only the sides that linked to a profile at import time,
 * so a `*-usaw-states-*` key was one-sided by design and its mirroring said nothing. That is no
 * longer true: since 4 Nov 2026 `import-usaw-fsgr-states.ts` banks every side, and every FS/GR key
 * has been reloaded through it. So FS/GR keys are held to the same mirroring test as folkstyle, and
 * a key that fails it is a stale load to re-import, not a design feature. The one key still carrying
 * the old shape is `nc-usaw-states-2026`, loaded by an earlier importer from three CSVs that are no
 * longer on disk - it is meant to appear in the worklist until they are re-delivered.
 */

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
    /*
     * A row whose opponent is not named has no other side to find - a bye, or a forfeit where the
     * source prints only the wrestler who advanced. Counting it as unmirrored read Maryland's
     * freshly loaded, fully two-sided 2026 key as 66%: 194 of that package's 640 bouts name one
     * side only. So these rows leave the test rather than failing it, and are counted separately.
     */
    const pairs = all.filter((r) => norm(r.opponent_name))
    let mirrored = 0
    for (const r of pairs) if (set.has(`${r.weight_class}|${roundKey(r.round)}|${norm(r.opponent_name)}|${norm(r.athlete_name)}`)) mirrored++
    reports.push({
      key,
      rows: count ?? 0,
      mirrored: pairs.length ? Math.round((mirrored / pairs.length) * 100) : 100,
      linked: all.filter((r) => r.athlete_id).length,
      soloRows: all.length - pairs.length,
    })
  }
  return reports
}

async function main() {
  const states = RECRUITING_BRAND.states.filter((s) => !ONLY || s.code === ONLY)
  const out: string[] = []
  const flags: string[] = []
  console.log(
    `\n${"state".padEnd(6)}${"live".padEnd(6)}${"placers".padEnd(9)}${"yr%".padEnd(6)}${"qual%".padEnd(7)}${"profiles".padEnd(10)}${"ceiling".padEnd(9)}${"sides".padEnd(8)}mirrored`,
  )
  console.log("-".repeat(82))
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
          q
            .from("state_tournament_placers")
            .select("id,place,grad_year,season,association,wrestler_name,gender")
            .eq("state", s.code),
        )
    const associations = new Set(placers.map((r) => String(r.association ?? "")).filter(Boolean))
    const placed = placers.filter((r) => r.place)
    /*
     * Class-year coverage is measured over PLACED rows, not every row. The placer table holds the
     * whole field - every qualifier, place null - and several packages apply a class year only to
     * the rows that placed, by design. Measuring over all rows mixed the two: Texas landed 1,465 of
     * its 1,471 placed rows with a year, 99.6%, and read 40% because 2,192 qualifiers who never
     * placed carry none. A placed row with no year is the real ceiling, because that is the row
     * that would have become a profile.
     */
    const withYear = placed.filter((r) => r.grad_year != null).length
    const yearPct = isHome ? null : placed.length ? Math.round((withYear / placed.length) * 100) : 0

    /*
     * yr% answers "are this state's PLACERS resolved". It does not answer "how many profiles will
     * this state have", and those turned out to be different questions. Profiles are minted from
     * the whole state field, qualifiers included, so the volume is set by the class-year coverage
     * of the UNPLACED rows - and that is where the states diverge. Tennessee passes every gate with
     * 195 profiles against South Carolina's 784 on a similar number of placed rows, because 76% of
     * SC's qualifier rows carry a year and 14% of TN's do. 647 of SC's profiles never placed.
     *
     *   ceiling - distinct wrestlers in a current class, which is every profile this state can mint
     *   qual%   - of the unplaced rows, how many carry a class year
     */
    const who = (r: any) => `${norm(r.wrestler_name)}|${String(r.gender ?? "").toLowerCase().startsWith("f") || /girl/i.test(String(r.gender)) ? "g" : "b"}`
    const unplaced = placers.filter((r) => !r.place)
    const qualPct = isHome ? null : unplaced.length ? Math.round((unplaced.filter((r) => r.grad_year != null).length / unplaced.length) * 100) : null
    const currentClass = placers.filter((r) => Number(r.grad_year) >= 2027 && Number(r.grad_year) <= 2030)
    const ceiling = isHome ? null : new Set(currentClass.map(who)).size
    /* Wrestlers with no year at all, and how many of them wrestled in the latest season held. */
    const latestSeason = Math.max(0, ...placers.map((r) => Number(r.season) || 0))
    const noYear = placers.filter((r) => r.grad_year == null)
    const unknownWrestlers = new Set(noYear.map(who))
    const unknownLatest = new Set(noYear.filter((r) => Number(r.season) === latestSeason).map(who))
    const { count: profiles } = await inState(
      sb.from("athletes").select("*", { count: "exact", head: true }),
      s.code,
    )
      .gte("graduationyear", 2027)
      .lte("graduationyear", 2030)
    const keys = await boutKeys(s.code, associations)
    const sides = keys.reduce((n, k) => n + k.rows, 0)
    const loaded = keys.filter((k) => k.rows)
    const worst = loaded.length ? Math.min(...loaded.map((k) => k.mirrored)) : 0
    const mirrorLabel = loaded.length
      ? `${worst}%${loaded.length > 1 ? ` (worst of ${loaded.length})` : ""}`
      : "no ledger"
    console.log(
      `${s.code.padEnd(6)}${String(s.live).padEnd(6)}${String(placers.length).padEnd(9)}${String(yearPct == null ? "n/a" : `${yearPct}%`).padEnd(6)}${String(qualPct == null ? "n/a" : `${qualPct}%`).padEnd(7)}${String(profiles ?? 0).padEnd(10)}${String(ceiling == null ? "n/a" : ceiling).padEnd(9)}${String(sides).padEnd(8)}${mirrorLabel}`,
    )
    // A folkstyle ledger below 90% mirrored was loaded one-sided: re-import the complete set.
    for (const k of keys) {
      if (!k.rows) continue
      if (k.mirrored < 90) flags.push(`  ${s.code} ${k.key}: ${k.rows} rows, only ${k.mirrored}% mirrored - one-sided load, re-import the complete set`)
    }
    if (yearPct != null && placed.length && yearPct < 90) flags.push(`  ${s.code}: only ${yearPct}% of ${placed.length} PLACED rows carry a class year (${placed.length - withYear} short) - the profile ceiling, needs a grad-year pass`)
    if (placed.length && !sides) flags.push(`  ${s.code}: ${placed.length} placed rows and NO bout ledger - results with no matches behind them`)
    /*
     * The profile-volume flag. 60% is South Carolina's shape rounded down - it reached 76% and 784
     * profiles, so a state well under that is not short of data, it is short of class years on the
     * qualifiers it already holds.
     */
    if (qualPct != null && unplaced.length >= 200 && qualPct < 60) {
      flags.push(
        `  ${s.code}: only ${qualPct}% of ${unplaced.length} QUALIFIER rows carry a class year - caps profiles at ${ceiling}; ${unknownWrestlers.size} wrestlers have no year, ${unknownLatest.size} of them wrestled in ${latestSeason}`,
      )
    }
    if (ceiling != null && profiles != null && ceiling - profiles > 25) {
      flags.push(`  ${s.code}: ${ceiling} wrestlers in a current class but only ${profiles} profiles - ${ceiling - profiles} mintable and not minted`)
    }
    if (FULL) for (const k of keys) out.push(`  ${s.code} ${k.key.padEnd(28)} ${String(k.rows).padStart(6)} rows · ${k.mirrored}% mirrored${k.soloRows ? ` · ${k.soloRows} with no opponent named` : ""}`)
  }
  if (FULL && out.length) console.log(`\nevery key:\n${out.join("\n")}`)
  console.log(`\n${flags.length} thing(s) to fix:`)
  console.log(flags.length ? flags.join("\n") : "  nothing - every state's ledgers are two-sided and class years are covered")
}

main().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
