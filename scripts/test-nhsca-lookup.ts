#!/usr/bin/env npx tsx
/**
 * Local NHSCA table lookup — same path as public profiles (`getNHSCAFromTables` → dedupe).
 *
 * Requires .env.local (or .env) with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 *   npx tsx scripts/test-nhsca-lookup.ts
 *   npx tsx scripts/test-nhsca-lookup.ts "Aaron Ellison" 2028
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import { dedupeNhscaByYearForGradYear, getNHSCAFromTables } from "../lib/tournament-tables"

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

const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL).replace(/\/+$/, "")
const key = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

const args = process.argv.slice(2).filter((a) => !a.startsWith("-"))
const name = args[0]?.trim() || "Aaron Ellison"
const gradYear = args[1] ? parseInt(args[1], 10) : 2028

async function main() {
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }
  if (!Number.isFinite(gradYear)) {
    console.error("Invalid graduation year")
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const startYear = gradYear - 4
  const yearMax = gradYear + 1

  console.log(`NHSCA lookup: name="${name}" graduationYear=${gradYear}`)
  console.log(`Year window used for placements/legacy: ${startYear}–${yearMax} (inclusive)`)
  console.log("(merge order: nhsca_roster → nhsca_placements → wrestling_nhsca_results)\n")

  const rows = await getNHSCAFromTables(supabase, name, gradYear)
  const deduped = dedupeNhscaByYearForGradYear(rows, gradYear)

  console.log("getNHSCAFromTables (raw rows):", JSON.stringify(rows, null, 2))
  console.log("\ndedupeNhscaByYearForGradYear:", JSON.stringify(deduped, null, 2))

  if (rows.length === 0) {
    console.log("\n--- Diagnostics (why empty?) ---")
    const lastToken = name.split(/\s+/).filter(Boolean).pop() ?? name
    const pattern = `%${lastToken.replace(/%/g, "\\%")}%`

    const pl = await supabase
      .from("nhsca_placements")
      .select("athlete_name,year,division,weight_class,placement,record", { count: "exact" })
      .ilike("athlete_name", pattern)
      .gte("year", startYear)
      .lte("year", yearMax)
      .limit(5)
    if (pl.error?.code === "42P01" || pl.error?.message?.includes("does not exist")) {
      console.log("nhsca_placements: table missing — run scripts/create-nhsca-placements-minimal.sql")
    } else if (pl.error) {
      const msg = pl.error.message || String(pl.error)
      console.log(
        "nhsca_placements error:",
        msg,
        msg.includes("fetch") ? "(check SUPABASE_URL, network, VPN)" : "",
      )
    } else {
      console.log(`nhsca_placements (ILIKE ${pattern}, year ${startYear}–${yearMax}): count=${pl.count ?? (pl.data?.length ?? 0)}`)
      if (pl.data?.length) console.log("  sample:", JSON.stringify(pl.data, null, 2))
    }

    const ro = await supabase.from("nhsca_roster").select("*", { count: "exact" }).ilike("name", pattern).limit(5)
    if (ro.error?.code === "42P01" || ro.error?.message?.includes("does not exist")) {
      console.log("nhsca_roster: table missing or not used in this project")
    } else if (ro.error) {
      const msg = ro.error.message || String(ro.error)
      console.log("nhsca_roster error:", msg, msg.includes("fetch") ? "(check SUPABASE_URL, network)" : "")
    } else {
      console.log(`nhsca_roster (ILIKE ${pattern}): count=${ro.count ?? (ro.data?.length ?? 0)}`)
      if (ro.data?.length) console.log("  sample:", JSON.stringify(ro.data, null, 2))
    }

    const leg = await supabase
      .from("wrestling_nhsca_results")
      .select("athlete_name,year,division,weight", { count: "exact" })
      .ilike("athlete_name", pattern)
      .gte("year", startYear)
      .lte("year", yearMax)
      .limit(5)
    if (leg.error?.code === "42P01" || leg.error?.message?.includes("does not exist")) {
      console.log("wrestling_nhsca_results: table missing")
    } else if (leg.error) {
      const msg = leg.error.message || String(leg.error)
      console.log("wrestling_nhsca_results error:", msg, msg.includes("fetch") ? "(check SUPABASE_URL, network)" : "")
    } else {
      console.log(`wrestling_nhsca_results (ILIKE ${pattern}, year window): count=${leg.count ?? (leg.data?.length ?? 0)}`)
      if (leg.data?.length) console.log("  sample:", JSON.stringify(leg.data, null, 2))
    }

    console.log(
      "\nIf all counts are 0: import data for this Supabase project (npm run nhsca:import …) or confirm .env.local points at the project that has the data.",
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
