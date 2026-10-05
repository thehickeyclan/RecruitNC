#!/usr/bin/env npx tsx
/**
 * A state's placement bouts, and the placers derived from them.
 *
 * Muze's workbooks for this build state their own rule: the placement-bout sheet is the only
 * store of truth and the placer list is a sheet of formulas reading it, so odd places are the
 * winner of a placement bout and even places the loser. The placer sheet in the Virginia file
 * arrived with no cached values at all — 448 rows, every name blank — so deriving is not just
 * the documented way, it is the only way that gets names out of the file.
 *
 * Deriving also means a placer cannot disagree with the bout that produced them, which is the
 * failure the workbook's own note is about: Class 4 at 175 was dropped because the reported
 * placers duplicated Class 3's, and there is no way to tell which was right.
 *
 *   npx tsx scripts/import-state-placement-bout-workbook.ts --bouts <csv> --divisions <csv>
 *   npx tsx scripts/import-state-placement-bout-workbook.ts ... --write
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
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const WRITE = process.argv.includes("--write")
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? null : process.argv[i + 1] ?? null
}
const BOUTS_CSV = arg("bouts")
const DIVISIONS_CSV = arg("divisions")
if (!BOUTS_CSV || !DIVISIONS_CSV) {
  console.error("need --bouts <csv> and --divisions <csv>")
  process.exit(1)
}

function csv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "")
  const rows: string[][] = []
  let row: string[] = []
  let cur = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ",") { row.push(cur); cur = "" }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = "" }
    else if (ch !== "\r") cur += ch
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  const cols = (rows.shift() ?? []).map((c) => c.trim())
  return rows
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => Object.fromEntries(cols.map((c, i) => [c, (r[i] ?? "").trim()])))
}

/*
 * Result codes the table accepts, and the long forms the workbooks sometimes use instead.
 *
 * Maryland writes "Major Decision" and "Tech Fall" where every other state writes "MD" and "TF",
 * and the check constraint on state_tournament_bouts rejects the words — so a single state's
 * spelling failed its whole insert after its divisions had already been written, leaving it
 * half-imported. The codes are the ones the Virginia workbook's own dictionary lists.
 */
const RESULT_CODES = new Set(["F", "TF", "MD", "DEC", "SV", "TB", "UTB", "INJ", "DQ", "FF"])
const RESULT_WORDS: Record<string, string> = {
  fall: "F",
  pin: "F",
  "tech fall": "TF",
  technicalfall: "TF",
  "technical fall": "TF",
  "major decision": "MD",
  major: "MD",
  decision: "DEC",
  dec: "DEC",
  "sudden victory": "SV",
  "tie breaker": "TB",
  tiebreaker: "TB",
  "ultimate tie breaker": "UTB",
  /* A default is an injury default: the opponent could not continue. */
  default: "INJ",
  "injury default": "INJ",
  injury: "INJ",
  disqualification: "DQ",
  dq: "DQ",
  forfeit: "FF",
  ff: "FF",
}
function resultCode(raw: string): { code: string | null; unknown: string | null } {
  const v = String(raw ?? "").trim()
  if (!v) return { code: null, unknown: null }
  const upper = v.toUpperCase()
  if (RESULT_CODES.has(upper)) return { code: upper, unknown: null }
  const mapped = RESULT_WORDS[v.toLowerCase()]
  if (mapped) return { code: mapped, unknown: null }
  /*
   * Keep the bout and drop the code. The winner, loser and score are what a credential and a
   * significant win are built from; how the match ended is a detail, and losing a whole state's
   * brackets over one unrecognised word is the worse trade. It is reported, not swallowed.
   */
  return { code: null, unknown: v }
}

/* "1st" decides places 1 and 2, "3rd" decides 3 and 4, and so on. */
const PLACES_FOR_BOUT: Record<string, [number, number]> = {
  "1st": [1, 2],
  "3rd": [3, 4],
  "5th": [5, 6],
  "7th": [7, 8],
}

/*
 * The workbook spells Virginia's classes "Class 6"; the 2026 rows already in the table spell the
 * same divisions "6A". Both name the same thing, and leaving them different would split one
 * division into two across seasons — a profile would show "Class 6" one year and "6A" the next,
 * and anything grouping by classification would read them as separate competitions.
 *
 * So the existing spelling wins, per state, read from the table rather than hardcoded here. If a
 * state has no rows yet, the workbook's own spelling is kept.
 */
async function existingClassificationSpellings(state: string, gender: string) {
  const rows: string[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb
      .from("state_tournament_placers")
      .select("classification")
      .eq("state", state)
      /*
       * Gender-scoped, because a classification name is not unique without it. Washington's table
       * holds "Boys 1A", "Boys 1B/2B" and "Girls 1B/2B/1A"; keyed on the first digit across both
       * genders, every boys' division whose name starts with a 1 resolved to the GIRLS' name and
       * two separate divisions collapsed into one. The collision check caught it — 84 places with
       * two wrestlers in them — but only because it exists.
       */
      .eq("gender", gender)
      .range(from, from + 999)
    for (const r of (data ?? []) as Array<{ classification: string | null }>) {
      const raw = String(r.classification ?? "").trim()
      if (raw) rows.push(raw)
    }
    if (!data || data.length < 1000) break
  }
  const exact = new Set(rows.map((r) => r.toLowerCase()))
  /*
   * Keyed on every digit in the name, in order — "1B/2B/1A" is "1-2-1", not "1" — so two
   * divisions that merely begin with the same number stay apart. A key claimed by more than one
   * spelling is ambiguous and gets no mapping at all.
   */
  const bySignature = new Map<string, Set<string>>()
  for (const raw of rows) {
    const sig = (raw.match(/\d+/g) ?? []).join("-")
    if (!sig) continue
    if (!bySignature.has(sig)) bySignature.set(sig, new Set())
    bySignature.get(sig)!.add(raw)
  }
  return { exact, bySignature }
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  const bouts = csv(BOUTS_CSV!)
  const divisions = csv(DIVISIONS_CSV!)
  if (!bouts.length) { console.error("no bout rows"); return }

  const state = bouts[0].State
  const season = Number(bouts[0].Season)
  const gender = bouts[0].Gender
  if (!state || !Number.isFinite(season)) { console.error("bout rows carry no state/season"); return }

  const { exact, bySignature } = await existingClassificationSpellings(state, gender)
  const ambiguous = new Set<string>()
  const classOf = (raw: string) => {
    /* Already spelled the way the table spells it — the common case, and nothing to do. */
    if (exact.has(raw.trim().toLowerCase())) return raw.trim()
    const sig = (raw.match(/\d+/g) ?? []).join("-")
    const candidates = sig ? [...(bySignature.get(sig) ?? [])] : []
    if (candidates.length === 1) return candidates[0]
    if (candidates.length > 1) ambiguous.add(`${raw} -> ${candidates.join(" | ")}`)
    return raw.trim()
  }
  const renamed = [...new Set(bouts.map((b) => b.Classification))]
    .map((raw) => [raw, classOf(raw)] as const)
    .filter(([raw, to]) => raw !== to)
  if (renamed.length) {
    console.log("classification spelling taken from the rows already in the table:")
    for (const [raw, to] of renamed) console.log(`   "${raw}" -> "${to}"`)
    console.log()
  }
  if (ambiguous.size) {
    console.log("classification left as the workbook spells it — more than one match in the table:")
    for (const a of ambiguous) console.log(`   ${a}`)
    console.log()
  }

  const boutRows = bouts.map((b) => ({
    season: Number(b.Season),
    state: b.State,
    association: b.Association,
    gender: b.Gender,
    classification: classOf(b.Classification),
    weight: b.Weight,
    bout: b["Bout (1st/3rd/5th/7th)"],
    winner_name: b.Winner,
    winner_school: b["Winner School"] || null,
    loser_name: b.Loser,
    loser_school: b["Loser School"] || null,
    result_type: resultCode(b["Result Type"]).code,
    score: b.Score || null,
    fall_time: b["Fall Time"] || null,
    source_url: b["Source URL"] || null,
  }))

  const unknownResults = new Map<string, number>()
  for (const b of bouts) {
    const u = resultCode(b["Result Type"]).unknown
    if (u) unknownResults.set(u, (unknownResults.get(u) ?? 0) + 1)
  }
  if (unknownResults.size) {
    console.log("result types not recognised — the bout is kept, the code dropped:")
    for (const [u, n] of unknownResults) console.log(`   "${u}" x${n}`)
    console.log()
  }

  const bad = boutRows.filter((b) => !b.winner_name || !b.loser_name || !PLACES_FOR_BOUT[b.bout])
  if (bad.length) {
    console.log(`${bad.length} bout rows unusable (missing a wrestler, or an unknown bout label) — skipped:`)
    for (const b of bad.slice(0, 5)) console.log(`   ${b.classification} ${b.weight} "${b.bout}" ${b.winner_name} / ${b.loser_name}`)
  }
  const usable = boutRows.filter((b) => !bad.includes(b))

  /* Odd place to the winner, even place to the loser — the workbook's own rule. */
  const placers = usable.flatMap((b) => {
    const [win, lose] = PLACES_FOR_BOUT[b.bout]
    const base = {
      season: b.season,
      state: b.state,
      association: b.association,
      gender: b.gender,
      classification: b.classification,
      weight: b.weight,
      source_url: b.source_url,
      /* The workbook says these are not collected; a blank is the honest value. */
      school_clean: null,
      city: null,
      grade: null,
      grad_year: null,
    }
    return [
      { ...base, place: win, wrestler_name: b.winner_name, school_raw: b.winner_school },
      { ...base, place: lose, wrestler_name: b.loser_name, school_raw: b.loser_school },
    ]
  })

  /*
   * Places awarded is how deep the state officially places, and coverage is measured against it.
   * The workbook reports 4 for the two classes whose only source published 1st and 3rd place
   * bouts — which is how many places we could collect, not how many the state awards. The rows
   * already in the table for this state are the better witness, and where they disagree with the
   * workbook the depth that makes a gap visible wins: a shallow number would quietly turn two
   * missing placers into "that place was never wrestled".
   */
  const knownDepth = new Map<string, number>()
  {
    const { data } = await sb
      .from("state_tournament_divisions")
      .select("classification, places_awarded, gender")
      .eq("state", state)
      .eq("gender", gender)
    for (const r of (data ?? []) as Array<{ classification: string; places_awarded: number }>) {
      const d = Number(r.places_awarded)
      if (Number.isFinite(d)) knownDepth.set(r.classification, Math.max(knownDepth.get(r.classification) ?? 0, d))
    }
  }

  const divRows = divisions.map((d) => {
    const classification = classOf(d.Classification)
    const stated = Number(d["Places Awarded"]) || null
    const known = knownDepth.get(classification) ?? null
    const depth = Math.max(stated ?? 0, known ?? 0) || null
    return {
      season: Number(d.Season),
      state: d.State,
      association: d.Association,
      gender: d.Gender,
      classification,
      class_rank: Number(d["Class Rank (1 = largest)"]) || null,
      classes_in_state: Number(d["Classes in State"]) || null,
      brackets: Number(d.Brackets) || null,
      places_awarded: depth,
      tournament_dates: d["Tournament Dates"] || null,
      source_url: d["Bracket Source URL"] || null,
      _stated: stated,
      _known: known,
    }
  })

  console.log(`${state} ${season} ${gender}: ${usable.length} placement bouts -> ${placers.length} placers, ${divRows.length} divisions\n`)
  for (const d of divRows) {
    const note =
      d._known && d._stated && d._known !== d._stated
        ? `  (workbook says ${d._stated}; rows already here say ${d._known} — kept ${d.places_awarded} so missing places read as a gap)`
        : ""
    const have = placers.filter((p) => p.classification === d.classification).length
    const deepest = Math.max(0, ...placers.filter((p) => p.classification === d.classification).map((p) => p.place))
    console.log(`   ${String(d.classification).padEnd(8)} brackets=${d.brackets} places=${d.places_awarded} · collected ${have} placers, deepest ${deepest}${note}`)
  }

  const weightsPerClass = new Map<string, Set<string>>()
  for (const p of placers) {
    if (!weightsPerClass.has(p.classification)) weightsPerClass.set(p.classification, new Set())
    weightsPerClass.get(p.classification)!.add(p.weight)
  }
  console.log("\nweights collected per class (against brackets):")
  for (const d of divRows) {
    const got = weightsPerClass.get(d.classification)?.size ?? 0
    const flag = d.brackets && got !== d.brackets ? `  <-- ${d.brackets - got} bracket(s) not collected` : ""
    console.log(`   ${String(d.classification).padEnd(8)} ${got}/${d.brackets}${flag}`)
  }

  const champions = placers.filter((p) => p.place === 1)
  console.log(`\nchampions derived: ${champions.length}`)
  for (const c of champions.slice(0, 5)) console.log(`   ${c.classification} ${c.weight} — ${c.wrestler_name} (${c.school_raw})`)

  const dupes = new Map<string, number>()
  for (const p of placers) {
    const k = `${p.classification}|${p.weight}|${p.place}`
    dupes.set(k, (dupes.get(k) ?? 0) + 1)
  }
  const collisions = [...dupes.entries()].filter(([, n]) => n > 1)
  if (collisions.length) {
    console.log(`\nTWO WRESTLERS IN ONE PLACE — not written: ${collisions.length}`)
    for (const [k, n] of collisions.slice(0, 10)) console.log(`   ${k} x${n}`)
    return
  }

  const { count: existing } = await sb
    .from("state_tournament_placers")
    .select("id", { count: "exact", head: true })
    .eq("state", state)
    .eq("season", season)
    .eq("gender", gender)
  console.log(`\nalready in the table for ${state} ${season} ${gender}: ${existing}`)

  if (!WRITE) { console.log("\nRe-run with --write to insert."); return }

  const { error: divErr } = await sb
    .from("state_tournament_divisions")
    .upsert(divRows.map(({ _stated, _known, ...d }) => d) as never, {
      onConflict: "season,state,association,gender,classification",
    })
  if (divErr) { console.error("divisions FAILED:", divErr.message); return }
  console.log(`divisions written: ${divRows.length}`)

  /* Re-runnable, and scoped: this state, this season, this gender, never another. */
  await sb.from("state_tournament_bouts").delete().eq("state", state).eq("season", season).eq("gender", gender)
  await sb.from("state_tournament_placers").delete().eq("state", state).eq("season", season).eq("gender", gender)

  for (const [table, rows] of [["state_tournament_bouts", usable], ["state_tournament_placers", placers]] as const) {
    let done = 0
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb.from(table).insert(rows.slice(i, i + 500) as never)
      if (error) { console.error(`${table} FAILED:`, error.message); return }
      done += rows.slice(i, i + 500).length
    }
    console.log(`${table}: inserted ${done}`)
  }
}
main()
