#!/usr/bin/env npx tsx
/**
 * A wrestler's FINISH at a national event, derived from the placement bouts we already hold.
 *
 * `super32_results`, `nhsca_placements` and `fargo_results` were only ever built for North
 * Carolina - 983 of 986 Super 32 rows are NC, all 1,000 NHSCA rows are. So a Virginia wrestler's
 * Super 32 matches show on his profile and his FINISH does not, which is the credential a college
 * coach actually scans for.
 *
 * It does not need collecting. We imported whole national brackets, so the placement bouts are in
 * `other_tournament_bouts` for every wrestler in the field: the winner of the Finals is 1st, the
 * loser 2nd, and so on down to 7th/8th. Muse validated the identical derivation against the held
 * placers files for NHSCA 2023 and 2024 and reproduced them exactly, 664/664 and 662/662.
 *
 *   npx tsx scripts/derive-national-placements.ts --state VA [--validate <csv>]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { nameWords } from "@/lib/athlete-name-match"
import { normalizeState } from "@/lib/athlete-state"

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
const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? String(process.argv[i + 1]) : undefined
}
const STATE = normalizeState(arg("state"))
const VALIDATE = arg("validate")
const nn = (v: unknown) => nameWords(String(v ?? "")).join(" ").toLowerCase()

/** The placement bout and what winning or losing it means. */
const PLACE_ROUND: Array<[RegExp, number, number]> = [
  [/^finals?$|^1st place( match)?$|^championship$/i, 1, 2],
  [/^3rd place( match)?$/i, 3, 4],
  [/^5th place( match)?$/i, 5, 6],
  [/^7th place( match)?$/i, 7, 8],
]

async function main() {
  if (!STATE) throw new Error("--state is required")
  const ath: Array<{ id: string; name: string }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("athletes").select("id,name").eq("state", STATE).order("id").range(from, from + 999)
    if (error) throw new Error(error.message)
    ath.push(...((data ?? []) as typeof ath))
    if (!data || data.length < 1000) break
  }
  const byName = new Map<string, string>()
  for (const a of ath) byName.set(nn(a.name), a.id)

  const found: Array<{ name: string; event: string; year: number; division: string; weight: string; place: number }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("other_tournament_bouts")
      .select("event_key,event_name,year,division,weight_class,round,athlete_name,win")
      .or("event_key.like.nhsca-nationals%,event_key.like.super32%,event_key.like.fargo%")
      .order("id")
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    for (const r of data ?? []) {
      const hit = PLACE_ROUND.find(([re]) => re.test(String(r.round ?? "").trim()))
      if (!hit) continue
      if (!byName.has(nn(r.athlete_name))) continue
      found.push({
        name: String(r.athlete_name),
        event: String(r.event_key).replace(/-\d{4}.*$/, ""),
        year: Number(r.year),
        division: String(r.division ?? ""),
        weight: String(r.weight_class ?? ""),
        place: r.win ? hit[1] : hit[2],
      })
    }
    if (!data || data.length < 1000) break
  }
  console.log(`${STATE}: ${found.length} national placement(s) derived, ${new Set(found.map((f) => nn(f.name))).size} distinct athletes`)
  const byFam = new Map<string, number>()
  for (const f of found) byFam.set(f.event, (byFam.get(f.event) ?? 0) + 1)
  for (const [k, v] of [...byFam].sort()) console.log(`   ${k.padEnd(20)} ${v}`)

  if (!VALIDATE) return
  const lines = fs.readFileSync(VALIDATE, "utf8").replace(/\r/g, "").trim().split("\n")
  const cols = lines.shift()!.split(",")
  const idx = (n: string) => cols.indexOf(n)
  const expect = lines.filter((l) => l.trim()).map((l) => {
    const v = l.split(",")
    return { event: v[idx("event")]!.trim(), year: Number(v[idx("year")]), weight: v[idx("weight")]!.trim(), finish: Number(v[idx("finish")]), who: v[idx("wrestler")]!.trim() }
  })
  const famOf = (e: string) => (/nhsca/i.test(e) ? "nhsca-nationals" : /super ?32/i.test(e) ? "super32" : "fargo")
  const mine = new Set(found.map((f) => `${f.event}|${f.year}|${f.weight}|${f.place}|${nn(f.name)}`))
  let ok = 0
  const missing: string[] = []
  for (const e of expect) {
    const k = `${famOf(e.event)}|${e.year}|${e.weight}|${e.finish}|${nn(e.who)}`
    if (mine.has(k)) ok++
    else missing.push(`${e.event} ${e.year} ${e.weight} #${e.finish} ${e.who}`)
  }
  console.log(`\nagainst the validation set: ${ok}/${expect.length} reproduced`)
  for (const m of missing.slice(0, 20)) console.log(`   MISSING  ${m}`)
  if (missing.length > 20) console.log(`   … and ${missing.length - 20} more`)
}
main().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
