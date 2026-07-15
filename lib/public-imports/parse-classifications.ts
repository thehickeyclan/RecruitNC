/**
 * Parse NCHSAA school classification / membership directories.
 */

import type { ClassificationProposed } from "./types"
import { VALID_CLASSIFICATIONS } from "@/lib/classification-data"

const CLASS_SET = new Set(VALID_CLASSIFICATIONS.map((c) => c.toUpperCase()))

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v)
  return null
}

function asStr(v: unknown): string {
  return String(v ?? "").trim()
}

function normalizeClass(raw: string): string | null {
  const c = raw.replace(/\s+/g, "").toUpperCase()
  if (CLASS_SET.has(c as (typeof VALID_CLASSIFICATIONS)[number])) return c
  // Accept pure 1A–8A even if VALID includes extras
  if (/^[1-8]A$/.test(c)) return c
  if (/^[1-8]A\/[1-8]A$/.test(c)) return c
  return null
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8217;/g, "'")
    .replace(/&[#\w]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** JSON `{ records: [...] }` or bare array. */
export function parseClassificationPayload(input: unknown): ClassificationProposed[] {
  let rows: unknown[] = []
  if (Array.isArray(input)) rows = input
  else if (input && typeof input === "object") {
    const o = input as Record<string, unknown>
    if (Array.isArray(o.records)) rows = o.records
    else if (Array.isArray(o.schools)) rows = o.schools
  }

  const out: ClassificationProposed[] = []
  for (const r of rows) {
    if (!r || typeof r !== "object") continue
    const row = r as Record<string, unknown>
    const effective_year =
      asNum(row.effective_year) ?? asNum(row.year) ?? asNum(row.season_year)
    const school_name = asStr(row.school_name ?? row.school ?? row.name)
    const classification = normalizeClass(asStr(row.classification ?? row.class ?? row.division))
    if (effective_year == null || !school_name || !classification) continue
    out.push({
      effective_year,
      school_name,
      classification,
      region: row.region != null ? asStr(row.region) : null,
      conference: row.conference != null ? asStr(row.conference) : null,
      enrollment: asNum(row.enrollment),
      cycle_label: row.cycle_label != null ? asStr(row.cycle_label) : null,
    })
  }
  return dedupeClassifications(out)
}

/**
 * Parse NCHSAA /schools/ HTML DataTable (`Name | Region | Classification | Conference`).
 */
export function parseNchsaaSchoolsClassificationHtml(
  html: string,
  opts: { effective_year: number; cycle_label?: string | null },
): ClassificationProposed[] {
  const tableMatch =
    html.match(/<table[^>]*id=["']table_\d+["'][\s\S]*?<\/table>/i) ||
    html.match(/<table[^>]*id=["']table_1["'][\s\S]*?<\/table>/i)
  const block = tableMatch?.[0] ?? html
  const rowHtml = [...block.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1])
  const out: ClassificationProposed[] = []

  for (const row of rowHtml) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      stripTags(m[1]),
    )
    if (cells.length < 3) continue
    // Skip header
    if (/^name$/i.test(cells[0]) || /classification/i.test(cells[0])) continue

    // Prefer: Name, Region, Classification, Conference
    let school = cells[0]
    let region: string | null = null
    let classification: string | null = null
    let conference: string | null = null

    if (normalizeClass(cells[2])) {
      region = cells[1] || null
      classification = normalizeClass(cells[2])
      conference = cells[3] || null
    } else if (normalizeClass(cells[1])) {
      classification = normalizeClass(cells[1])
      region = null
      conference = cells[2] || null
    } else {
      // "School - 7A" style in first column + class later
      const fromName = school.match(/^(.+?)\s*[-–—]\s*([1-8]A(?:\/[1-8]A)?)\s*$/i)
      if (fromName) {
        school = fromName[1].trim()
        classification = normalizeClass(fromName[2])
      }
      for (const c of cells.slice(1)) {
        const nc = normalizeClass(c)
        if (nc) {
          classification = nc
          break
        }
      }
    }

    if (!school || !classification) continue
    if (/^(conference|administrator|email)$/i.test(school)) continue

    out.push({
      effective_year: opts.effective_year,
      school_name: school,
      classification,
      region,
      conference,
      enrollment: null,
      cycle_label: opts.cycle_label ?? null,
    })
  }

  return dedupeClassifications(out)
}

/**
 * Markdown pipe table or rough text with "School - 7A" lines.
 */
export function parseNchsaaSchoolsClassificationText(
  text: string,
  opts: { effective_year: number; cycle_label?: string | null },
): ClassificationProposed[] {
  // Prefer HTML if pasted accidentally
  if (/<table[\s\S]*classification/i.test(text) || /id=["']table_\d+/i.test(text)) {
    return parseNchsaaSchoolsClassificationHtml(text, opts)
  }

  const out: ClassificationProposed[] = []
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    if (!line.includes("|")) {
      const m = line.match(/^(.+?)\s*[-–—]\s*([1-8]A(?:\s*\/\s*[1-8]A)?)\s*$/i)
      if (!m) continue
      const classification = normalizeClass(m[2])
      if (!classification) continue
      out.push({
        effective_year: opts.effective_year,
        school_name: m[1].trim(),
        classification,
        cycle_label: opts.cycle_label ?? null,
      })
      continue
    }

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c, i, arr) => !(i === 0 && c === "") && !(i === arr.length - 1 && c === ""))
    if (cells.length < 2) continue
    if (/^-{2,}/.test(cells[0]) || /^school name$/i.test(cells[0]) || /^name$/i.test(cells[0])) {
      continue
    }

    let school = cells[0]
    let classification: string | null = null
    let region: string | null = null
    let conference: string | null = null

    for (let i = 1; i < cells.length; i++) {
      const nc = normalizeClass(cells[i])
      if (nc) {
        classification = nc
        // Heuristic: cell before class often region number; after often conference
        if (i > 1 && /^\d+$/.test(cells[i - 1])) region = cells[i - 1]
        if (i + 1 < cells.length && !normalizeClass(cells[i + 1])) conference = cells[i + 1]
        break
      }
    }

    if (!classification) {
      const fromName = school.match(/^(.+?)\s*[-–—]\s*([1-8]A(?:\/[1-8]A)?)\s*$/i)
      if (fromName) {
        school = fromName[1].trim()
        classification = normalizeClass(fromName[2])
      }
    }

    if (!school || !classification) continue
    out.push({
      effective_year: opts.effective_year,
      school_name: school,
      classification,
      region,
      conference,
      cycle_label: opts.cycle_label ?? null,
    })
  }

  return dedupeClassifications(out)
}

function dedupeClassifications(rows: ClassificationProposed[]): ClassificationProposed[] {
  const map = new Map<string, ClassificationProposed>()
  for (const r of rows) {
    const key = `${r.effective_year}|${r.school_name.toLowerCase()}`
    map.set(key, r)
  }
  return [...map.values()].sort((a, b) =>
    a.school_name.localeCompare(b.school_name, undefined, { sensitivity: "base" }),
  )
}
