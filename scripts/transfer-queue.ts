#!/usr/bin/env npx tsx
/**
 * The worked version of state-readiness's transfer-or-namesake queue, for adjudication.
 *
 * `scripts/state-readiness.ts` reports the COUNT and the names on every run; this writes the
 * evidence behind each one to docs/state-launch/TRANSFER-QUEUE.md. A placement that reaches no
 * profile although a profile of that name exists in the same state is either a wrestler who
 * transferred or two wrestlers who share a name, and the minter cannot tell them apart - out of
 * state there is no school list to rule out a namesake.
 *
 * Both tests that settled Tripp Price (two wrestlers at CAC and Pottsville, not one who moved) are
 * computed per wrestler rather than left to be eyeballed:
 *   - CONCURRENT seasons at two schools - he cannot wrestle for both at once;
 *   - class years DISAGREEING across the rows.
 * Either one firing means two people. Neither firing is the benign shape, not a verdict.
 *
 * Weight spread is reported because it is what made Cameron Moats worth proving rather than
 * assuming, and whether each row is a PLACEMENT or a qualifier entry, because a wrestler whose only
 * podium finish is the unlinked row has nothing on his profile until it is settled.
 *
 *   npx tsx scripts/transfer-queue.ts --states AR,VA,SC [--out <path>]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { namesReferToSamePerson } from "@/lib/athlete-name-match"
import { currentClassYears } from "@/lib/class-years"

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
const arg = (n: string, d?: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? String(process.argv[i + 1]) : d
}
const STATES = String(arg("states", "AR,VA,SC")).split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
/*
 * Cases already settled by adjudication, so the queue stops asking.
 *
 * A "namesake" verdict is permanent: the placement belongs to a different wrestler and must never
 * be linked. A "hold" is open but worked - RankWrestlers cannot verify it, and it waits on
 * non-RW evidence rather than on anybody looking at it again. Neither is un-triaged work, and a
 * queue that cannot say so grows into noise nobody reads.
 */
type Adjudicated = { state: string; name: string; verdict: "namesake" | "hold"; batch?: number; date?: string; note?: string }
function adjudicated(): Adjudicated[] {
  const f = "docs/state-launch/TRANSFER-ADJUDICATED.json"
  if (!fs.existsSync(f)) return []
  try { return (JSON.parse(fs.readFileSync(f, "utf8")).cases ?? []) as Adjudicated[] } catch { return [] }
}
const SETTLED = adjudicated()
const verdictFor = (state: string, name: string) =>
  SETTLED.find((c) => c.state.toUpperCase() === state.toUpperCase() && c.name.trim().toLowerCase() === name.trim().toLowerCase())
const OUT = String(arg("out", "docs/state-launch/TRANSFER-QUEUE.md"))
const CURRENT = currentClassYears()

type Row = Record<string, any>

async function placersOf(state: string): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("state_tournament_placers")
      .select("id,season,place,weight,classification,association,wrestler_name,school_clean,school_raw,athlete_id,grad_year")
      .eq("state", state)
      .order("id")
      .range(from, from + 999)
    if (error) throw new Error(`${state}: ${error.message}`)
    rows.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

async function main() {
  const out: string[] = []
  let total = 0
  let open = 0
  let settledNamesake = 0
  let settledHold = 0
  for (const state of STATES) {
    const rows = await placersOf(state)
    const ids = [...new Set(rows.map((r) => r.athlete_id).filter(Boolean))] as string[]
    const prof = new Map<string, Row>()
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await sb.from("athletes").select("id,name,highschool,graduationyear,gender").in("id", ids.slice(i, i + 200))
      for (const a of (data ?? []) as Row[]) prof.set(a.id, a)
    }
    const unlinked = rows.filter(
      (r) => !r.athlete_id && r.place != null && r.grad_year != null && CURRENT.includes(Number(r.grad_year)),
    )
    const byProfile = new Map<string, Row[]>()
    for (const u of unlinked) {
      const hit = [...prof.values()].find((a) => namesReferToSamePerson(String(a.name ?? ""), String(u.wrestler_name ?? "")))
      if (!hit) continue
      if (!byProfile.has(hit.id)) byProfile.set(hit.id, [])
      byProfile.get(hit.id)!.push(u)
    }
    total += [...byProfile.values()].flat().length
    for (const [pid, us] of byProfile) {
      const v = verdictFor(state, String(prof.get(pid)?.name ?? ""))
      if (v?.verdict === "namesake") settledNamesake += us.length
      else if (v?.verdict === "hold") settledHold += us.length
      else open += us.length
    }
    out.push(`\n## ${state} — ${byProfile.size} wrestler(s), ${[...byProfile.values()].flat().length} unlinked placement(s)\n`)
    for (const [pid, us] of byProfile) {
      const p = prof.get(pid)!
      const linked = rows.filter((r) => r.athlete_id === pid)
      const all = [...us, ...linked].sort((a, b) => a.season - b.season)
      const school = (r: Row) => r.school_clean || r.school_raw || "?"
      const seasonsU = new Set(us.map((r) => r.season))
      const concurrent = [...new Set(linked.map((r) => r.season))].filter((s) => seasonsU.has(s))
      const years = [...new Set(all.map((r) => r.grad_year).filter(Boolean))]
      const weights = [...new Set(all.map((r) => Number(r.weight)).filter((n) => Number.isFinite(n)))].sort((a, b) => a - b)
      /*
       * A wrestler whose ONLY podium finish is the unlinked row has an empty profile until this is
       * settled - South Carolina's Jonah Coleman is a state champion whose two linked rows are
       * qualifier entries with no place at all. That is a different urgency from a transfer whose
       * profile already shows a podium.
       */
      const linkedPodium = linked.filter((r) => r.place != null).length
      const settled = verdictFor(state, String(p.name ?? ""))
    const tag = settled ? (settled.verdict === "namesake" ? " · SETTLED: NAMESAKE, never link" : " · HELD: awaiting non-RW evidence") : ""
    out.push(`### ${p.name} — profile ${p.highschool ?? "no school"}, class of ${p.graduationyear ?? "?"} · ${pid}${tag}`)
      for (const r of all) {
        const place = r.place == null ? "qualifier, no place" : `#${r.place}`
        out.push(`  - ${r.season} ${school(r)} · ${r.classification} ${r.weight} ${place} · class ${r.grad_year ?? "—"} · ${r.athlete_id ? "LINKED" : "UNLINKED"}`)
      }
      out.push(
        `  verdict inputs: concurrent seasons ${concurrent.length ? `YES (${concurrent.join(", ")}) <- PRICE SIGNATURE` : "none"}` +
          ` · class years ${years.length > 1 ? `DISAGREE (${years.join(" vs ")})` : `agree (${years[0] ?? "—"})`}` +
          ` · weights ${weights.join(", ")}${weights.length > 1 ? ` (spread ${weights[weights.length - 1]! - weights[0]!} lb)` : ""}`,
      )
      if (settled?.note) out.push(`  adjudicated (batch ${settled.batch ?? "?"}, ${settled.date ?? "?"}): ${settled.note}`)
      if (!linkedPodium) out.push(`  NOTE: every podium finish this wrestler has is in the unlinked row(s) - the profile shows none until this is settled.`)
      out.push("")
    }
  }
  const header = `# Transfer-or-namesake queue — ${new Date().toISOString().slice(0, 10)}

Generated by \`npx tsx scripts/transfer-queue.ts --states ${STATES.join(",")}\`. Do not hand-edit;
\`scripts/state-readiness.ts\` reports the same queue's names on every run.

A placement that reaches no profile although a profile of that name exists in the same state is
either a wrestler who transferred or two wrestlers who share a name. Each wrestler's rows are listed
together, linked and unlinked, with both tests that settled Tripp Price computed: CONCURRENT seasons
at two schools, or class years DISAGREEING across the rows.

**Either test firing means two people. NEITHER firing means nothing.** These are computed from
PLACEMENTS, and placements can be sequential while the underlying careers are concurrent - a
wrestler who placed in alternating years at two schools looks benign here and is two people in the
dated records. Adjudication batch #2 found exactly that three times (Garrett Short, Jesse Justice,
Nathan Taylor), all three of which this file had called benign. Only dated per-season records
settle a case; what follows is the worklist and the evidence to start from, never the verdict.

${total} unlinked placement(s) across ${STATES.join(", ")}: **${open} awaiting adjudication**, ${settledHold} held
for want of non-RW evidence, ${settledNamesake} settled as namesakes that must never be linked
(docs/state-launch/TRANSFER-ADJUDICATED.json). Nothing here has been linked or merged.
`
  fs.writeFileSync(OUT, header + out.join("\n") + "\n")
  console.log(`${total} unlinked placement(s) across ${STATES.join(", ")} -> ${OUT}`)
}
main().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
