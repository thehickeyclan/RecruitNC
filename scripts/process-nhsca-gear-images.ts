/**
 * Remove backgrounds from NHSCA Duals 2026 gear PNGs (local public/ files).
 *
 * Requires .env.local:
 *   FAL_KEY
 *   BLOB_READ_WRITE_TOKEN
 *
 *   npm run nhsca:gear-bg
 *   npm run nhsca:gear-bg -- white-front blue-front
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import {
  manifestFromResults,
  processAllNhscaGearImages,
} from "../lib/nhsca-process-gear-images"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const manifestPath = path.join(root, "lib/nhsca-gear-processed-manifest.json")

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

async function main() {
  const ids = process.argv.slice(2).filter(Boolean)

  if (!process.env.FAL_KEY) {
    console.error("Missing FAL_KEY in .env.local")
    process.exit(1)
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Missing BLOB_READ_WRITE_TOKEN in .env.local")
    process.exit(1)
  }

  console.log(ids.length ? `Processing: ${ids.join(", ")}` : "Processing all NHSCA gear images…")

  const results = await processAllNhscaGearImages({ ids: ids.length ? ids : undefined })
  const manifest = manifestFromResults(results)

  let existing: Record<string, string> = {}
  if (fs.existsSync(manifestPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, string>
    } catch {
      existing = {}
    }
  }
  const merged = { ...existing, ...manifest }
  fs.writeFileSync(manifestPath, `${JSON.stringify(merged, null, 2)}\n`)

  for (const r of results) {
    const mark = r.status === "success" ? "✓" : "✗"
    console.log(`${mark} ${r.label}: ${r.message ?? r.status}`)
    if (r.blobUrl) console.log(`  blob: ${r.blobUrl}`)
    if (r.localPath && r.savedLocal) console.log(`  local: public${r.localPath}`)
  }

  const ok = results.filter((r) => r.status === "success").length
  const fail = results.filter((r) => r.status === "error").length
  console.log(`\nDone: ${ok} succeeded, ${fail} failed`)
  console.log(`Manifest updated: lib/nhsca-gear-processed-manifest.json`)
  if (fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
