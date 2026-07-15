/**
 * Trackwrestling historical Fargo adapter.
 * Parses Track-style tab exports and "Winner (ST) over Loser (ST) (method)" lines.
 * Never accepts FloWrestling as SoR.
 */

import { buildFargoDivisionLabel } from "@/lib/fargo-division"
import { normalizeFargoResultType, parseOverSummary } from "@/lib/fargo-result-types"
import { canonicalizeWrestlerName } from "../normalize"
import type {
  FargoAdapterParseResult,
  FargoBracketContext,
  FargoParsedMatch,
  FargoParsedPlacer,
} from "./fargo-adapter-types"
import { parseUsaBracketingExport } from "./fargo-usa-bracketing"

function assertNotFlo(text: string): void {
  const t = text.toLowerCase()
  if (t.includes("flowrestling.org") || t.includes("floarena")) {
    throw new Error("FloWrestling is never accepted as Fargo SoR. Use Trackwrestling exports.")
  }
}

function isFargoEventName(event: string): boolean {
  const e = event.toLowerCase()
  return (
    e.includes("fargo") ||
    e.includes("junior national") ||
    e.includes("16u national") ||
    e.includes("marine corps") ||
    e.includes("usmc")
  )
}

/**
 * Track tab export: Date \t Event \t Weight \t Summary
 * Or bare "over" lines with weight on a prior line.
 */
export function parseTrackwrestlingExport(
  text: string,
  context: FargoBracketContext,
): FargoAdapterParseResult {
  assertNotFlo(text)
  const warnings: string[] = []
  const matches: FargoParsedMatch[] = []
  const placers: FargoParsedPlacer[] = []

  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  if (!lines.length) {
    return {
      adapter: "trackwrestling",
      context: { ...context, source_adapter: "trackwrestling" },
      matches,
      placers,
      warnings: ["Empty Trackwrestling export"],
    }
  }

  // JSON using shared bracket schema
  if (lines[0].startsWith("{") || lines[0].startsWith("[")) {
    try {
      const json = JSON.parse(text)
      const asUsab = parseUsaBracketingExport(json, context)
      return {
        ...asUsab,
        adapter: "trackwrestling",
        context: { ...asUsab.context, source_adapter: "trackwrestling" },
        warnings: [
          ...asUsab.warnings,
          "Parsed JSON via shared bracket schema under Trackwrestling adapter",
        ],
      }
    } catch {
      // fall through to text formats
    }
  }

  const header = lines[0].toLowerCase()
  const hasHeader = header.includes("date") && (header.includes("summary") || header.includes("event"))
  const start = hasHeader ? 1 : 0
  let order = 0

  for (let i = start; i < lines.length; i++) {
    const line = lines[i]
    const parts = line.split(/\t/)

    if (parts.length >= 4) {
      const [, event, weight, summary] = parts.map((p) => p.trim())
      if (event && !isFargoEventName(event)) {
        warnings.push(`Skipped non-Fargo event line: ${event}`)
        continue
      }
      const parsed = parseOverSummary(summary)
      if (!parsed) continue
      order += 1
      matches.push({
        source_match_id: `track-${context.year}-${context.style}-${context.age_division}-${order}`,
        weight_class: weight.replace(/^\d*A\s+/i, "").trim(),
        round: null,
        match_order: order,
        winner_name: canonicalizeWrestlerName(parsed.winner_name),
        winner_state: parsed.winner_state,
        loser_name: canonicalizeWrestlerName(parsed.loser_name),
        loser_state: parsed.loser_state,
        result_type: parsed.result_type,
        score: parsed.score,
        raw: { line },
      })
      continue
    }

    if (line.includes(" over ")) {
      const parsed = parseOverSummary(line)
      if (!parsed) continue
      order += 1
      // Look back for a weight-only line
      let weight = ""
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (/^\d{2,3}$/.test(lines[j])) {
          weight = lines[j]
          break
        }
      }
      matches.push({
        source_match_id: `track-${context.year}-${context.style}-${context.age_division}-${order}`,
        weight_class: weight,
        round: null,
        match_order: order,
        winner_name: canonicalizeWrestlerName(parsed.winner_name),
        winner_state: parsed.winner_state,
        loser_name: canonicalizeWrestlerName(parsed.loser_name),
        loser_state: parsed.loser_state,
        result_type: parsed.result_type,
        score: parsed.score,
        raw: { line },
      })
      continue
    }

    // Placement lines: "1. Name (NC)" or "Place 3 — Name"
    const placeMatch =
      line.match(/^(\d+)[.)]\s+(.+?)(?:\s*\(([A-Z]{2})\))?\s*$/i) ||
      line.match(/^place\s+(\d+)\s*[—:-]\s*(.+?)(?:\s*\(([A-Z]{2})\))?\s*$/i)
    if (placeMatch) {
      placers.push({
        athlete_name: canonicalizeWrestlerName(placeMatch[2]),
        weight_class: "",
        placement: parseInt(placeMatch[1], 10),
        state: placeMatch[3] ? placeMatch[3].toUpperCase() : null,
      })
    }
  }

  if (!matches.length && !placers.length) {
    warnings.push("Trackwrestling export produced 0 matches and 0 placers")
  }

  return {
    adapter: "trackwrestling",
    context: {
      ...context,
      source_adapter: "trackwrestling",
      source_label:
        context.source_label ||
        buildFargoDivisionLabel(context.age_division, context.gender, context.style),
    },
    matches,
    placers,
    warnings,
  }
}

/** Normalize method tokens appearing alone (used by tests / callers). */
export function trackResultType(raw: string) {
  return normalizeFargoResultType(raw)
}
