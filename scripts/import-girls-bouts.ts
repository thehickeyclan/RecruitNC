#!/usr/bin/env npx tsx
/**
 * Girls' bout-by-bout results — Fargo, NHSCA Nationals, Super 32 and USAW Women's Nationals.
 *
 * Every bout scraper on this site was pointed at the boys' brackets. NHSCA held 1,330 bouts and
 * not one was a girl; Super 32 held 446, same. So a girl's profile showed "NHSCA 2026, 0-2" and
 * nothing underneath, because we had her record and none of her matches.
 *
 * The files are winner/loser per bout. The table is athlete/opponent per wrestler, so a bout
 * becomes one row for each North Carolina wrestler in it - two rows when both are ours, which is
 * right: each has that match on her own record, one as a win and one as a loss.
 *
 * Event keys are not invented here. Bouts hang under the key of the row they belong to, so they
 * must match what already exists - `nhsca-nationals-2026`, `super32-2025`, and for the USAW
 * summaries the key those rows were written with. A new key means a wrestler's row shows her
 * record and no matches, which is the bug this script exists to fix.
 *
 *   npx tsx scripts/import-girls-bouts.ts          # dry run
 *   npx tsx scripts/import-girls-bouts.ts --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"

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
/*
 * Keep every wrestler in the bracket, not only North Carolina's, for the files that carry the
 * national field. See scripts/import-nhsca-nationals-bouts.ts for why. Per source, because most
 * of these files were collected NC-only and their "state" column really is a state.
 */
const ALL_FIELD_FILES = new Set(["usaw-womens-nationals-2026-bouts-all.csv"])
/**
 * One entry per bracket file. `key` is how the bouts find their row.
 *
 * Fargo keys carry no gender - `fargo-2026-16u-fs` is the boys' key too - which is safe because
 * bouts are only ever fetched by athlete_id, and changing it would orphan every girl's row.
 */
const SOURCES: Array<{
  file: string
  year: number
  date: string
  /** Fixed key, or one derived from the row's division when a file spans several brackets. */
  key: string | ((division: string, year: number) => string)
  name: string | ((division: string, year: number) => string)
}> = [
  { file: "fargo-2025-nc-girls-freestyle-bouts.csv", year: 2025, date: "2025-07-15",
    key: (d, y) => `fargo-${y}-${/16u/i.test(d) ? "16u" : "junior"}-${/\bgr\b|greco/i.test(d) ? "gr" : "fs"}`,
    name: (d, y) => `${y} Fargo ${/16u/i.test(d) ? "16U" : "Junior"} Women's ${/\bgr\b|greco/i.test(d) ? "Greco-Roman" : "Freestyle"}` },
  { file: "fargo-2026-nc-girls-freestyle-bouts.csv", year: 2026, date: "2026-07-15",
    key: (d, y) => `fargo-${y}-${/16u/i.test(d) ? "16u" : "junior"}-${/\bgr\b|greco/i.test(d) ? "gr" : "fs"}`,
    name: (d, y) => `${y} Fargo ${/16u/i.test(d) ? "16U" : "Junior"} Women's ${/\bgr\b|greco/i.test(d) ? "Greco-Roman" : "Freestyle"}` },
  { file: "nhsca-2023-nc-girls-bouts.csv", year: 2023, date: "2023-03-27", key: "nhsca-nationals-2023", name: "2023 NHSCA High School Nationals" },
  { file: "nhsca-2024-nc-girls-bouts.csv", year: 2024, date: "2024-03-27", key: "nhsca-nationals-2024", name: "2024 NHSCA High School Nationals" },
  { file: "nhsca-2025-nc-girls-bouts.csv", year: 2025, date: "2025-03-27", key: "nhsca-nationals-2025", name: "2025 NHSCA High School Nationals" },
  { file: "nhsca-2026-nc-girls-bouts.csv", year: 2026, date: "2026-03-27", key: "nhsca-nationals-2026", name: "2026 NHSCA High School Nationals" },
  { file: "super32-2023-nc-girls-bouts.csv", year: 2023, date: "2023-10-21", key: "super32-2023", name: "2023 Super 32" },
  { file: "super32-2025-nc-girls-bouts.csv", year: 2025, date: "2025-10-18", key: "super32-2025", name: "2025 Super 32" },
  /*
   * The USAW file's division carries its own year ("2023 U17 Women"), and the summary rows were
   * written with a slug of "U17 Women's Freestyle" - so the key is rebuilt the same way here
   * rather than from the file's text, or the bouts would land beside the row instead of under it.
   */
  { file: "usaw-womens-nationals-nc-bouts-2023-2026-v2.csv", year: 0, date: "",
    key: (d) => {
      const y = (d.match(/(20\d\d)/) ?? [])[1] ?? ""
      const age = (d.match(/U(15|17|20)/i) ?? [])[0]?.toUpperCase() ?? "U17"
      return `usaw-womens-nationals-${y}-${`${age} Women's Freestyle`.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
    },
    name: (d) => {
      const y = (d.match(/(20\d\d)/) ?? [])[1] ?? ""
      const age = (d.match(/U(15|17|20)/i) ?? [])[0]?.toUpperCase() ?? "U17"
      return `${y} USAW Women's Nationals — ${age} Women's Freestyle`
    } },
  /*
   * The 2026 national field, U15 and U17. Its team column holds a club ("Sanderson Wrestling
   * Academy"), not a state, so nobody passes the North Carolina test - hence ALL_FIELD_FILES.
   * The NC-collected file above covers U17 and U20; between them 2026 is complete.
   */
  { file: "usaw-womens-nationals-2026-bouts-all.csv", year: 2026, date: "",
    key: (d) => {
      const y = (d.match(/(20\d\d)/) ?? [])[1] ?? ""
      const age = (d.match(/U(15|17|20)/i) ?? [])[0]?.toUpperCase() ?? "U17"
      return `usaw-womens-nationals-${y}-${`${age} Women's Freestyle`.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
    },
    name: (d) => {
      const y = (d.match(/(20\d\d)/) ?? [])[1] ?? ""
      const age = (d.match(/U(15|17|20)/i) ?? [])[0]?.toUpperCase() ?? "U17"
      return `${y} USAW Women's Nationals — ${age} Women's Freestyle`
    } },
]

function csv(file: string): Array<Record<string, string>> {
  const lines = fs.readFileSync(path.join(`${process.env.HOME}/Downloads`, file), "utf8").trim().split("\n")
  const cols = lines[0].split(",").map((c) => c.trim())
  return lines.slice(1).map((line) => {
    const vals: string[] = []
    let cur = "", q = false
    for (const ch of line) {
      if (ch === '"') q = !q
      else if (ch === "," && !q) { vals.push(cur); cur = "" }
      else cur += ch
    }
    vals.push(cur)
    const row: Record<string, string> = {}
    cols.forEach((c, i) => (row[c] = (vals[i] ?? "").trim()))
    return row
  })
}

const isNC = (s: string) => String(s ?? "").trim().toUpperCase() === "NC"

/**
 * A name as it should read on a profile.
 *
 * Only a name the bracket typed entirely in lower case is touched ("clara ealy"). One that already
 * carries capitals is left exactly as it is, because title-casing would turn DaCosta into Dacosta
 * and Zadroga-McNulty into Zadroga-Mcnulty.
 */
const displayName = (name: string) =>
  /[A-Z]/.test(name)
    ? name
    : name.replace(/(^|[\s('-])([a-z])/g, (_m, pre, ch) => pre + ch.toUpperCase())

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")

  const { data: girlsRaw } = await sb
    .from("athletes")
    .select("id, name, graduationyear, highschool")
    .eq("gender", "Female")
  const girls = (girlsRaw ?? []) as Array<{ id: string; name: string }>

  const rows: Array<Record<string, unknown>> = []
  const toCreate = new Set<string>()
  const unmatched = new Map<string, number>()
  const ambiguous = new Set<string>()
  /*
   * The same bout reaches us from two files: the NC-collected women's nationals export and the
   * national one both carry 2026 U17. Whichever source is listed first in SOURCES wins, and the
   * duplicate is dropped - otherwise the insert dies on the table's unique key.
   */
  const emitted = new Set<string>()

  for (const src of SOURCES) {
    if (!fs.existsSync(path.join(`${process.env.HOME}/Downloads`, src.file))) { console.log(`${src.file}: not present, skipped`); continue }
    const bouts = csv(src.file)
    let order = 0
    for (const b of bouts) {
      order += 1
      const division = b.division ?? ""
      const year = src.year || Number((division.match(/(20\d\d)/) ?? [])[1]) || 0
      const key = typeof src.key === "function" ? src.key(division, year) : src.key
      const name = typeof src.name === "function" ? src.name(division, year) : src.name
      /* One row per North Carolina wrestler in the bout — both when it is NC against NC. */
      const wholeField = ALL_FIELD_FILES.has(src.file)
      for (const side of ["winner", "loser"] as const) {
        const wrestler = b[`${side}_name`]
        if (!wrestler) continue
        if (!wholeField && !isNC(b[`${side}_state`])) continue
        const other = side === "winner" ? "loser" : "winner"
        const team = b[`${side}_state`] || null

        /*
         * A whole-field file is never linked to a profile by name.
         *
         * Our profiles are North Carolina's and this is the national bracket, so a name that
         * matches is overwhelmingly a different girl - 1,104 of 2,814 rows "matched" on the first
         * run, which is the namesake trap at national scale, not a discovery. North Carolina's own
         * bouts come from the NC-collected file, which is processed first and does carry a state.
         */
        const hits = wholeField ? [] : girls.filter((g) => namesLikelySamePerson(g.name, wrestler))
        if (hits.length > 1) { ambiguous.add(wrestler); continue }
        // Only North Carolina gets a profile made for her; the rest of the field is recorded as
        // evidence, with a null athlete_id, for the matcher to resolve later.
        if (hits.length === 0 && !wholeField) {
          unmatched.set(wrestler, (unmatched.get(wrestler) ?? 0) + 1)
          /*
           * Keyed case-insensitively, or one wrestler becomes two profiles: the brackets spell her
           * "omarzria (ria) wright" in one round and "Omarzria (Ria) wright" in the next.
           */
          const key = wrestler.toLowerCase()
          if (![...toCreate].some((n) => n.toLowerCase() === key)) toCreate.add(wrestler)
        }

        const identity = `${key}|${b.weight ?? ""}|${b.round ?? ""}|${wrestler}|${b[`${other}_name`] ?? ""}`
        if (emitted.has(identity)) continue
        emitted.add(identity)
        rows.push({
          event_key: key,
          event_name: name,
          year,
          weight_class: b.weight || null,
          round: b.round || null,
          source_round: b.round || null,
          bout_order: Number(b.bout_number) || order,
          athlete_name: wrestler,
          athlete_id: hits[0]?.id ?? null,
          athlete_club: wholeField ? team : "NC",
          opponent_name: b[`${other}_name`] || null,
          opponent_club: b[`${other}_state`] || null,
          win: side === "winner",
          is_bye: /bye/i.test(b[`${other}_name`] ?? ""),
          win_type: b.result_type || null,
          score: [b.score, b.time].filter(Boolean).join(" ") || null,
          source_file: src.file,
          event_date: src.date || null,
        })
      }
    }
    console.log(`${src.file}: ${bouts.length} bouts read`)
  }

  const linked = rows.filter((r) => r.athlete_id)
  console.log(`\nwrestler-rows to insert: ${rows.length} · matched to a profile: ${linked.length} · unmatched: ${rows.length - linked.length}`)
  if (ambiguous.size) console.log(`ambiguous names, left unlinked: ${[...ambiguous].join(", ")}`)
  if (unmatched.size) {
    console.log(`\nNC girls in these brackets with no profile (${unmatched.size}):`)
    for (const [n, c] of [...unmatched].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`   ${String(c).padStart(2)}  ${n}`)
  }

  const byAthlete = new Map<string, number>()
  for (const r of linked) byAthlete.set(String(r.athlete_name), (byAthlete.get(String(r.athlete_name)) ?? 0) + 1)
  console.log(`\nmatches per wrestler:`)
  for (const [n, c] of [...byAthlete].sort((a, b) => b[1] - a[1])) console.log(`   ${String(c).padStart(2)}  ${n}`)

  if (toCreate.size) {
    console.log(`\nwould create ${toCreate.size} profiles for girls in these brackets we do not hold:`)
    for (const n of toCreate) console.log(`   ${n}`)
  }

  if (!WRITE) { console.log("\nRe-run with --write to insert."); return }

  /*
   * Create the missing wrestlers first, then re-resolve, so their bouts land on a profile in the
   * same run. School comes from their own state results where we have them; class year is left
   * for a human, and until it is set their Fargo rows will not display - getFargoFromTable needs
   * a class year to build its window.
   */
  for (const name of toCreate) {
    const last = name.split(" ").slice(-1)[0]
    const { data: st } = await sb
      .from("wrestling_nchsaa_results")
      .select("school, wrestler_name")
      .ilike("classification", "%girls%")
      .ilike("wrestler_name", `%${last}%`)
    const own = (st ?? []).find((r: any) => namesLikelySamePerson(String(r.wrestler_name), name))
    const { data: made, error } = await sb
      .from("athletes")
      .insert({
        name: displayName(name),
        firstName: displayName(name).split(" ")[0],
        lastName: displayName(name).split(" ").slice(1).join(" "),
        gender: "Female",
        highschool: (own as any)?.school ?? null,
        is_nc_athlete: true,
      } as never)
      .select("id, name")
      .maybeSingle()
    if (error || !made) { console.error(`  could not create ${name}: ${error?.message}`); continue }
    girls.push(made as never)
    for (const r of rows) if (!r.athlete_id && r.athlete_name === name) r.athlete_id = (made as any).id
    console.log(`  created ${name}${(own as any)?.school ? ` (${(own as any).school})` : " — no school on file"}`)
  }

  /*
   * Re-runnable: clear what this importer wrote before, never anyone else's rows.
   *
   * Superseded names are cleared too. A second pull arrives under a new filename - the USAW file
   * was re-sent carrying 2026 and both wrestlers' states - and the rows from the first one answer
   * to a `source_file` no longer in SOURCES. Left behind, they survive the delete and then collide
   * with the re-import on the table's own unique key, which aborts the run half-written.
   */
  const SUPERSEDED = ["usaw-womens-nationals-nc-bouts-2023-2026.csv"]
  for (const file of [...SOURCES.map((s) => s.file), ...SUPERSEDED]) {
    await sb.from("other_tournament_bouts").delete().eq("source_file", file)
  }
  let inserted = 0
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200)
    const { error } = await sb.from("other_tournament_bouts").insert(chunk as never)
    if (error) { console.error("FAILED:", error.message); break }
    inserted += chunk.length
  }
  console.log(`\ninserted ${inserted}`)
}
main()
