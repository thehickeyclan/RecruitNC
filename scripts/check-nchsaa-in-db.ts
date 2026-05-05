#!/usr/bin/env npx tsx
/**
 * Verify NCHSAA rows in `wrestling_nchsaa_results` for a wrestler — profile-style merge + raw SQL-style checks.
 *
 * Usage:
 *   npx tsx scripts/check-nchsaa-in-db.ts
 *   npx tsx scripts/check-nchsaa-in-db.ts "Elias Marquez Flores"
 *   npx tsx scripts/check-nchsaa-in-db.ts "Elias Marquez Flores" 2026
 *
 * Second arg is graduation year (passed to `getNCHSAAResultsForProfile`). Defaults to 2026.
 *
 * Requires `.env.local` (or `.env`) with NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import { dualTokenPairsForNchsaa } from "../lib/nchsaa-profile-fetch"
import {
  escapeForIlike,
  getNCHSAAResultsForProfile,
  plausibleNchsaaYearsForGradYear,
} from "../lib/nchsaa-results"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function loadEnvFile(rel: string) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) return
  const text = fs.readFileSync(p, "utf8")
  for (const line of text.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    val = val.replace(/\r$/, "").trim()
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

function trimEnv(s: string | undefined) {
  return (s ?? "").replace(/^\s+|\s+$/g, "").replace(/\r/g, "").trim()
}

const url = trimEnv(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "")
const key = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE)

const argv = process.argv.slice(2).filter((a) => !a.startsWith("-"))
const name = argv[0]?.trim() || "Elias Marquez Flores"
const gradYear = argv[1] ? parseInt(argv[1], 10) : 2026

function rowBrief(r: {
  year: number
  wrestler_name?: string
  place?: number | null
  classification?: string
  weight_class?: string
  school?: string
}) {
  return {
    year: r.year,
    wrestler_name: r.wrestler_name,
    place: r.place,
    classification: r.classification,
    weight_class: r.weight_class,
    school: r.school,
  }
}

async function main() {
  if (!url || !key) {
    console.error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }
  if (!Number.isFinite(gradYear)) {
    console.error("Invalid graduation year")
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const yr = plausibleNchsaaYearsForGradYear(gradYear)

  console.log("--- check-nchsaa-in-db ---")
  console.log(`name (argv):     "${name}"`)
  console.log(`gradYear (argv): ${gradYear}`)
  console.log(`plausible years: ${yr.min}..${yr.max} (same as getNCHSAAResultsForProfile filter)`)
  console.log(`dual-token pairs:`, JSON.stringify(dualTokenPairsForNchsaa(name)))
  console.log("")

  const profileRows = await getNCHSAAResultsForProfile(supabase, name, gradYear)
  console.log(`getNCHSAAResultsForProfile: ${profileRows.length} row(s)`)
  console.log(JSON.stringify(profileRows.map(rowBrief), null, 2))
  console.log("")

  const lastWord = name.split(/\s+/).filter(Boolean).pop() ?? name
  const lastPattern = `%${escapeForIlike(lastWord)}%`
  const { data: byLastName, error: errLast } = await supabase
    .from("wrestling_nchsaa_results")
    .select("year, wrestler_name, place, classification, weight_class, school")
    .ilike("wrestler_name", lastPattern)
    .gte("year", yr.min)
    .lte("year", yr.max)
    .order("year", { ascending: false })
    .limit(80)

  if (errLast) {
    console.error("raw ilike(last token) error:", errLast.message)
  } else {
    console.log(
      `raw ilike('%${lastWord}%') in year [${yr.min},${yr.max}], limit 80: ${byLastName?.length ?? 0} row(s)`,
    )
    const withFirst = name.split(/\s+/)[0]?.toLowerCase() ?? ""
    const narrowed = (byLastName ?? []).filter((r) => (r.wrestler_name ?? "").toLowerCase().includes(withFirst))
    console.log(`… rows also containing first token "${withFirst}": ${narrowed.length}`)
    console.log(JSON.stringify(narrowed.map(rowBrief), null, 2))
  }

  console.log("")
  console.log("Hint: if profile_rows is empty but raw has your wrestler, fix name on athlete or add SAME_PERSON_NAME_ALIASES.")
  console.log("Hint: if no row for year 2026 in DB, import / SQL insert is required — code cannot invent a qualifier.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
