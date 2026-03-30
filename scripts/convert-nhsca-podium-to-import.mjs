#!/usr/bin/env node
/**
 * Convert NHSCA exports into scripts/data import JSON for nhsca-json-to-sql / bulk-import.
 *
 * Format A — podium (final placement):
 *   { classification, weight_classes: { "106": { "1": "Name", ... } } }
 *
 * Format B — weight class list + seeds (not final placement; avoids seed 1 showing as Champion):
 *   { classification, weightClasses: [{ weightClass, seeds: [{ seed, name }] }] }
 *
 * Usage:
 *   node scripts/convert-nhsca-podium-to-import.mjs path/to/podium.json 2026 Sophomore
 *   node scripts/convert-nhsca-podium-to-import.mjs path/to/freshman-seeds.json 2026 Freshman
 * Division defaults from data.classification when arg omitted (Freshman, Sophomore, …).
 */
import fs from "fs"

const args = process.argv.slice(2)
let rawInput
let year = 2026
let division = ""

if (args[0] === "-" || args[0]?.startsWith("{")) {
  rawInput = args[0] === "-" ? fs.readFileSync(0, "utf8") : args[0]
  if (args[1]) year = parseInt(args[1], 10) || year
  if (args[2]) division = args[2]
} else if (args[0]) {
  const p = args[0]
  rawInput = fs.readFileSync(p, "utf8")
  if (args[1]) year = parseInt(args[1], 10) || year
  if (args[2]) division = args[2]
} else {
  console.error(
    "Usage: node scripts/convert-nhsca-podium-to-import.mjs <podium.json> [year] [division]",
  )
  process.exit(1)
}

const data = JSON.parse(rawInput)
const fromClassification = (data.classification ?? "").toString().trim()
if (!division && fromClassification) {
  division =
    fromClassification.charAt(0).toUpperCase() + fromClassification.slice(1).toLowerCase()
}
if (!division) division = "Sophomore"

const weightClasses = data.weight_classes ?? data.weightClasses
const placements = []

function sortPlacements(rows) {
  function seedOrder(r) {
    const m = String(r.record || "").match(/^Seed (\d+)/)
    return m ? parseInt(m[1], 10) : 999
  }
  rows.sort((a, b) => {
    const wa = parseInt(a.weight_class, 10) || 0
    const wb = parseInt(b.weight_class, 10) || 0
    if (wa !== wb) return wa - wb
    const pa = a.placement
    const pb = b.placement
    if (pa != null && pb != null && pa !== pb) return pa - pb
    if (pa != null && pb == null) return -1
    if (pa == null && pb != null) return 1
    const sa = seedOrder(a)
    const sb = seedOrder(b)
    if (sa !== sb) return sa - sb
    return (a.athlete_name || "").localeCompare(b.athlete_name || "")
  })
}

if (Array.isArray(weightClasses)) {
  for (const wc of weightClasses) {
    const w = String(wc.weightClass ?? wc.weight_class ?? "").trim()
    const seeds = wc.seeds ?? []
    for (const s of seeds) {
      const athlete_name = String(s.name ?? "").trim()
      if (!athlete_name) continue
      const seedNum = s.seed
      const seedLabel = Number.isFinite(Number(seedNum)) ? Number(seedNum) : String(seedNum ?? "")
      placements.push({
        athlete_name,
        weight_class: w,
        division,
        placement: null,
        record: `Seed ${seedLabel}`,
        high_school: null,
        state: "NC",
        year,
      })
    }
  }
  sortPlacements(placements)
} else if (weightClasses && typeof weightClasses === "object") {
  for (const [wc, ranks] of Object.entries(weightClasses)) {
    if (!ranks || typeof ranks !== "object") continue
    for (const [placeStr, name] of Object.entries(ranks)) {
      const placement = parseInt(placeStr, 10)
      if (!Number.isFinite(placement) || placement < 1) continue
      const athlete_name = String(name ?? "").trim()
      if (!athlete_name) continue
      placements.push({
        athlete_name,
        weight_class: String(wc),
        division,
        placement,
        record: null,
        high_school: null,
        state: "NC",
        year,
      })
    }
  }
  sortPlacements(placements)
} else {
  console.error("Expected weight_classes object or weightClasses array")
  process.exit(1)
}

const out = { year, placements }
process.stdout.write(JSON.stringify(out, null, 2) + "\n")
