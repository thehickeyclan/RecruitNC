#!/usr/bin/env npx tsx
/**
 * Rollback NCHSAA single-season most victories import for one dataset_key + version.
 * Does NOT delete athletes, schools, or unrelated winningest rows.
 *
 *   npm run rollback:historical-wins
 *   npm run rollback:historical-wins -- --version 1 --dry-run
 */

import path from "path"
import fs from "fs"
import { createClient } from "@supabase/supabase-js"
import {
  HISTORICAL_WINS_DATASET_KEY,
  HISTORICAL_WINS_VERSION,
} from "../lib/historical-wins/constants"

const root = path.resolve(__dirname, "..")

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
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val.replace(/\r$/, "").trim()
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

function trimEnv(s: string | undefined) {
  return (s ?? "").replace(/^\s+|\s+$/g, "").replace(/\r/g, "").trim()
}

const argv = process.argv.slice(2)
const dryRun = argv.includes("--dry-run")
let version = HISTORICAL_WINS_VERSION
const vi = argv.indexOf("--version")
if (vi >= 0 && argv[vi + 1]) version = Number(argv[vi + 1])

async function main() {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
  const key = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!url || !key) {
    console.error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(url.replace(/\/+$/, ""), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: sources, error } = await supabase
    .from("historical_record_sources")
    .select("id, title, dataset_key, version")
    .eq("dataset_key", HISTORICAL_WINS_DATASET_KEY)
    .eq("version", version)

  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  if (!sources?.length) {
    console.log("No source row found — nothing to roll back.")
    process.exit(0)
  }

  for (const s of sources) {
    const { count } = await supabase
      .from("winningest_wrestlers")
      .select("id", { count: "exact", head: true })
      .eq("source_id", s.id)
    console.log(`Would delete ${count ?? "?"} winningest rows for source ${s.id} (${s.title})`)
    if (dryRun) continue

    const { error: delRows } = await supabase
      .from("winningest_wrestlers")
      .delete()
      .eq("source_id", s.id)
    if (delRows) {
      console.error(delRows.message)
      process.exit(1)
    }
    const { error: delSrc } = await supabase
      .from("historical_record_sources")
      .delete()
      .eq("id", s.id)
    if (delSrc) {
      console.error(delSrc.message)
      process.exit(1)
    }
    console.log(`Rolled back source ${s.id}`)
  }

  if (dryRun) console.log("Dry-run — no deletes.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
