#!/usr/bin/env npx tsx
/**
 * Mint profiles for the field of a national event, from a candidates file.
 *
 * State-association minting can never reach these wrestlers. National Preps is the clearest case:
 * Blair does not wrestle NJSIAA and Wyoming Seminary does not wrestle PIAA, so no state's placer
 * table will ever contain them, yet their names appear all over our own profiles as unlinked
 * opponents. The same holds for any invitational with a national field.
 *
 * Each profile's state is where the school is LOCATED, never where the wrestler lives
 * (lib/athlete-state.ts, and the "school state is platform state" rule): a boarder from Hawaii at
 * Wyoming Seminary is a Pennsylvania profile, because Pennsylvania is who he wrestles against.
 *
 * These are records, not recruits: no contact details, no GPA, no date of birth. `external_id`
 * carries the event source's own person id, so a second run finds the same wrestler rather than
 * making her twice.
 *
 *   npx tsx scripts/mint-event-field-profiles.ts --file <candidates.json>           # dry run
 *   npx tsx scripts/mint-event-field-profiles.ts --file <candidates.json> --write
 *
 * The candidates file is { source, candidates: [{ external_id, name, class_year, gender, school,
 * school_city, state, last_weight }] }. Building it is the event's own job; this script only
 * decides who is new and writes them.
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { firstNamesLikelySame, namesReferToSamePerson } from "@/lib/athlete-name-match"
import { HOME_STATE } from "@/lib/recruiting/states"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
const WRITE = process.argv.includes("--write")
const FILE = process.argv[process.argv.indexOf("--file") + 1] ?? ""
if (!FILE || !fs.existsSync(FILE)) {
  console.error("--file <candidates.json> is required")
  process.exit(1)
}

/** Current recruitable classes. Never mint without one: see the "profiles only 2027-2030" rule. */
const CURRENT = new Set([2027, 2028, 2029, 2030])

type Candidate = {
  external_id: string
  name: string
  class_year: number
  gender: string
  school?: string | null
  school_city?: string | null
  state: string
  last_weight?: number | string | null
}

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
const surname = (n: string) => norm(n).split(" ").slice(-1)[0] ?? ""
const given = (n: string) => norm(n).split(" ")[0] ?? ""

/**
 * Two spellings of one school. Flo writes "Lakeway Christian Academy" where our own row says
 * "Lakeway Christian", so the words that carry no information have to come out before comparing.
 */
const SCHOOL_NOISE = new Set(["school", "academy", "the", "of", "high", "prep", "preparatory", "institute", "college", "hs"])
const schoolWords = (s: unknown) => norm(s).split(" ").filter((w) => w && !SCHOOL_NOISE.has(w))
function sameSchool(a: unknown, b: unknown) {
  const x = schoolWords(a)
  const y = schoolWords(b)
  if (!x.length || !y.length) return false
  const [short, long] = x.length <= y.length ? [x, y] : [y, x]
  return short.every((w) => long.includes(w))
}

/** "Josh" for "Joshua", "Kohl" for "Kohlton": a shortening, not a different boy. */
const prefixOfEachOther = (a: string, b: string) =>
  a.length >= 3 && b.length >= 3 && a !== b && (a.startsWith(b) || b.startsWith(a))

/**
 * One typo apart, allowing a transposition: "Issac" for "Isaac", "Kadyn" for "Kayden". Short names
 * are excluded, where one edit is the difference between Jon and Jan.
 */
function nearlyIdentical(a: string, b: string) {
  if (a === b || a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length] <= 1
}
const title = (name: string) =>
  /[A-Z]/.test(name) ? name : name.replace(/(^|[\s('-])([a-z])/g, (_m, pre, ch) => pre + ch.toUpperCase())

/**
 * Keyset paging, never OFFSET. OFFSET re-reads and discards every row it skips, so the last page
 * of a sweep costs as much as the whole table.
 */
async function pageAll(table: string, select: string) {
  const out: Record<string, unknown>[] = []
  let after: number | string | null = null
  for (let page = 0; page < 500; page++) {
    let q = sb.from(table).select(select).order("id").limit(1000)
    if (after !== null) q = q.gt("id", after)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as Record<string, unknown>[]))
    if (!data || data.length < 1000) break
    after = data[data.length - 1].id as number | string
  }
  return out
}

async function main() {
  const file = JSON.parse(fs.readFileSync(FILE, "utf8")) as { source?: string; candidates: Candidate[] }
  const SOURCE = file.source ?? "event field"
  const all = file.candidates ?? []
  const candidates = all.filter((c) => c.name && CURRENT.has(Number(c.class_year)))
  console.log(WRITE ? `WRITING — ${SOURCE}\n` : `DRY RUN — ${SOURCE}, nothing is written\n`)
  console.log(`${all.length} in file | ${candidates.length} in a current class (2027-2030)`)

  const probe = await sb.from("athletes").select("source_athlete_id").limit(1)
  const HAS_SOURCE_ID = !probe.error
  if (!HAS_SOURCE_ID) {
    console.log("NOTE: athletes.source_athlete_id is missing, so a re-run cannot recognise these")
    console.log("      wrestlers by id and would fall back to name matching. Add the column first.\n")
  }

  const existing = await pageAll(
    "athletes",
    `id,name,gender,graduationyear,highschool,state,is_nc_athlete${HAS_SOURCE_ID ? ",source_athlete_id" : ""}`,
  )
  console.log(`${existing.length} profiles held today`)

  const byExternal = new Map<string, Record<string, unknown>>()
  const byName = new Map<string, Record<string, unknown>[]>()
  /*
   * Surname + class year, as the net for a wrestler we hold under a different first name. Our own
   * rule is to try nicknames before declaring a wrestler missing: a "Josh Stonebraker" in the file
   * and a "Joshua Stonebraker" on the platform are one boy, and minting the second splits his
   * record in two.
   *
   * A shared surname alone decides nothing. Autumn Smith sits in this bucket beside thirteen other
   * Smiths and is none of them, so the match is only taken when the first names are a known
   * nickname pair, a shortening, one typo apart, or the school agrees.
   */
  const bySurnameYear = new Map<string, Record<string, unknown>[]>()
  for (const a of existing) {
    if (a.source_athlete_id) byExternal.set(String(a.source_athlete_id), a)
    const n = norm(a.name)
    byName.set(n, [...(byName.get(n) ?? []), a])
    const k = `${surname(String(a.name))}|${a.graduationyear ?? ""}`
    bySurnameYear.set(k, [...(bySurnameYear.get(k) ?? []), a])
  }

  const toCreate: Record<string, unknown>[] = []
  const heldById: string[] = []
  const heldByName: string[] = []
  const nicknames: string[] = []
  const seen = new Set<string>()

  for (const c of candidates) {
    const label = `${c.name} (${c.school ?? "?"}, ${c.state}, ${c.class_year})`
    if (seen.has(c.external_id)) continue
    seen.add(c.external_id)

    if (byExternal.has(String(c.external_id))) {
      heldById.push(label)
      continue
    }
    const exact = (byName.get(norm(c.name)) ?? []).filter((a) => namesReferToSamePerson(String(a.name), c.name))
    if (exact.length) {
      heldByName.push(`${label} -> ${exact.map((a) => `#${a.id} ${a.name}`).join(", ")}`)
      continue
    }
    const nick = (bySurnameYear.get(`${surname(c.name)}|${c.class_year}`) ?? [])
      .filter((a) => norm(a.name) !== norm(c.name))
      .map((a) => {
        const g = given(String(a.name))
        const why = firstNamesLikelySame(g, given(c.name))
          ? "known nickname"
          : prefixOfEachOther(g, given(c.name))
            ? "shortened"
            : nearlyIdentical(g, given(c.name))
              ? "one typo apart"
              : /*
                 * The school agreeing is corroboration, never a match by itself. Summer and Charlie
                 * Mutschler are both at Archbishop Spalding in the class of 2028 and are two
                 * different children; so are Harrison and Elliott Byers. Requiring the first names
                 * to begin alike keeps a spelling variant ("Kadyn" for "Kayden") and drops siblings.
                 */
                sameSchool(a.highschool, c.school) && g.slice(0, 2) === given(c.name).slice(0, 2)
                ? "same school, same spelling"
                : null
        return { a, why }
      })
      .filter((m) => m.why)
    if (nick.length) {
      // Not minted and not merged: a human decides whether these are the same wrestler.
      nicknames.push(`${label} ~ ${nick.map((m) => `#${m.a.id} ${m.a.name} (${m.a.highschool ?? "?"}) [${m.why}]`).join(", ")}`)
      continue
    }

    const name = title(c.name)
    toCreate.push({
      name,
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
      gender: c.gender === "Female" ? "Female" : "Male",
      highschool: c.school || null,
      state: c.state,
      graduationyear: Number(c.class_year),
      is_nc_athlete: c.state === HOME_STATE,
      ...(HAS_SOURCE_ID ? { source_athlete_id: c.external_id, source_athlete_id_source: SOURCE } : {}),
    })
  }

  const byState: Record<string, number> = {}
  for (const a of toCreate) byState[String(a.state)] = (byState[String(a.state)] ?? 0) + 1
  console.log(`\nwould create            : ${toCreate.length}`)
  console.log(`  female / male         : ${toCreate.filter((a) => a.gender === "Female").length} / ${toCreate.filter((a) => a.gender === "Male").length}`)
  console.log(`  by located state      : ${Object.entries(byState).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} ${n}`).join(", ")}`)
  console.log(`already held, by id      : ${heldById.length}`)
  console.log(`already held, same name  : ${heldByName.length}`)
  console.log(`possible nickname, held  : ${nicknames.length}`)
  if (nicknames.length) console.log(`   ${nicknames.join("\n   ")}`)
  console.log(`\nsample:`)
  for (const a of toCreate.slice(0, 8)) console.log(`   ${a.name} — ${a.highschool}, ${a.state}, ${a.gender}, class of ${a.graduationyear}`)

  if (!WRITE) {
    console.log(`\nRe-run with --write to create ${toCreate.length} profiles.`)
    return
  }
  let made = 0
  for (let i = 0; i < toCreate.length; i += 100) {
    const { data, error } = await sb.from("athletes").insert(toCreate.slice(i, i + 100)).select("id")
    if (error) {
      console.error(`  failed at ${i}: ${error.message}`)
      break
    }
    made += data?.length ?? 0
  }
  console.log(`\ncreated ${made} profiles`)
}
main()
