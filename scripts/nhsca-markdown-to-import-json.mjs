#!/usr/bin/env node
/**
 * Converts NC NHSCA results markdown to JSON for POST /api/admin/nhsca-placements/bulk-import
 *
 * Weight sections supported:
 *   ### 113          (legacy)
 *   ## 113 lbs       (common — pipe tables with Name | Seed | Record | Placement | ...)
 *
 * Usage:
 *   node scripts/nhsca-markdown-to-import-json.mjs path/to/results.md [year]
 *   node scripts/nhsca-markdown-to-import-json.mjs path/to/results.md 2026 > import.json
 */

import fs from "fs"

const yearDefault = parseInt(process.argv[3] || "2026", 10)
const division = "Senior"
const mdPath = process.argv[2]

if (!mdPath || !fs.existsSync(mdPath)) {
  console.error("Usage: node scripts/nhsca-markdown-to-import-json.mjs <markdown-file> [year]")
  process.exit(1)
}

const text = fs.readFileSync(mdPath, "utf8")

/** @returns {number|null} */
function parsePlacement(cell) {
  const c = cell.replace(/\*\*/g, "").trim()
  if (!c || c === "-" || /^n\/a$/i.test(c)) return null
  const m = c.match(/^(\d+)(st|nd|rd|th)?$/i)
  if (m) return parseInt(m[1], 10)
  const n = parseInt(c, 10)
  if (!isNaN(n) && /^\d+$/.test(c)) return n
  return null
}

function splitRow(line) {
  const raw = line.trim()
  if (!raw.startsWith("|")) return null
  const cells = raw
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((s) => s.trim())
  return cells
}

const placements = []
let currentWeight = null

for (const line of text.split(/\n/)) {
  const trimmed = line.trim()
  // ## 113 lbs — weight class section (read tables until next non-weight ## heading)
  const h2Weight = trimmed.match(/^##\s+(\d+)\s*(lbs)?\s*$/i)
  if (h2Weight) {
    currentWeight = h2Weight[1]
    continue
  }
  // Other ## headings (Summary, All-Americans, etc.) end the current weight block
  if (/^##\s/.test(trimmed)) {
    currentWeight = null
    continue
  }
  const h3 = trimmed.match(/^###\s+(\d+)\s*$/)
  if (h3) {
    currentWeight = h3[1]
    continue
  }
  if (!currentWeight) continue
  if (!line.includes("|")) continue
  const cells = splitRow(line)
  if (!cells || cells.length < 4) continue
  const [name, seed, record, placementCell] = cells
  if (!name || /^name$/i.test(name) || /^[-:]+$/.test(name.replace(/\|/g, ""))) continue
  if (/^Name$/i.test(name)) continue

  const placement = parsePlacement(placementCell || "")
  placements.push({
    athlete_name: name.trim(),
    weight_class: currentWeight,
    division,
    placement,
    record: (record || "").replace(/\*\*/g, "").trim() || null,
    high_school: null,
    state: "NC",
    year: yearDefault,
  })
}

const body = { year: yearDefault, placements }
process.stdout.write(JSON.stringify(body, null, 2) + "\n")
process.stderr.write(`Wrote ${placements.length} rows (year=${yearDefault}, division=${division}).\n`)
