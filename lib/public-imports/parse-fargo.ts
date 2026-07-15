/**
 * Parse Fargo Nationals season rows (CSV seed / bracket export / JSON) into FargoProposed.
 * FloWrestling is never accepted as a canonical source here.
 */

import {
  buildFargoDivisionLabel,
  parseFargoAgeDivision,
  parseFargoDivisionString,
  parseFargoGender,
  parseFargoStyle,
  type FargoAgeDivision,
  type FargoGender,
  type FargoStyle,
} from "@/lib/fargo-division"
import { canonicalizeWrestlerName } from "./normalize"
import type { FargoProposed } from "./types"

const DEFAULT_EVENT = "US Marine Corps National Championships (Fargo)"

const DIVISION_FROM_FILENAME: Record<string, string> = {
  "16u": "16U Boys Freestyle",
  junior: "Junior Boys Freestyle",
}

export type FargoCsvMeta = {
  year?: number | null
  division?: string | null
  source_label?: string | null
  source_url?: string | null
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((v) => v.trim())
}

function parsePlacement(raw: unknown): number | null {
  if (raw == null || raw === "") return null
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.floor(raw)
  const m = String(raw).trim().match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

function isBracketExportHeader(header: string[]): boolean {
  return header.some(
    (h) =>
      h.includes("furthest_champ_round") ||
      h.includes("furthest champ round") ||
      h.includes("champ_round_wins") ||
      h.includes("champ round wins"),
  )
}

function isSummaryExportHeader(header: string[]): boolean {
  return header.some(
    (h) => h.includes("fargo_wins") || h.includes("fargo wins") || h.includes("hs_states"),
  )
}

function buildContextNotes(row: Record<string, string>): string[] {
  const parts: string[] = []
  if (row.class) parts.push(row.class)
  if (row.hs_states) parts.push(`NCHSAA: ${row.hs_states}`)
  if (row.ctt_bb) parts.push(`CTT BB: ${row.ctt_bb}`)
  return parts
}

function buildBracketNotes(row: Record<string, string>): string | null {
  const parts = buildContextNotes(row)
  if (row.champ_round_wins || row.furthest_champ_round) {
    parts.push(`Champ: ${row.champ_round_wins || 0}W to R${row.furthest_champ_round || "—"}`)
  }
  if (row.consi_wins || row.furthest_consi_round) {
    parts.push(`Consi: ${row.consi_wins || 0}W to ${row.furthest_consi_round || "—"}`)
  }
  if (row.wins_over_seeded || row.losses_to_seeded) {
    parts.push(`vs seeded ${row.wins_over_seeded || 0}-${row.losses_to_seeded || 0}`)
  }
  if (row.seeded_win_notes) parts.push(row.seeded_win_notes)
  if (row.seeded_loss_notes) parts.push(row.seeded_loss_notes)
  return parts.join(" · ") || null
}

function buildSummaryNotes(row: Record<string, string>): string | null {
  return buildContextNotes(row).join(" · ") || null
}

function isAllAmerican(raw: unknown, placement: number | null): boolean {
  if (String(raw ?? "").toLowerCase() === "true" || raw === true) return true
  return placement != null && placement >= 1 && placement <= 8
}

function toProposed(input: {
  year: number
  first: string
  last: string
  division: string
  style?: FargoStyle
  gender?: FargoGender
  age_division?: FargoAgeDivision | string
  weight_class: string
  wins: number
  losses: number
  placement: number | null
  is_all_american: boolean
  high_school?: string | null
  state?: string | null
  club?: string | null
  notes?: string | null
  event_name?: string | null
  source_url?: string | null
  source_label?: string | null
}): FargoProposed {
  const parsed = parseFargoDivisionString(input.division)
  const style = input.style ?? parsed.style
  const gender = input.gender ?? parsed.gender
  const age_division = (input.age_division as FargoAgeDivision) || parsed.age_division
  const division =
    input.division.trim() || buildFargoDivisionLabel(age_division, gender, style)
  const athlete_name = canonicalizeWrestlerName(`${input.first} ${input.last}`)
  return {
    year: input.year,
    athlete_name,
    first_name: input.first,
    last_name: input.last,
    division,
    style,
    gender,
    age_division,
    weight_class: String(input.weight_class).trim(),
    wins: input.wins,
    losses: input.losses,
    record: `${input.wins}-${input.losses}`,
    placement: input.placement,
    is_all_american: input.is_all_american,
    high_school: input.high_school ?? null,
    state: input.state ?? "NC",
    club: input.club ?? null,
    notes: input.notes ?? null,
    event_name: input.event_name || DEFAULT_EVENT,
    source_url: input.source_url ?? null,
    source_label: input.source_label ?? null,
  }
}

export function fargoMetaFromFilename(filePath: string): FargoCsvMeta {
  const base = filePath.split(/[/\\]/).pop()?.toLowerCase() ?? ""
  const m = base.match(/fargo_(\d{4})_(16u|junior)\.csv/)
  if (!m) return {}
  return {
    year: parseInt(m[1], 10),
    division: DIVISION_FROM_FILENAME[m[2]] ?? null,
  }
}

/** Deduplicate by natural season grain (style is independent). Last row wins. */
export function dedupeFargoProposed(rows: FargoProposed[]): FargoProposed[] {
  const map = new Map<string, FargoProposed>()
  for (const row of rows) {
    const key = [
      row.year,
      row.style,
      row.age_division,
      row.gender,
      row.weight_class,
      row.athlete_name.toLowerCase(),
    ].join("|")
    map.set(key, row)
  }
  return [...map.values()]
}

export function parseFargoCsv(raw: string, meta: FargoCsvMeta = {}): FargoProposed[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const bracketMode = isBracketExportHeader(header)
  const summaryMode = !bracketMode && isSummaryExportHeader(header)
  const rows: FargoProposed[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    header.forEach((h, j) => {
      row[h] = values[j] ?? ""
    })

    const first = (row.first_name ?? row.first ?? "").trim()
    const last = (row.last_name ?? row.last ?? "").trim()
    if (!first || !last) continue

    const year = parseInt(String(row.event_year ?? row.year ?? meta.year ?? ""), 10)
    if (!Number.isFinite(year)) continue

    const wins = parseInt(row.fargo_wins ?? row.wins ?? "0", 10)
    const losses = parseInt(row.fargo_losses ?? row.losses ?? "0", 10)
    const division = (row.division ?? meta.division ?? "").trim()
    if (!division) continue

    let notes = (row.notes ?? "").trim() || null
    if (bracketMode) notes = buildBracketNotes(row)
    else if (summaryMode) notes = buildSummaryNotes(row)

    const placement = parsePlacement(row.placement)
    const high_school = (row.high_school ?? row.school ?? "").trim() || null

    rows.push(
      toProposed({
        year,
        first,
        last,
        division,
        weight_class: String(row.weight ?? row.weight_class ?? "").trim(),
        wins: Number.isFinite(wins) ? wins : 0,
        losses: Number.isFinite(losses) ? losses : 0,
        placement,
        is_all_american: isAllAmerican(row.is_all_american, placement),
        high_school,
        state: (row.state ?? "").trim() || "NC",
        club: (row.club ?? "").trim() || null,
        notes,
        event_name: (row.event_name ?? DEFAULT_EVENT).trim(),
        source_url: meta.source_url ?? null,
        source_label: meta.source_label ?? null,
      }),
    )
  }

  return dedupeFargoProposed(rows)
}

function coerceRecord(raw: Record<string, unknown>): FargoProposed | null {
  const first =
    String(raw.first_name ?? raw.first ?? "").trim() ||
    (() => {
      const full = canonicalizeWrestlerName(raw.athlete_name ?? raw.name ?? "")
      const parts = full.split(/\s+/)
      return parts.length >= 2 ? parts.slice(0, -1).join(" ") : ""
    })()
  const last =
    String(raw.last_name ?? raw.last ?? "").trim() ||
    (() => {
      const full = canonicalizeWrestlerName(raw.athlete_name ?? raw.name ?? "")
      const parts = full.split(/\s+/)
      return parts.length >= 2 ? parts[parts.length - 1] : full
    })()
  if (!first && !last) return null

  const year = Number(raw.year ?? raw.event_year)
  if (!Number.isFinite(year)) return null

  let division = String(raw.division ?? "").trim()
  const style = raw.style != null ? parseFargoStyle(raw.style) : undefined
  const gender = raw.gender != null ? parseFargoGender(raw.gender) : undefined
  const age_division =
    raw.age_division != null ? parseFargoAgeDivision(raw.age_division) : undefined

  if (!division && (style || gender || age_division)) {
    division = buildFargoDivisionLabel(
      age_division ?? "Unknown",
      gender ?? "M",
      style ?? "FS",
    )
  }
  if (!division) return null

  const wins = Number(raw.wins ?? raw.fargo_wins ?? 0)
  const losses = Number(raw.losses ?? raw.fargo_losses ?? 0)
  const placement = parsePlacement(raw.placement)

  return toProposed({
    year,
    first: first || last,
    last: last || first,
    division,
    style,
    gender,
    age_division,
    weight_class: String(raw.weight_class ?? raw.weight ?? "").trim(),
    wins: Number.isFinite(wins) ? wins : 0,
    losses: Number.isFinite(losses) ? losses : 0,
    placement,
    is_all_american: isAllAmerican(raw.is_all_american, placement),
    high_school: raw.high_school != null ? String(raw.high_school) : null,
    state: raw.state != null ? String(raw.state) : "NC",
    club: raw.club != null ? String(raw.club) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    event_name: raw.event_name != null ? String(raw.event_name) : DEFAULT_EVENT,
    source_url: raw.source_url != null ? String(raw.source_url) : null,
    source_label: raw.source_label != null ? String(raw.source_label) : null,
  })
}

/** JSON: `{ records: [...] }` or bare array of season rows. */
export function parseFargoPayload(json: unknown): FargoProposed[] {
  const root = json as { records?: unknown[]; rows?: unknown[] } | unknown[]
  const list = Array.isArray(root)
    ? root
    : Array.isArray(root?.records)
      ? root.records
      : Array.isArray(root?.rows)
        ? root.rows
        : null
  if (!list) throw new Error("Fargo JSON must be an array or { records: [...] }")

  const out: FargoProposed[] = []
  for (const item of list) {
    if (!item || typeof item !== "object") continue
    const row = coerceRecord(item as Record<string, unknown>)
    if (row) out.push(row)
  }
  return dedupeFargoProposed(out)
}
