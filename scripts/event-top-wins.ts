#!/usr/bin/env npx tsx
/**
 * The verified top wins for our wrestlers at one event.
 *
 * Built after the 2026 I-64 Fall Duals, where doing this by hand produced a list that was wrong
 * twice in opposite directions: it claimed a win over a three-time Kentucky state champion that
 * never happened, and it left four real wins out. Both came from judging a name match by eye.
 *
 * Five rules, all of them learned from that:
 *
 *   1. THE EVENT'S STATE WINS. A duals meet in Virginia Beach is full of Virginia club teams.
 *      When a name matches a credential in the host state and another somewhere else, the host
 *      state is the wrestler. Applied by hand afterwards, this rule alone recovered five wins.
 *
 *   2. NO HOST-STATE RECORD PLUS SEVERAL OTHER STATES MEANS UNKNOWN, NOT FAMOUS. "Jackson Wells"
 *      matched a Kentucky champion, so the win was published as a win over a Kentucky champion.
 *      He was a Benedictine eighth grader with no record anywhere. A middle schooler, a private
 *      school wrestler and a kid who never placed all look identical here - absent - so absent
 *      has to mean absent.
 *
 *   3. A WEIGHT PROGRESSION IS NOT AN IDENTITY. 106 -> 113 -> 120 -> 126 across four seasons is
 *      what made the Kentucky match look certain. Weights rise for everyone; the coincidence
 *      proves nothing on its own.
 *
 *   4. THE CLUB IS EVIDENCE. A wrestler's club at an offseason event usually sits in the same
 *      town as his school, so a club name that echoes the school name confirms the identity, and
 *      a club rostered entirely from one region places a wrestler in that region.
 *
 *   5. MATCH ON FIRST AND LAST ONLY. "Tijuan l Powell" matched nothing until the middle initial
 *      came out - and then turned out to have no record at all, which is its own answer.
 *
 * It also prints what it could not see. 204 of 223 wins at I-64 were over wrestlers we hold
 * nothing on, and a list that hides that reads like a complete ranking when it is a thin one.
 *
 *   npx tsx scripts/event-top-wins.ts --event-key i64-fall-duals-2026 --host-state VA
 *   npx tsx scripts/event-top-wins.ts --event-key <key> --host-state <ST> [--our-state NC] [--json out.json]
 */
import fs from "fs"
import path from "path"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { nameKey, resolveOpponent, rankWins, placeWords, lbs, type Credential, type TopWin } from "../lib/event-top-wins"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const arg = (name: string, fallback = "") => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? String(process.argv[i + 1]) : fallback
}

async function pageAll<T>(sb: SupabaseClient, table: string, select: string, build?: (q: any) => any): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(select).range(from, from + 999)
    if (build) q = build(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function main() {
  const eventKey = arg("event-key")
  const hostState = arg("host-state").toUpperCase()
  const ourState = arg("our-state", "NC").toUpperCase()
  if (!eventKey || !hostState) {
    console.error("need --event-key and --host-state (the state the event was held in)")
    process.exit(1)
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  const bouts = await pageAll<any>(sb, "other_tournament_bouts",
    "athlete_name, athlete_id, weight_class, opponent_name, opponent_club, win_type, score, round",
    (q) => q.eq("event_key", eventKey).eq("win", true).eq("is_bye", false).not("athlete_id", "is", null))
  if (!bouts.length) { console.log(`no linked wins for ${eventKey}`); return }

  const ids = [...new Set(bouts.map((b) => String(b.athlete_id)))]
  const prof = new Map<string, any>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await sb.from("athletes").select("id, name, highschool, graduationyear").in("id", ids.slice(i, i + 200))
    for (const a of data ?? []) prof.set(String(a.id), a)
  }

  const byName = new Map<string, Credential[]>()
  const push = (n: string, c: Credential) => { if (!n) return; const v = byName.get(n) ?? []; v.push(c); byName.set(n, v) }
  for (const r of await pageAll<any>(sb, "state_tournament_placers", "wrestler_name, state, season, place, weight, classification, school_raw")) {
    const p = Number(r.place)
    push(nameKey(r.wrestler_name), {
      state: String(r.state ?? ""), place: Number.isFinite(p) && p > 0 ? p : 99, season: lbs(r.season),
      weight: lbs(r.weight), school: String(r.school_raw ?? ""),
      text: `${r.state} ${r.classification ?? ""} state ${p === 1 ? "champion" : p === 2 ? "runner-up" : p === 3 ? "3rd" : `${p}th`} ${r.season} at ${r.weight}`,
    })
  }
  for (const r of await pageAll<any>(sb, "national_rankings", "athlete_name, rank, source, state, high_school")) {
    push(nameKey(r.athlete_name), {
      state: String(r.state ?? ""), place: 0, season: null, weight: null, school: String(r.high_school ?? ""),
      text: `nationally ranked #${r.rank} (${r.source})`,
    })
  }

  const wins: TopWin[] = []
  const skipped: Array<{ b: any; reason: string }> = []
  for (const b of bouts) {
    const bw = lbs(b.weight_class)
    const rows = byName.get(nameKey(b.opponent_name)) ?? []
    const { chosen, reason } = resolveOpponent(rows, hostState, bw, String(b.opponent_club ?? ""))
    if (!chosen) { skipped.push({ b, reason }); continue }
    const p = prof.get(String(b.athlete_id))
    const cw = placeWords(b.opponent_club)
    wins.push({
      wrestler: String(b.athlete_name), wrestlerClass: Number(p?.graduationyear) || null, wrestlerSchool: String(p?.highschool ?? ""),
      weight: bw, winType: String(b.win_type ?? ""), score: String(b.score ?? ""), round: String(b.round ?? ""),
      opponent: String(b.opponent_name), opponentClub: String(b.opponent_club ?? ""),
      credential: chosen, tier: chosen.place,
      sameWeight: bw != null && chosen.weight != null && Math.abs(chosen.weight - bw) <= 2,
      clubConfirmsSchool: [...placeWords(chosen.school)].some((w) => cw.has(w)),
      movedUp: bw != null && chosen.weight != null ? bw - chosen.weight : null,
      confidence: [...placeWords(chosen.school)].some((w) => cw.has(w)) ? "confirmed" : "probable",
    })
  }

  const ranked = rankWins(wins)
  console.log(`\n=== ${ourState} TOP WINS — ${eventKey} (held in ${hostState}) ===`)
  console.log(`${bouts.length} wins by our wrestlers; ${ranked.length} over an opponent we can identify.\n`)
  ranked.forEach((w, i) => {
    const cls = w.wrestlerClass ? `'${String(w.wrestlerClass).slice(2)}` : "—"
    const up = w.movedUp && w.movedUp > 2 ? `  (opponent placed ${w.movedUp} lb lighter)` : ""
    console.log(`${String(i + 1).padStart(2)}. ${w.wrestler} (${w.wrestlerSchool}, ${cls}) ${w.weight} — ${w.winType} ${w.score}`)
    console.log(`     def. ${w.opponent} — ${w.credential.text}  [${w.confidence}]${up}`)
  })

  const noRecord = skipped.filter((s) => s.reason === "no record anywhere").length
  const neverPlaced = skipped.filter((s) => s.reason === "on file but never placed").length
  const ambiguous = skipped.filter((s) => s.reason.includes("shared across") || s.reason.includes("lb off") || s.reason.includes("does not corroborate")).length
  console.log(`\n--- what this list cannot see ---`)
  console.log(`  ${noRecord} wins over wrestlers with no record in our data at all`)
  console.log(`  ${neverPlaced} wins over wrestlers on file who never placed`)
  console.log(`  ${ambiguous} wins thrown out: no host-state record and the name is shared across states`)
  for (const s of skipped.filter((x) => x.reason.includes("shared across") || x.reason.includes("lb off") || x.reason.includes("does not corroborate")))
    console.log(`     ${s.b.athlete_name} def. ${s.b.opponent_name} — ${s.reason}`)
  const out = arg("json")
  if (out) { fs.writeFileSync(out, JSON.stringify({ eventKey, hostState, wins: ranked, skipped: skipped.map((s) => ({ opponent: s.b.opponent_name, reason: s.reason })) }, null, 2)); console.log(`\nwrote ${out}`) }
}
main().catch((e) => { console.error("failed:", e.message); process.exit(1) })
