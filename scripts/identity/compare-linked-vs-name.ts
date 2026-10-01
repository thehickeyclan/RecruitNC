/**
 * Step 2 check: for every athlete, what the profile shows today (the real name-matching loader)
 * against the results stored for him in result_athlete_links. Read-only.
 *
 *   npx tsx --require <server-only stub> scripts/identity/compare-linked-vs-name.ts
 *
 * Results are keyed by event family, year and weight, so a row matches whatever source table or
 * merge produced it.
 */
import { createClient } from "@supabase/supabase-js"
import { writeFileSync } from "fs"
import { loadAthleteTournamentBundle } from "../../lib/athlete-tournament-bundle"

const FAMILY: Record<string, string> = {
  wrestling_nchsaa_results: "NCHSAA",
  nhsca_placements: "NHSCA",
  wrestling_nhsca_results: "NHSCA",
  super32_results: "Super 32",
  fargo_results: "Fargo",
  other_tournament_results: "Other",
}
// KEY=year compares one result per event per year - the way the profile dedupes (a wrestler enters
// NHSCA, States or Super 32 once a year). The default also keys on weight.
const W = (w: unknown) => (process.env.KEY === "year" ? "*" : String(w ?? "").match(/\d{2,3}/)?.[0] ?? "?")

async function all(admin: any, table: string, select: string, filter?: (q: any) => any) {
  const out: any[] = []
  for (let from = 0; ; from += 1000) {
    let q = admin.from(table).select(select).order("id").range(from, from + 999)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const links = await all(admin, "result_athlete_links", "source_table,source_id,athlete_id", (q) => q.eq("status", "linked"))
  const byTable = new Map<string, string[]>()
  for (const l of links) byTable.set(l.source_table, [...(byTable.get(l.source_table) ?? []), l.source_id])
  const sourceById = new Map<string, any>()
  const cols: Record<string, string> = {
    wrestling_nchsaa_results: "id,year,weight_class,place,classification",
    nhsca_placements: "id,year,weight_class,placement,record,division",
    wrestling_nhsca_results: "id,year,weight,placement,division",
    super32_results: "id,year,weight_class,placement,record",
    fargo_results: "id,year,weight_class,placement,record,division,style",
    other_tournament_results: "id,year,weight_class,placement,record,event_short_name,event_name",
  }
  for (const [t, ids] of byTable) {
    if (!cols[t]) continue
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await admin.from(t).select(cols[t]).in("id", ids.slice(i, i + 200))
      for (const r of (data ?? []) as any[]) sourceById.set(`${t}|${r.id}`, { ...r, table: t })
    }
  }
  const linkedByAthlete = new Map<string, any[]>()
  for (const l of links) {
    const r = sourceById.get(`${l.source_table}|${l.source_id}`)
    if (!r) continue
    linkedByAthlete.set(l.athlete_id, [...(linkedByAthlete.get(l.athlete_id) ?? []), r])
  }

  const athletes = await all(admin, "athletes", "*")
  const report: any[] = []
  let i = 0
  async function work() {
    while (i < athletes.length) {
      const a = athletes[i++]
      const b: any = await loadAthleteTournamentBundle(admin as any, a).catch(() => null)
      if (!b) continue
      const nameKeys = new Set<string>([
        ...b.nchsaa.map((r: any) => `NCHSAA|${r.year}|${W(r.weight_class)}`),
        ...b.nhsca.map((r: any) => `NHSCA|${r.year}|${W(r.weight)}`),
        ...b.super32.map((r: any) => `Super 32|${r.year}|${W(r.weight)}`),
        ...b.fargo.map((r: any) => `Fargo|${r.year}|${W(r.weight)}`),
        ...b.other.map((r: any) => `Other|${r.year}|${W(r.weight)}`),
      ])
      const linked = linkedByAthlete.get(a.id) ?? []
      const idKeys = new Set<string>(linked.map((r) => `${FAMILY[r.table]}|${r.year}|${W(r.weight_class ?? r.weight)}`))
      const onlyName = [...nameKeys].filter((k) => !idKeys.has(k))
      const onlyId = [...idKeys].filter((k) => !nameKeys.has(k))
      report.push({ id: a.id, name: a.name, cls: a.graduationyear, shown: nameKeys.size, linked: idKeys.size, onlyName, onlyId })
    }
  }
  await Promise.all(Array.from({ length: 6 }, work))
  const same = report.filter((r) => !r.onlyName.length && !r.onlyId.length).length
  console.log(`athletes ${report.length} | identical ${same} | differ ${report.length - same}`)
  const fam: Record<string, { onlyName: number; onlyId: number }> = {}
  for (const r of report) {
    for (const k of r.onlyName) { const f = k.split("|")[0]; fam[f] = fam[f] ?? { onlyName: 0, onlyId: 0 }; fam[f].onlyName++ }
    for (const k of r.onlyId) { const f = k.split("|")[0]; fam[f] = fam[f] ?? { onlyName: 0, onlyId: 0 }; fam[f].onlyId++ }
  }
  console.table(fam)
  writeFileSync(process.env.OUT ?? "/tmp/compare.json", JSON.stringify(report))
}
main().catch((e) => { console.error(e); process.exit(1) })
