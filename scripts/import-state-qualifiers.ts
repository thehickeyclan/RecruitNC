#!/usr/bin/env npx tsx
/**
 * State qualifiers — every entrant in a state tournament, not just the podium.
 *
 * This is the collection the whole identity effort was waiting on. We held placers (places 1-8,
 * derived from placement matches), so a wrestler who qualified for his state tournament and went
 * 0-2 was invisible in everything we had. These files carry every entrant with a win-loss record,
 * a school and, where the source is FloArena, a stable wrestler id — which is worth more than the
 * class year, because it survives a transfer or a name change.
 *
 * Format (Muse, 5 Oct 2026):
 *   first_name,last_name,school,grad_year,gender,state,season,division,weight,qualified,place,
 *   state_wins,state_losses,source,source_url,source_wrestler_id
 * `season` is the calendar year the tournament finished: 2025 means the 2024-25 season. Verified
 * against our own NC 2025 entrant list, where 306 of 312 placements agreed exactly.
 *
 *   npx tsx scripts/import-state-qualifiers.ts ~/Downloads/nc-2025-boys.csv [...]
 *   npx tsx scripts/import-state-qualifiers.ts ~/Downloads/*.csv --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { stripResultMarkers } from "@/lib/identity-dedupe"

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
const FILES = process.argv.slice(2).filter((a) => a.endsWith(".csv")).map((a) => a.replace(/^~/, process.env.HOME ?? "~"))

function csv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "").trim()
  const rows: string[][] = []
  let row: string[] = []
  let cur = ""
  let q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ",") { row.push(cur); cur = "" }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = "" }
    else if (ch !== "\r") cur += ch
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  const cols = (rows.shift() ?? []).map((c) => c.trim())
  return rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(cols.map((c, i) => [c, (r[i] ?? "").trim()])))
}

/*
 * One bracket must not become two because two sources name it differently. Our NC girls' division
 * is "Girls" and theirs is "Open" — the same six wrestlers in the same six places — which is the
 * Virginia "Class 6" against "6A" problem again. The spelling already in the table wins.
 */
/*
 * The governing body, read from the rows already in the table rather than typed here. The boys'
 * 2025/2026 import recorded it for 49 states — PIAA, UIL, CIF and the rest — and `association` is
 * NOT NULL, so guessing it would be both wrong and load-bearing.
 */
async function associationFor(state: string): Promise<string | null> {
  const { data } = await sb.from("state_tournament_divisions").select("association").eq("state", state).limit(1)
  return (data ?? [])[0]?.association ?? null
}

async function divisionSpellings(state: string, gender: string) {
  const seen = new Map<string, string>()
  for (let from = 0; ; from += 1000) {
    const { data } = await sb
      .from("state_tournament_placers")
      .select("classification")
      .eq("state", state)
      .eq("gender", gender)
      .range(from, from + 999)
    for (const r of (data ?? []) as Array<{ classification: string | null }>) {
      const raw = String(r.classification ?? "").trim()
      if (raw) seen.set(raw.toLowerCase(), raw)
    }
    if (!data || data.length < 1000) break
  }
  return seen
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  if (!FILES.length) { console.error("pass one or more CSV paths"); return }

  type Entrant = Record<string, string>
  const rows: Entrant[] = FILES.flatMap((f) => csv(f).map((r) => ({ ...r, __file: path.basename(f) })))
  console.log(`files: ${FILES.length}   entrants: ${rows.length}`)

  const groups = new Map<string, Entrant[]>()
  for (const r of rows) {
    /*
     * The state code is upper-cased here rather than trusted. Arizona's rebuild wrote "az" where
     * every other file wrote "AL", and the column's check constraint rejected the whole state —
     * a collector's casing is not something an import should depend on.
     */
    r.state = String(r.state ?? "").trim().toUpperCase()
    const k = `${r.state}|${r.season}|${r.gender === "girls" ? "Girls" : "Boys"}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(r)
  }

  for (const [key, group] of groups) {
    const [state, season, gender] = key.split("|")
    /*
     * North Carolina is not written here. It lives in wrestling_nchsaa_results, which 136 places
     * in the code read, and which already holds the 2025 entrant list — a second copy in this
     * table could only drift from it. NC files are enriched into their own table instead, by
     * scripts/import-nc-qualifiers.ts.
     */
    if (state === "NC") {
      console.log(`\n${key}\n   SKIPPED — North Carolina lives in wrestling_nchsaa_results; use import-nc-qualifiers.ts`)
      continue
    }
    const spellings = await divisionSpellings(state, gender)
    const classOf = (raw: string) => spellings.get(raw.trim().toLowerCase()) ?? raw.trim()
    const renamed = [...new Set(group.map((r) => r.division))]
      .map((d) => [d, classOf(d)] as const)
      .filter(([a, b]) => a !== b)

    const divisions = new Map<string, Record<string, unknown>>()
    const entries: Array<Record<string, unknown>> = []
    let noName = 0
    for (const r of group) {
      const name = stripResultMarkers(`${r.first_name} ${r.last_name}`)
      /*
       * "Forfeit" is not a wrestler. Arizona's files carry rows whose whole name is a result,
       * alongside weights of "1" to "4" — that state needs recollecting, and until it does these
       * must not become identities.
       */
      if (!name || !r.weight || /^(forfeit|bye|no ?contest|vacant|tbd)$/i.test(name)) { noName++; continue }
      /*
       * Some states crown one champion per weight with no classifications at all — Hawaii and
       * Delaware among them — so a blank division is the truth, not a missing field. Requiring one
       * rejected three Hawaii seasons and Delaware 2026 outright.
       */
      const classification = classOf(r.division) || "Open"
      const place = Number(r.place) || null
      const wins = r.state_wins === "" ? null : Number(r.state_wins)
      const losses = r.state_losses === "" ? null : Number(r.state_losses)
      const divKey = `${season}|${state}|${gender}|${classification}|${String(r.association ?? "").trim() || "PENDING"}`
      if (!divisions.has(divKey)) {
        divisions.set(divKey, {
          season: Number(season), state, association: null,
          gender, classification, places_awarded: null, source_url: r.source_url || null,
        })
      }
      entries.push({
        season: Number(season), state, gender, classification, weight: r.weight,
        /*
         * Taken from this row, not looked up afterwards. An earlier version matched each entry
         * back to its source by NAME to find the association — and stripResultMarkers can change
         * a name, so the lookup missed and fell back to whichever association the state returned
         * first. In Maryland, where MPSSAA and MIAA run separate championships, that handed an
         * MPSSAA wrestler the MIAA association and the foreign key refused him.
         */
        association: String(r.association ?? "").trim() || "PENDING",
        place,
        wrestler_name: name,
        school_raw: r.school || null,
        /* Never guessed: the collector leaves it blank and so do we. */
        grad_year: Number(r.grad_year) || null,
        wins, losses,
        record: wins != null && losses != null ? `${wins}-${losses}` : null,
        source_athlete_id: r.source_wrestler_id || null,
        source_athlete_id_source: r.source_wrestler_id ? String(r.source).toLowerCase() : null,
        source_url: r.source_url || null,
      })
    }

    if (!WRITE) continue
    /*
     * The association now comes from the file — 52 of them across the 50 states, because several
     * run separate public and independent championships (NCHSAA and NCISAA, UIL and TAPPS). The
     * table lookup stays as the fallback for the pilot files, which predate the column.
     */
    const fromFile = [...new Set(group.map((r) => String(r.association ?? "").trim()).filter(Boolean))]
    const fallback = (await associationFor(state)) ?? String(group[0].source ?? "unknown")

    if (fromFile.length > 1) console.log(`   associations in this file: ${fromFile.join(", ")}`)
    /* Resolved before any check reads it — the clash check keys on it, and a null read as one
     * association made Georgia's two championships look like two wrestlers in one place. */
    for (const e of entries) if (e.association === "PENDING") e.association = fallback

    const placed = entries.filter((e) => e.place != null)
    const withId = entries.filter((e) => e.source_athlete_id)
    const byBracket = new Map<string, number>()
    for (const e of entries) byBracket.set(`${e.classification}|${e.weight}`, (byBracket.get(`${e.classification}|${e.weight}`) ?? 0) + 1)
    console.log(`\n${key}`)
    if (renamed.length) console.log(`   division spelling taken from the table: ${renamed.map(([a, b]) => `"${a}"->"${b}"`).join(", ")}`)
    console.log(`   entrants ${entries.length}   placed ${placed.length}   qualifiers who did not place ${entries.length - placed.length}`)
    console.log(`   brackets ${byBracket.size}   with a stable wrestler id ${withId.length}/${entries.length}`)
    if (noName) console.log(`   rows with no usable name or weight, skipped: ${noName}`)
    /* Two wrestlers in one place is two people or a bad parse; refuse rather than write it. */
    /*
     * Keyed by association as well. Georgia runs GHSA and GIAA, and both crown a 1st place at
     * Girls 100 — two champions of two championships, not two wrestlers in one place. Without the
     * association the check rejected a whole state for doing nothing wrong.
     */
    const seen = new Map<string, number>()
    for (const e of placed) { const k = `${e.association}|${e.classification}|${e.weight}|${e.place}`; seen.set(k, (seen.get(k) ?? 0) + 1) }
    const clash = [...seen.entries()].filter(([, n]) => n > 1)
    if (clash.length) { console.log(`   TWO WRESTLERS IN ONE PLACE — not written: ${clash.slice(0, 5).map(([k]) => k).join(" ")}`); continue }


    /*
     * Validate every row BEFORE deleting anything.
     *
     * The first version deleted the season and then failed its insert on a missing association,
     * which destroyed 312 PA rows and wrote nothing in their place. A delete that runs before the
     * replacement is proven good is not an update, it is a gamble — and it is the same shape as
     * the Maryland import that failed after writing its divisions.
     */
    const REQUIRED = ["season", "state", "gender", "classification", "weight", "wrestler_name", "association"]
    const invalid = entries.filter((e) => REQUIRED.some((k) => e[k] == null || e[k] === ""))
    if (invalid.length) {
      console.log(`   ${invalid.length} rows missing a required field (${REQUIRED.join(", ")}) — nothing deleted, nothing written`)
      console.log(`      first: ${JSON.stringify(invalid[0])}`)
      continue
    }
    /*
     * How deep the bracket places, taken as the deepest place actually awarded in it. Safe only
     * because these are complete brackets — every entrant, not a collected subset — so the
     * deepest place present IS the depth. It would be a lie on a partial collection.
     */
    for (const [k, d] of divisions) {
      /*
       * Keyed exactly as the division was keyed when it was built. An earlier version blanked the
       * association here whenever it equalled the table's, which is the ordinary case — so no
       * entry ever matched its own division, places_awarded came out null, and the guard rejected
       * 250 of 251 groups. The guard was right to; the key was wrong.
       */
      const mine = entries.filter((e) => `${season}|${state}|${gender}|${e.classification}|${e.association}` === k && e.place != null)
      d.association = String(k.split("|")[4] || fallback)
      d.places_awarded = mine.length ? Math.max(...mine.map((e) => Number(e.place))) : null
    }
    for (const d of divisions.values()) if (d.association === "PENDING" || !d.association) d.association = fallback
    for (const d of divisions.values()) if (d.association === "PENDING" || !d.association) d.association = fallback
    const missingDepth = [...divisions.values()].filter((d) => !d.places_awarded)
    if (missingDepth.length) { console.log(`   no placement anywhere in ${missingDepth.length} division(s) — not written`); continue }
    const { error: dErr } = await sb.from("state_tournament_divisions").upsert([...divisions.values()] as never, { onConflict: "season,state,association,gender,classification" })
    if (dErr) { console.log(`   divisions FAILED: ${dErr.message}`); continue }
    await sb.from("state_tournament_placers").delete().eq("state", state).eq("season", Number(season)).eq("gender", gender)
    let done = 0
    for (let i = 0; i < entries.length; i += 500) {
      const { error } = await sb.from("state_tournament_placers").insert(entries.slice(i, i + 500) as never)
      if (error) { console.log(`   insert FAILED: ${error.message}`); break }
      done += entries.slice(i, i + 500).length
    }
    console.log(`   written: ${done}`)
  }
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
