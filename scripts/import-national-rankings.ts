/**
 * Import a monthly national ranking edition — the only thing that grants a 5-star rating.
 *
 *   npx tsx scripts/import-national-rankings.ts \
 *     --file scripts/data/flo-2026-09.csv \
 *     --source flowrestling \
 *     --month 2026-09 \
 *     [--scope weight] [--dry-run]
 *
 * CSV columns (header row, order does not matter):
 *   rank, athlete_name, weight_class, class_year, high_school, state, source_url
 *
 * Re-running replaces that source's edition for that month, so a corrected file can simply
 * be re-imported. After the write it prunes to the three most recent editions.
 *
 * Athletes are matched with the same strict matcher the qualifier import uses: exact name or
 * a known nickname, never a shared surname. An unmatched row is kept as part of the edition
 * but grants nobody a star — crediting a national ranking to the wrong wrestler is worse
 * than missing one.
 */

import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"
import { buildAthleteIndex, matchAthlete, tidy, type MatchableAthlete } from "../lib/other-tournament-import"
import { NATIONAL_RANKING_SOURCES, type NationalRankingSource } from "../lib/national-rankings"

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(process.cwd(), file)
    if (!fs.existsSync(full)) continue
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      const eq = line.indexOf("=")
      if (eq < 1 || line.trimStart().startsWith("#")) continue
      const key = line.slice(0, eq).trim()
      if (process.env[key]) continue
      process.env[key] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
    }
  }
}

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`)
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1]!
  if (fallback !== undefined) return fallback
  throw new Error(`Missing required --${name}`)
}

const DRY_RUN = process.argv.includes("--dry-run")

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const split = (line: string) => {
    const out: string[] = []
    let cell = ""
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++ }
        else if (ch === '"') quoted = false
        else cell += ch
      } else if (ch === '"') quoted = true
      else if (ch === ",") { out.push(cell); cell = "" }
      else cell += ch
    }
    out.push(cell)
    return out.map((c) => tidy(c))
  }
  const header = split(lines[0]!).map((h) => h.toLowerCase().replace(/\s+/g, "_"))
  return lines.slice(1).map((line) => {
    const cells = split(line)
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]))
  })
}

async function main() {
  loadEnv()

  const file = arg("file")
  const source = arg("source") as NationalRankingSource
  if (!(source in NATIONAL_RANKING_SOURCES)) {
    throw new Error(`--source must be one of: ${Object.keys(NATIONAL_RANKING_SOURCES).join(", ")}`)
  }
  const month = arg("month")
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("--month must look like 2026-09")
  const rankingMonth = `${month}-01`
  const scope = arg("scope", "weight")

  const rows = parseCsv(fs.readFileSync(file, "utf8"))
  console.log(`Parsed ${rows.length} ranking rows from ${path.basename(file)}`)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: roster, error } = await supabase
    .from("athletes")
    .select('id, name, wrestling_name, highschool, "wrestlingClub", graduationyear')
  if (error) throw new Error(`Loading athletes: ${error.message}`)
  const index = buildAthleteIndex((roster ?? []) as MatchableAthlete[])

  let matched = 0
  const payload = rows.map((row) => {
    const name = row.athlete_name ?? row.name ?? ""
    /**
     * Only North Carolina rows are resolved to a profile.
     *
     * Every athlete in this database is an NC wrestler, so a ranked wrestler listed in
     * another state who happens to share a name is not one of them — and linking them would
     * hand that NC kid a five-star rating off somebody else's ranking. Out-of-state rows are
     * still stored: they are how a win over a nationally ranked opponent gets recognised.
     */
    const rowState = String(row.state ?? "").trim().toUpperCase()
    const isNorthCarolina = rowState === "NC" || rowState === ""
    const outcome = isNorthCarolina
      ? matchAthlete(name, row.high_school ?? "", index)
      : ({ status: "unmatched" } as const)
    const athleteId = outcome.status === "matched" ? outcome.athlete.id : null
    if (athleteId) matched += 1
    return {
      source,
      ranking_month: rankingMonth,
      athlete_id: athleteId,
      athlete_name: name,
      rank: Number(row.rank) || 0,
      scope,
      weight_class: row.weight_class || null,
      class_year: row.class_year ? Number(row.class_year) : null,
      high_school: row.high_school || null,
      state: row.state || null,
      source_url: row.source_url || null,
    }
  }).filter((r) => r.athlete_name && r.rank > 0)

  console.log(`Matched ${matched} of ${payload.length} to NC profiles (the rest are out-of-state, as expected)`)
  for (const r of payload.filter((p) => p.athlete_id)) {
    console.log(`   ✓ #${r.rank} ${r.athlete_name}${r.weight_class ? ` (${r.weight_class})` : ""}`)
  }

  if (DRY_RUN) {
    console.log(`\nDRY RUN — would write ${payload.length} rows for ${source} ${month}.`)
    return
  }

  const { error: clearError } = await supabase
    .from("national_rankings")
    .delete()
    .eq("source", source)
    .eq("ranking_month", rankingMonth)
    .eq("scope", scope)
  if (clearError) throw new Error(`Clearing edition: ${clearError.message}`)

  for (let i = 0; i < payload.length; i += 500) {
    const { error: insertError } = await supabase.from("national_rankings").insert(payload.slice(i, i + 500))
    if (insertError) throw new Error(`Inserting: ${insertError.message}`)
  }

  // Keep three editions. Enforced here so it never depends on somebody remembering.
  const { data: pruned } = await supabase.rpc("prune_national_rankings")
  console.log(`\nWrote ${payload.length} rows for ${NATIONAL_RANKING_SOURCES[source]} ${month}.`)
  console.log(`Granting a 5-star rating to ${matched} NC athletes.`)
  if (typeof pruned === "number" && pruned > 0) {
    console.log(`Pruned ${pruned} rows from editions older than the retained three.`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
