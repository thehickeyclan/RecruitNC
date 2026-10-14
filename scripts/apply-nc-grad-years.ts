#!/usr/bin/env npx tsx
/**
 * Write class years onto North Carolina athlete profiles from a resolution file.
 *
 * The 756 profiles minted for the 2026 state tournament were born without a class year, because
 * nothing we held carried one: 25 of 758 had a year anywhere, and exactly one had a usable grade
 * on an in-season row. A profile with no class year cannot be ranked or boarded, so these arrive
 * afterwards, in the same delta shape South Carolina used.
 *
 * Same two guards as the SC loader, both earned: a name listed twice under different schools is
 * matched on school as well (two Michael Browns, Laurens and Pickens); a year that precedes a
 * season the wrestler competed in is refused outright (Calvin Cook's 2024 against a 2025
 * tournament). Never overwrites a year already on a profile.
 *
 *   npx tsx scripts/apply-nc-grad-years.ts --file <csv> [--file <csv>] [--write]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { schoolsLikelySame } from "@/lib/athlete-name-match"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const WRITE = process.argv.includes("--write")
const FILES = process.argv.reduce<string[]>((acc, a, i) => (a === "--file" ? [...acc, String(process.argv[i + 1])] : acc), [])
const key = (s: unknown) => {
  const t = String(s ?? "").toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 1)
  return t.length < 2 ? "" : `${t[0]} ${t[t.length - 1]}`
}
function parse(p: string) {
  const lines = fs.readFileSync(p, "utf8").split("\n").filter((l) => l.trim())
  const hdr = lines[0]!.split(",").map((h) => h.trim())
  return lines.slice(1).map((l) => {
    const c: string[] = []
    let cur = "", q = false
    for (const ch of l) {
      if (ch === '"') q = !q
      else if (ch === "," && !q) { c.push(cur); cur = "" }
      else cur += ch
    }
    c.push(cur)
    const o: Record<string, string> = {}
    hdr.forEach((h, i) => (o[h] = (c[i] ?? "").trim()))
    return o
  })
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const rows = FILES.flatMap(parse).filter((r) => r.grad_year && !String(r.status ?? "").startsWith("CONFLICT"))
  console.log(`resolution rows to apply: ${rows.length}`)

  const ath: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("athletes").select("id, name, highschool, graduationyear").range(from, from + 999)
    if (error) throw new Error(error.message)
    ath.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const nchsaa: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from("wrestling_nchsaa_results").select("wrestler_name, year").range(from, from + 999)
    nchsaa.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const earliest = new Map<string, number>()
  for (const r of nchsaa) {
    const k = key(r.wrestler_name); if (!k) continue
    const y = Number(r.year)
    if (Number.isFinite(y)) earliest.set(k, Math.min(earliest.get(k) ?? y, y))
  }
  const byName = new Map<string, any[]>()
  for (const a of ath) { const k = key(a.name); if (!k) continue; const v = byName.get(k) ?? []; v.push(a); byName.set(k, v) }
  /*
   * Two files disagreeing about ONE wrestler's class year is a contradiction and both rows are
   * dropped. Two wrestlers who share a name at different schools are not: there are two Liam
   * Jacksons in the 2026 field, an Apex Friendship senior and a Polk County sophomore, and
   * keying the check on the name alone threw away both - including the one still in school.
   * The year is compared per name AND school, which is how the profile is picked below.
   */
  const perName = new Map<string, Set<string>>()
  for (const r of rows) { const k = `${key(r.name)}|${key(r.school)}`; if (!key(r.name)) continue; const v = perName.get(k) ?? new Set<string>(); v.add(r.grad_year); perName.set(k, v) }
  const dupCount = new Map<string, number>()
  for (const r of rows) dupCount.set(key(r.name), (dupCount.get(key(r.name)) ?? 0) + 1)

  const plan: Array<{ id: string; grad: number; name: string }> = []
  const skip = { noProfile: 0, disagree: 0, impossible: 0, already: 0, ambiguous: 0 }
  for (const r of rows) {
    const k = key(r.name)
    if ((perName.get(`${k}|${key(r.school)}`)?.size ?? 0) > 1) { skip.disagree++; console.log(`   disagree: ${r.name} (${r.school}) — ${[...perName.get(`${k}|${key(r.school)}`)!].join(" vs ")}`); continue }
    let hits = byName.get(k) ?? []
    if ((dupCount.get(k) ?? 0) > 1) hits = hits.filter((h) => schoolsLikelySame(h.highschool, r.school))
    if (!hits.length) { skip.noProfile++; continue }
    if (hits.length > 1) {
      const narrowed = hits.filter((h) => schoolsLikelySame(h.highschool, r.school))
      if (narrowed.length !== 1) { skip.ambiguous++; continue }
      hits = narrowed
    }
    const first = earliest.get(k)
    if (first != null && Number(r.grad_year) < first) { skip.impossible++; console.log(`   impossible: ${r.name} wrestled ${first}, resolution says ${r.grad_year}`); continue }
    for (const h of hits) {
      if (h.graduationyear) { skip.already++; continue }
      plan.push({ id: String(h.id), grad: Number(r.grad_year), name: String(r.name) })
    }
  }
  console.log(`profiles to update: ${plan.length}`)
  console.log(`skipped — no profile ${skip.noProfile}, ambiguous ${skip.ambiguous}, years disagree ${skip.disagree}, impossible ${skip.impossible}, already set ${skip.already}`)
  if (!WRITE) { console.log("\nDRY RUN"); return }
  const stamp = new Date().toISOString().slice(0, 10)
  fs.writeFileSync(`ranking-snapshots/nc-grad-year-backup-${stamp}.json`, JSON.stringify(ath.filter((a) => plan.some((p) => p.id === String(a.id))), null, 2))
  let ok = 0
  for (const p of plan) {
    const { error } = await sb.from("athletes").update({ graduationyear: p.grad }).eq("id", p.id)
    if (!error) ok++
  }
  console.log(`\nwrote ${ok} of ${plan.length}`)
}
main().catch((e) => { console.error("failed:", e.message); process.exit(1) })
