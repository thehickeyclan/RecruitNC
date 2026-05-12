#!/usr/bin/env npx tsx
/**
 * List or update `place` on `wrestling_nchsaa_results` (e.g. fix SQ → state champion).
 *
 * Usage (inspect only — default):
 *   npx tsx scripts/fix-nchsaa-place.ts "Madelyn Korvink" --year 2026
 *
 * Update to state champion (dry-run still — add --apply):
 *   npx tsx scripts/fix-nchsaa-place.ts "Madelyn Korvink" --year 2026 --classification "Women" --weight 148 --set-place 1 --apply
 *
 * Match exact DB name:
 *   npx tsx scripts/fix-nchsaa-place.ts --wrestler-name-exact "Korvink, Madelyn" --year 2026 --set-place 1 --apply
 *
 * Requires `.env.local` or `.env`:
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import { escapeForIlike } from "../lib/nchsaa-results"

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

type Row = {
  id?: string
  year: number
  classification: string
  weight_class: string
  place: number | null
  wrestler_name: string
  school: string
}

function parseArgs(argv: string[]) {
  const pos: string[] = []
  const flags = new Map<string, string | boolean>()
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--")) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith("--")) {
        flags.set(key, next)
        i++
      } else {
        flags.set(key, true)
      }
    } else {
      pos.push(a)
    }
  }
  return { pos, flags }
}

async function main() {
  const raw = process.argv.slice(2)
  const { pos, flags } = parseArgs(raw)
  const apply = flags.has("apply")
  const allowMultiple = flags.has("allow-multiple")

  const year = flags.get("year") != null ? parseInt(String(flags.get("year")), 10) : NaN
  const setPlaceRaw = flags.get("set-place")
  const setPlace = setPlaceRaw != null ? parseInt(String(setPlaceRaw), 10) : null

  const classification = flags.get("classification") != null ? String(flags.get("classification")).trim() : ""
  const weight = flags.get("weight") != null ? String(flags.get("weight")).trim() : ""
  const school = flags.get("school") != null ? String(flags.get("school")).trim() : ""
  const wrestlerNameExact = flags.get("wrestler-name-exact") != null ? String(flags.get("wrestler-name-exact")).trim() : ""

  const displayName = pos[0]?.trim() ?? ""

  if (!wrestlerNameExact && !displayName) {
    console.error(
      "Usage: npx tsx scripts/fix-nchsaa-place.ts \"Display Name\" [--year YYYY] [--classification C] [--weight W] [--school S] [--set-place N] [--apply]\n" +
        "   or: npx tsx scripts/fix-nchsaa-place.ts --wrestler-name-exact \"Last, First\" --year YYYY ... [--set-place N] [--apply]",
    )
    process.exit(1)
  }

  if (flags.get("set-place") != null && (setPlace == null || !Number.isFinite(setPlace))) {
    console.error("--set-place must be a number (e.g. 0 = SQ, 1 = state champion)")
    process.exit(1)
  }

  const url = trimEnv(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "")
  const key = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE)
  if (!url || !key) {
    console.error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(url, key)

  let query = supabase.from("wrestling_nchsaa_results").select("id, year, classification, weight_class, place, wrestler_name, school")

  if (wrestlerNameExact) {
    query = query.eq("wrestler_name", wrestlerNameExact)
  } else {
    const last = displayName.split(/\s+/).filter(Boolean).pop() ?? displayName
    const pattern = `%${escapeForIlike(last)}%`
    query = query.ilike("wrestler_name", pattern)
    const first = displayName.split(/\s+/).filter(Boolean)[0] ?? ""
    if (first && first.length >= 2) {
      query = query.ilike("wrestler_name", `%${escapeForIlike(first)}%`)
    }
  }

  if (Number.isFinite(year)) {
    query = query.eq("year", year)
  }

  if (classification) {
    query = query.ilike("classification", classification)
  }
  if (weight) {
    query = query.eq("weight_class", weight)
  }
  if (school) {
    query = query.ilike("school", `%${escapeForIlike(school)}%`)
  }

  const { data: rows, error } = await query.order("year", { ascending: false }).limit(100)
  if (error) {
    console.error("Query error:", error.message)
    process.exit(1)
  }

  const list = (rows ?? []) as Row[]
  console.log(`--- fix-nchsaa-place (${apply ? "APPLY" : "dry-run"}) ---`)
  console.log(`Matched ${list.length} row(s)`)
  if (list.length === 0) {
    console.log("Nothing to do. Try --wrestler-name-exact \"Last, First\" or broaden filters (drop --weight).")
    process.exit(0)
  }

  for (const r of list) {
    console.log(
      JSON.stringify({
        id: r.id,
        year: r.year,
        classification: r.classification,
        weight_class: r.weight_class,
        place: r.place,
        wrestler_name: r.wrestler_name,
        school: r.school,
      }),
    )
  }

  if (setPlace == null) {
    console.log("\n(omit --set-place to only list; add --set-place 1 --apply to update)")
    process.exit(0)
  }

  if (list.length > 1 && !allowMultiple) {
    console.error(
      `\nRefusing to update ${list.length} rows without --allow-multiple. Narrow --classification / --weight / --wrestler-name-exact.`,
    )
    process.exit(1)
  }

  const ids = list.map((r) => r.id).filter(Boolean) as string[]
  const useIds = ids.length === list.length && ids.length > 0

  if (!apply) {
    console.log(`\nDry-run: would set place = ${setPlace} on ${list.length} row(s). Re-run with --apply to write.`)
    process.exit(0)
  }

  if (useIds) {
    const { error: upErr } = await supabase.from("wrestling_nchsaa_results").update({ place: setPlace }).in("id", ids)
    if (upErr) {
      console.error("Update error:", upErr.message)
      process.exit(1)
    }
    console.log(`\nOK: updated place → ${setPlace} for ${ids.length} row(s) (by id).`)
    return
  }

  let updated = 0
  for (const r of list) {
    const q = supabase
      .from("wrestling_nchsaa_results")
      .update({ place: setPlace })
      .eq("year", r.year)
      .eq("wrestler_name", r.wrestler_name)
      .eq("classification", r.classification)
      .eq("weight_class", r.weight_class)
    const { error: u } = await q
    if (u) {
      console.error("Update error (composite key):", u.message, r)
      process.exit(1)
    }
    updated++
  }
  console.log(`\nOK: updated place → ${setPlace} for ${updated} row(s) (year + name + class + weight).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
