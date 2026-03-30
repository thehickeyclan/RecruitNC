#!/usr/bin/env node
/**
 * Convert NHSCA podium export { classification, weight_classes: { "106": { "1": "Name", ... } } }
 * into scripts/data import JSON for nhsca-json-to-sql / bulk-import.
 *
 * Usage:
 *   node scripts/convert-nhsca-podium-to-import.mjs path/to/podium.json 2026 Sophomore
 * Or pipe JSON on stdin:
 *   cat podium.json | node scripts/convert-nhsca-podium-to-import.mjs - 2026 Sophomore
 */
import fs from "fs"

const args = process.argv.slice(2)
let rawInput
let year = 2026
let division = "Sophomore"

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
const weightClasses = data.weight_classes ?? data.weightClasses
if (!weightClasses || typeof weightClasses !== "object") {
  console.error("Expected weight_classes object")
  process.exit(1)
}

const placements = []
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

placements.sort((a, b) => {
  const wa = parseInt(a.weight_class, 10) || 0
  const wb = parseInt(b.weight_class, 10) || 0
  if (wa !== wb) return wa - wb
  return (a.placement ?? 0) - (b.placement ?? 0)
})

const out = { year, placements }
process.stdout.write(JSON.stringify(out, null, 2) + "\n")
