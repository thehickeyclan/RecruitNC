#!/usr/bin/env npx tsx
/**
 * A state's championship bouts onto its wrestlers' profiles (21 Oct 2026), the way NC's 2026
 * NCHSAA bouts went in (scripts/import-nchsaa-states-2026.ts): one row per linked wrestler's side
 * in other_tournament_bouts, under `<association>-states-<season>`, so significant wins,
 * head-to-heads and the scouting report read them.
 *
 * From Muse's delivery (bouts-csv/*.csv: Season, State, Association, Gender, Classification,
 * Weight Class, Round, Winner, Winner School, Loser, Loser School, Result Type, Result, Winner
 * Score, Loser Score, Bout ID, Winner ID, Loser ID, Source URL).
 *
 * Linking, strongest first, never a name alone:
 *   1. the side's Flo wrestler ID equals source_athlete_id on our placer row for that state and
 *      season, and that placer row is linked to a profile;
 *   2. else the same name and an agreeing school on a linked placer row of that state and season.
 * A side that links to no profile is not written (as NC's import). Duplicate Bout IDs are dropped.
 * Re-running replaces each event key it writes; nothing else is touched.
 *
 *   npx tsx scripts/import-state-championship-bouts.ts --state SC --dir <bouts-csv> [--source <zip name>] [--write]
 *
 * `--layer qualifiers` loads the step below state instead (Matt, 29 October 2026: SC's Upper and
 * Lower State qualifiers and region tournaments). Those bouts go under `<association>-qualifiers-
 * <season>`, named for the tournament in each file's Classification column ("SCHSL 5A Upper
 * State"), so nothing here can read as - or replace - a state championship bout. `--dates` gives
 * each tournament its date, matched on the Classification text, first match wins:
 *
 *   --layer qualifiers --dates "Region=2026-01-23,Girls=2026-02-11,*=2026-02-13"
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
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const args = process.argv.slice(2)
const val = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : null)
const STATE = String(val("--state") ?? "").toUpperCase()
const DIR = val("--dir")
const SOURCE = val("--source") ?? "muse-delivery"
const WRITE = args.includes("--write")
const QUALIFIERS = val("--layer") === "qualifiers"
const DATES = String(val("--dates") ?? "")
  .split(",")
  .map((pair) => pair.split("=").map((x) => x.trim()))
  .filter(([k, v]) => k && /^\d{4}-\d{2}-\d{2}$/.test(v ?? ""))
const dateFor = (classification: string): string | null => {
  for (const [k, v] of DATES) if (k === "*" || classification.toLowerCase().includes(k!.toLowerCase())) return v!
  return null
}
if (!STATE || !DIR) throw new Error("--state XX --dir <bouts-csv>")

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim()
const schoolKey = (s: unknown) => norm(s).replace(/\b(high school|hs|high|school|schools|charter|academy|comprehensive|sr|the)\b/g, "").replace(/\s+/g, "")
function schoolsAgree(a: unknown, b: unknown): boolean {
  const x = schoolKey(a), y = schoolKey(b)
  return Boolean(x && y && (x === y || x.startsWith(y) || y.startsWith(x)))
}

function readCsv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "")
  const rows: string[][] = []
  let row: string[] = [], cell = "", q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ",") row.push(cell), (cell = "")
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(cell), rows.push(row), (row = []), (cell = "")
    } else cell += c
  }
  if (cell || row.length) row.push(cell), rows.push(row)
  const [head, ...body] = rows
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])))
}

/** Bracket order, so a wrestler's bouts read in the order he wrestled them. */
const ROUND_ORDER = ["round of 64", "round of 32", "round of 16", "first round", "prelim", "champ", "quarter", "cons", "consolation", "semi", "blood", "7th", "5th", "3rd", "final", "1st"]
const roundRank = (r: string) => {
  const s = r.toLowerCase()
  const i = ROUND_ORDER.findIndex((k) => s.includes(k))
  return i === -1 ? 50 : i
}

async function main() {
  const files = fs.readdirSync(DIR!).filter((f) => f.endsWith(".csv"))
  const bouts = files.flatMap((f) => readCsv(path.join(DIR!, f))).filter((b) => (b.State ?? "").toUpperCase() === STATE)
  const seen = new Set<string>()
  const unique = bouts.filter((b) => {
    const id = b["Bout ID"]
    if (!id) return true
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  // Linked placer rows of the state: by Flo id, and by season + name for the school check.
  const placers: Array<{ season: number; wrestler_name: string; school_clean: string | null; school_raw: string | null; athlete_id: string; source_athlete_id: string | null }> = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from("state_tournament_placers").select("season, wrestler_name, school_clean, school_raw, athlete_id, source_athlete_id").eq("state", STATE).not("athlete_id", "is", null).order("id").range(f, f + 999)
    if (error) throw error
    placers.push(...((data ?? []) as never[]))
    if (!data || data.length < 1000) break
  }
  const byFlo = new Map<string, Set<string>>()
  for (const p of placers) if (p.source_athlete_id) byFlo.set(p.source_athlete_id, new Set([...(byFlo.get(p.source_athlete_id) ?? []), p.athlete_id]))
  const byName = new Map<string, typeof placers>()
  for (const p of placers) {
    const k = `${p.season}|${norm(p.wrestler_name)}`
    byName.set(k, [...(byName.get(k) ?? []), p])
  }
  const link = (season: number, name: string, school: string, floId: string): string | null => {
    const flo = floId ? byFlo.get(floId) : null
    if (flo && flo.size === 1) return [...flo][0]
    const hits = (byName.get(`${season}|${norm(name)}`) ?? []).filter((p) => schoolsAgree(p.school_clean ?? p.school_raw, school))
    const ids = new Set(hits.map((h) => h.athlete_id))
    return ids.size === 1 ? [...ids][0] : null
  }

  type Row = Record<string, unknown> & { athlete_id: string; event_key: string; _rank: number }
  const rows: Row[] = []
  let sides = 0, linked = 0
  for (const b of unique) {
    if (!b.Winner || !b.Loser) continue
    const season = Number(b.Season)
    const assoc = String(b.Association).toUpperCase()
    const eventKey = QUALIFIERS ? `${assoc.toLowerCase()}-qualifiers-${season}` : `${assoc.toLowerCase()}-states-${season}`
    const rt = String(b["Result Type"] ?? "").toUpperCase()
    // Muse's Result starts with the type ("F 1:11", "TF 17-2"): the score is what follows it.
    const rest = String(b.Result ?? "").replace(new RegExp(`^${rt}\\b\\s*`, "i"), "").trim()
    const score = rest ? rest : b["Winner Score"] && (b["Winner Score"] !== "0" || b["Loser Score"] !== "0") ? `${b["Winner Score"]}-${b["Loser Score"]}` : null
    const base = {
      event_key: eventKey,
      event_name: QUALIFIERS ? `${assoc} ${b.Classification}` : `${assoc} State Championships`,
      year: season,
      weight_class: b["Weight Class"],
      round: QUALIFIERS
        ? [b.Classification, b.Round].filter(Boolean).join(" · ")
        : [b.Classification && b.Classification !== assoc && !/^girls$/i.test(b.Classification) ? b.Classification : null, b.Round || "State Championships"].filter(Boolean).join(" · "),
      source_round: b.Round || null,
      is_bye: false,
      win_type: rt || null,
      score,
      gender: /^g/i.test(b.Gender) ? "F" : "M",
      event_date: QUALIFIERS ? dateFor(String(b.Classification ?? "")) : null,
      source_file: SOURCE,
      _rank: roundRank(b.Round ?? ""),
    }
    const w = link(season, b.Winner, b["Winner School"], b["Winner ID"])
    const l = link(season, b.Loser, b["Loser School"], b["Loser ID"])
    sides += 2
    if (w) linked++, rows.push({ ...base, athlete_id: w, athlete_name: b.Winner, athlete_club: b["Winner School"], opponent_name: b.Loser, opponent_id: l, opponent_club: b["Loser School"], win: true })
    if (l) linked++, rows.push({ ...base, athlete_id: l, athlete_name: b.Loser, athlete_club: b["Loser School"], opponent_name: b.Winner, opponent_id: w, opponent_club: b["Winner School"], win: false })
  }
  // bout_order within each wrestler's event, in bracket order.
  const groups = new Map<string, Row[]>()
  for (const r of rows) groups.set(`${r.athlete_id}|${r.event_key}`, [...(groups.get(`${r.athlete_id}|${r.event_key}`) ?? []), r])
  for (const g of groups.values()) g.sort((a, b) => a._rank - b._rank).forEach((r, i) => (r.bout_order = i))
  const keys = [...new Set(rows.map((r) => r.event_key))].sort()
  const profiles = new Set(rows.map((r) => r.athlete_id))
  console.log(`${STATE}: ${bouts.length} bout rows in ${files.length} files, ${unique.length} after Bout ID dedupe`)
  console.log(`  sides linked to a profile: ${linked} of ${sides}, across ${profiles.size} profiles`)
  for (const k of keys) console.log(`  ${k}: ${rows.filter((r) => r.event_key === k).length} rows`)
  if (QUALIFIERS && rows.some((r) => !r.event_date)) throw new Error("--layer qualifiers needs --dates covering every tournament")
  if (!WRITE) return console.log("\nDry run. --write to apply.")
  for (const k of keys) {
    const { error } = await sb.from("other_tournament_bouts").delete().eq("event_key", k)
    if (error) throw error
  }
  const clean = rows.map(({ _rank, ...r }) => r)
  for (let i = 0; i < clean.length; i += 400) {
    const { error } = await sb.from("other_tournament_bouts").insert(clean.slice(i, i + 400) as never)
    if (error) throw error
  }
  const log = `ranking-snapshots/state-championship-bouts-${STATE}-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`
  fs.writeFileSync(log, JSON.stringify({ undo: "delete from other_tournament_bouts where event_key in these keys (none existed before this import)", keys, rows: clean.length }, null, 2))
  console.log(`\nWrote ${clean.length} rows. Log: ${log}`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
