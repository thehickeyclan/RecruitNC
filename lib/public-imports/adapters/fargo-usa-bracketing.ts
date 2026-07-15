/**
 * USA Bracketing adapter — current/future Fargo official SoR.
 * Parses RecruitNC-normalized USA Bracketing exports (JSON).
 * FloWrestling payloads are rejected.
 */

import {
  buildFargoDivisionLabel,
  parseFargoAgeDivision,
  parseFargoGender,
  parseFargoStyle,
  type FargoGender,
  type FargoStyle,
} from "@/lib/fargo-division"
import { normalizeFargoResultType, parseOverSummary } from "@/lib/fargo-result-types"
import { canonicalizeWrestlerName } from "../normalize"
import type {
  FargoAdapterParseResult,
  FargoBracketContext,
  FargoParsedMatch,
  FargoParsedPlacer,
} from "./fargo-adapter-types"

function assertNotFlo(raw: unknown, textHint?: string): void {
  const blob = `${JSON.stringify(raw ?? "").slice(0, 2000)} ${textHint ?? ""}`.toLowerCase()
  if (blob.includes("flowrestling.org") || blob.includes('"floarena"') || /\bflo\b.*source/.test(blob)) {
    throw new Error(
      "FloWrestling payloads are never accepted as Fargo SoR. Export from USA Bracketing.",
    )
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function pickName(row: Record<string, unknown>): string {
  return canonicalizeWrestlerName(
    row.athlete_name ?? row.name ?? row.wrestler_name ?? `${row.first_name ?? ""} ${row.last_name ?? ""}`,
  )
}

function parseMatchRow(
  m: Record<string, unknown>,
  fallbackWeight: string,
  bracketId: string | null,
): FargoParsedMatch | null {
  // Summary form
  const summary = String(m.summary ?? m.result_text ?? m.display ?? "").trim()
  if (summary.includes(" over ")) {
    const parsed = parseOverSummary(summary)
    if (!parsed) return null
    return {
      source_match_id: m.source_match_id != null ? String(m.source_match_id) : m.id != null ? String(m.id) : null,
      source_bracket_id: bracketId,
      weight_class: String(m.weight_class ?? m.weight ?? fallbackWeight).trim(),
      round: m.round != null ? String(m.round) : null,
      match_order: m.match_order != null ? Number(m.match_order) : null,
      winner_name: parsed.winner_name,
      winner_state: parsed.winner_state,
      loser_name: parsed.loser_name,
      loser_state: parsed.loser_state,
      result_type: parsed.result_type,
      score: parsed.score,
      raw: m,
    }
  }

  const winner = pickName({
    athlete_name: m.winner_name ?? m.winner,
    first_name: m.winner_first,
    last_name: m.winner_last,
  })
  const loser = pickName({
    athlete_name: m.loser_name ?? m.loser,
    first_name: m.loser_first,
    last_name: m.loser_last,
  })
  if (!winner || !loser) return null

  return {
    source_match_id: m.source_match_id != null ? String(m.source_match_id) : m.id != null ? String(m.id) : null,
    source_bracket_id: bracketId,
    weight_class: String(m.weight_class ?? m.weight ?? fallbackWeight).trim(),
    round: m.round != null ? String(m.round) : null,
    match_order: m.match_order != null ? Number(m.match_order) : null,
    winner_name: winner,
    winner_state: m.winner_state != null ? String(m.winner_state).toUpperCase() : null,
    winner_club: m.winner_club != null ? String(m.winner_club) : null,
    loser_name: loser,
    loser_state: m.loser_state != null ? String(m.loser_state).toUpperCase() : null,
    loser_club: m.loser_club != null ? String(m.loser_club) : null,
    result_type: normalizeFargoResultType(m.result_type ?? m.method ?? m.result),
    score: m.score != null ? String(m.score) : null,
    raw: m,
  }
}

function parsePlacerRow(p: Record<string, unknown>, fallbackWeight: string): FargoParsedPlacer | null {
  const athlete_name = pickName(p)
  if (!athlete_name) return null
  const placement = Number(p.placement ?? p.place)
  if (!Number.isFinite(placement) || placement < 1) return null
  return {
    athlete_name,
    weight_class: String(p.weight_class ?? p.weight ?? fallbackWeight).trim(),
    placement: Math.floor(placement),
    state: p.state != null ? String(p.state).toUpperCase() : null,
    club: p.club != null ? String(p.club) : null,
    seed: p.seed != null ? Number(p.seed) : null,
  }
}

function resolveContext(
  root: Record<string, unknown>,
  fallback?: Partial<FargoBracketContext>,
): FargoBracketContext {
  const year = Number(root.year ?? root.event_year ?? fallback?.year)
  if (!Number.isFinite(year)) {
    throw new Error("USA Bracketing export requires year")
  }
  const style = parseFargoStyle(root.style ?? fallback?.style ?? "FS") as FargoStyle
  const gender = parseFargoGender(root.gender ?? fallback?.gender ?? "M") as FargoGender
  const age_division =
    root.age_division != null
      ? parseFargoAgeDivision(root.age_division)
      : fallback?.age_division
        ? parseFargoAgeDivision(fallback.age_division)
        : "Junior"
  return {
    year,
    style,
    gender,
    age_division,
    source_event_id:
      root.source_event_id != null
        ? String(root.source_event_id)
        : fallback?.source_event_id ?? null,
    source_url: root.source_url != null ? String(root.source_url) : fallback?.source_url ?? null,
    source_label:
      root.source_label != null
        ? String(root.source_label)
        : fallback?.source_label ??
          buildFargoDivisionLabel(age_division, gender, style),
    source_adapter: "usa_bracketing",
  }
}

/**
 * Parse USA Bracketing JSON export.
 * Supported shapes:
 * - { year, style, gender, age_division, brackets: [{ weight_class, athletes, matches }] }
 * - { matches: [...], placers: [...] } with context fields on root
 * - Array of matches (context must be supplied via fallback)
 */
export function parseUsaBracketingExport(
  input: unknown,
  fallback?: Partial<FargoBracketContext>,
): FargoAdapterParseResult {
  assertNotFlo(input)
  const warnings: string[] = []
  let root: Record<string, unknown>

  if (Array.isArray(input)) {
    root = { matches: input, ...(fallback ?? {}) }
  } else {
    const rec = asRecord(input)
    if (!rec) throw new Error("USA Bracketing export must be a JSON object or match array")
    root = rec
  }

  if (String(root.source ?? "").toLowerCase().includes("flo")) {
    throw new Error("FloWrestling is never accepted as Fargo SoR")
  }

  const context = resolveContext(root, fallback)
  const matches: FargoParsedMatch[] = []
  const placers: FargoParsedPlacer[] = []

  const brackets = Array.isArray(root.brackets) ? root.brackets : null
  if (brackets) {
    for (const b of brackets) {
      const br = asRecord(b)
      if (!br) continue
      const weight = String(br.weight_class ?? br.weight ?? "").trim()
      const bracketId =
        br.source_bracket_id != null
          ? String(br.source_bracket_id)
          : br.id != null
            ? String(br.id)
            : weight
              ? `${context.year}-${context.style}-${context.age_division}-${weight}`
              : null
      const athletes = Array.isArray(br.athletes) ? br.athletes : Array.isArray(br.placers) ? br.placers : []
      for (const a of athletes) {
        const ar = asRecord(a)
        if (!ar) continue
        const pl = parsePlacerRow(ar, weight)
        if (pl) placers.push(pl)
      }
      const ms = Array.isArray(br.matches) ? br.matches : []
      for (const m of ms) {
        const mr = asRecord(m)
        if (!mr) continue
        const parsed = parseMatchRow(mr, weight, bracketId)
        if (parsed) matches.push(parsed)
      }
    }
  }

  if (Array.isArray(root.matches)) {
    for (const m of root.matches) {
      const mr = asRecord(m)
      if (!mr) continue
      const parsed = parseMatchRow(mr, String(mr.weight_class ?? mr.weight ?? ""), null)
      if (parsed) matches.push(parsed)
    }
  }

  if (Array.isArray(root.placers) || Array.isArray(root.athletes)) {
    for (const a of (root.placers ?? root.athletes) as unknown[]) {
      const ar = asRecord(a)
      if (!ar) continue
      const pl = parsePlacerRow(ar, String(ar.weight_class ?? ar.weight ?? ""))
      if (pl) placers.push(pl)
    }
  }

  if (!matches.length && !placers.length) {
    warnings.push("USA Bracketing export produced 0 matches and 0 placers")
  }

  return { adapter: "usa_bracketing", context, matches, placers, warnings }
}

/** Parse JSON text; rejects Flo. */
export function parseUsaBracketingText(
  text: string,
  fallback?: Partial<FargoBracketContext>,
): FargoAdapterParseResult {
  assertNotFlo(null, text)
  const trimmed = text.trim()
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    throw new Error("USA Bracketing adapter expects JSON export text")
  }
  let json: unknown
  try {
    json = JSON.parse(trimmed)
  } catch {
    throw new Error("Invalid JSON for USA Bracketing export")
  }
  return parseUsaBracketingExport(json, fallback)
}
