#!/usr/bin/env npx tsx
/**
 * Every pair of profiles that might be one wrestler twice, across every state.
 *
 * `scripts/merge-duplicate-athletes.ts` already finds and merges the clean case: identical first
 * token, identical last token, identical class year. That rule is deliberately strict because it
 * feeds a merge, and it finds nothing today. It also cannot see the duplicates we keep actually
 * hitting, each of which was a real wrestler with two pages:
 *
 *   - a nickname the source printed in quotes — `Steven \`Jett\` Johnson` and `Jett Johnson`,
 *     `Henry "Hank" Franklin` and `Henry Franklin`;
 *   - a first name one source shortens — RankWrestlers' "Alexander Gurganus" is Alex Gurganus;
 *   - a surname one source joins or splits — "Easton Stikes" is Easton Stikes-Hampton,
 *     "Gabriella Aguirre Gomez" is Gabriela AguirreGomez;
 *   - the same wrestler entered twice under two class years, which is the one case where the
 *     class year cannot be part of the key.
 *
 * So this is the wider net, and it reports rather than merges. Each pair is graded by what
 * actually agrees, and the grade says how much looking it needs. Nothing here writes: a
 * confirmed pair goes to scripts/merge-duplicate-athletes.ts, which repoints all 78 tables.
 *
 *   npx tsx scripts/scan-duplicate-profiles.ts [--state NC] [--csv] [--all]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { duplicateBlockKeys, sameWrestler, type DuplicateVerdict } from "@/lib/duplicate-athletes"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const args = process.argv.slice(2)
const STATE = args.includes("--state") ? String(args[args.indexOf("--state") + 1]).toUpperCase() : null
const CSV = args.includes("--csv")
const ALL = args.includes("--all")

type Athlete = {
  id: string
  name: string
  wrestling_name: string | null
  highschool: string | null
  state: string | null
  graduationyear: number | null
  gender: string | null
  weightclass: string | null
  claimed_at: string | null
}

async function page<T>(run: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await run(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

const show = (a: Athlete) =>
  `${a.name}${a.wrestling_name ? ` [${a.wrestling_name}]` : ""} · ${a.highschool ?? "no school"} · ${a.state ?? "no state"} ${a.graduationyear ?? "no class"} · ${a.gender ?? "no gender"} · ${a.weightclass ?? "no weight"}${a.claimed_at ? " · CLAIMED" : ""}`

type Pair = DuplicateVerdict & { a: Athlete; b: Athlete }

async function main() {
  const athletes = await page<Athlete>((from, to) => {
    let q = sb.from("athletes").select('id, name, wrestling_name, highschool, state, graduationyear, gender, weightclass, claimed_at').order("id").range(from, to)
    if (STATE) q = q.eq("state", STATE)
    return q
  })
  console.log(`${athletes.length} profiles${STATE ? ` in ${STATE}` : " in every state"}\n`)

  /*
   * Blocking, so this is not twelve million name comparisons: a pair has to share the start of a
   * first name or the start of a surname before it is graded. Both blocks are needed - a split
   * surname changes the surname key, and a shortened first name changes the first-name key.
   */
  const blocks = new Map<string, Athlete[]>()
  const put = (key: string, a: Athlete) => {
    if (!key) return
    blocks.set(key, [...(blocks.get(key) ?? []), a])
  }
  for (const a of athletes) for (const key of duplicateBlockKeys(a)) put(key, a)

  const seen = new Set<string>()
  const pairs: Pair[] = []
  for (const group of blocks.values()) {
    if (group.length < 2 || group.length > 400) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const [a, b] = [group[i]!, group[j]!]
        const key = [a.id, b.id].sort().join("|")
        if (seen.has(key)) continue
        seen.add(key)
        const hit = sameWrestler(a, b)
        if (hit) pairs.push({ ...hit, a, b })
      }
    }
  }

  const order: Array<Pair["grade"]> = ["certain", "likely", "review"]
  pairs.sort((x, y) => order.indexOf(x.grade) - order.indexOf(y.grade) || x.a.name.localeCompare(y.a.name))
  const counts = Object.fromEntries(order.map((g) => [g, pairs.filter((p) => p.grade === g).length]))
  console.log(`candidate pairs: ${pairs.length}  (certain ${counts.certain}, likely ${counts.likely}, review ${counts.review})\n`)

  for (const g of order) {
    const rows = pairs.filter((p) => p.grade === g)
    if (!rows.length) continue
    console.log(`\n${g.toUpperCase()} (${rows.length})`)
    for (const p of ALL ? rows : rows.slice(0, 40)) {
      console.log(`  ${p.why}`)
      console.log(`    ${show(p.a)}`)
      console.log(`    ${show(p.b)}`)
      console.log(`    ${p.a.id}  ${p.b.id}`)
    }
    if (!ALL && rows.length > 40) console.log(`  … ${rows.length - 40} more (--all)`)
  }

  if (CSV) {
    const head = ["grade", "why", "a_id", "a_name", "a_school", "a_state", "a_class", "a_gender", "a_weight", "a_claimed", "b_id", "b_name", "b_school", "b_state", "b_class", "b_gender", "b_weight", "b_claimed"]
    const cell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const lines = pairs.map((p) => [p.grade, p.why, p.a.id, p.a.name, p.a.highschool, p.a.state, p.a.graduationyear, p.a.gender, p.a.weightclass, p.a.claimed_at ? "yes" : "", p.b.id, p.b.name, p.b.highschool, p.b.state, p.b.graduationyear, p.b.gender, p.b.weightclass, p.b.claimed_at ? "yes" : ""].map(cell).join(","))
    const out = path.join(process.env.HOME!, "Downloads", `duplicate-profile-candidates-${new Date().toISOString().slice(0, 10)}.csv`)
    fs.writeFileSync(out, [head.join(","), ...lines].join("\n") + "\n")
    console.log(`\nwrote ${pairs.length} rows -> ${out}`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
