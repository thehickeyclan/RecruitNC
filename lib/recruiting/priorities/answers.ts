/**
 * Cleaning and prefilling priorities answers. Pure: no database here.
 *
 * Never ask what we already know (survey v3 standing rule): the family's Compare goals
 * (family_fit), the weight last competed and the class are offered back as "We have …, correct
 * anything that's changed". A prefill is a suggestion shown on the screen; it is stored only when
 * the respondent confirms it.
 */
import type { FamilyFitProfile } from "@/lib/recruiting/family-fit"
import { HOME_ZIP_KEY, MAJOR_OPTIONS, PATHWAYS, PATHWAY_STATES, TOP3_FACTORS, questionByKey, storableKeys, type Marker, type Respondent } from "@/lib/recruiting/priorities/questions"

const MARKERS: Marker[] = ["must", "strong", "flexible"]
const TEXT_MAX = 500
const MAJOR_CODES = new Set(MAJOR_OPTIONS.map((m) => m.key))

export type CleanAnswer = { key: string; value: unknown; marker: Marker | null; notSure: boolean }

/** What the browser sent, cleaned; null when it is not an answer to this respondent's question. */
export function cleanAnswer(respondent: Respondent, raw: { key?: unknown; value?: unknown; marker?: unknown; notSure?: unknown }): CleanAnswer | null {
  const key = String(raw.key ?? "")
  if (!storableKeys(respondent).includes(key)) return null
  const notSure = raw.notSure === true
  const q = questionByKey(respondent, key)
  const marker = q?.marker && MARKERS.includes(raw.marker as Marker) ? (raw.marker as Marker) : null
  if (notSure) return { key, value: null, marker: null, notSure: true }
  const value = cleanValue(respondent, key, raw.value)
  return value === undefined ? null : { key, value, marker, notSure: false }
}

function cleanValue(respondent: Respondent, key: string, v: unknown): unknown {
  if (key === HOME_ZIP_KEY) return typeof v === "string" && /^\d{5}$/.test(v.trim()) ? v.trim() : undefined
  if (key === "budget_kind") return v === "target" || v === "limit" ? v : undefined
  if (key === "bsn") return v === "direct_entry" || v === "pre_ok" ? v : undefined
  const q = questionByKey(respondent, key)
  if (!q) return undefined
  const k = q.kind
  switch (k.type) {
    case "single":
      return k.options.some((o) => o.key === v) ? v : undefined
    case "multi": {
      if (!Array.isArray(v)) return undefined
      let picks = [...new Set(v.map(String))].filter((x) => k.options.some((o) => o.key === x))
      if (k.exclusive && picks.some((p) => k.exclusive!.includes(p))) picks = picks.filter((p) => k.exclusive!.includes(p)).slice(0, 1)
      return k.max ? picks.slice(0, k.max) : picks
    }
    case "grid": {
      if (!v || typeof v !== "object") return undefined
      const out: Record<string, string> = {}
      for (const row of PATHWAYS) {
        const s = (v as Record<string, unknown>)[row.key]
        if (PATHWAY_STATES.some((o) => o.key === s)) out[row.key] = String(s)
      }
      return out
    }
    case "top3": {
      if (!Array.isArray(v)) return undefined
      return [...new Set(v.map(String))].filter((x) => TOP3_FACTORS.some((f) => f.key === x)).slice(0, 3)
    }
    case "majors": {
      const r = (v ?? {}) as { majors?: unknown; text?: unknown; undecided?: unknown }
      const majors = (Array.isArray(r.majors) ? r.majors : []).map(String).filter((c) => MAJOR_CODES.has(c)).slice(0, 3)
      const text = typeof r.text === "string" ? r.text.trim().slice(0, TEXT_MAX) : ""
      return { majors, text: text || null, undecided: r.undecided === true }
    }
    case "text":
      return typeof v === "string" ? v.trim().slice(0, TEXT_MAX) : undefined
  }
}

// ---- prefill

/** Driving time from the straight-line miles Compare stored (about 60 mph, with roads ~1.2x the crow). */
export function distanceFromMiles(miles: number | null): string | null {
  if (!miles) return null
  if (miles <= 110) return "2h"
  if (miles <= 260) return "5h"
  if (miles <= 500) return "day"
  return "anywhere"
}

export function budgetBand(budget: number | null): string | null {
  if (!budget) return null
  if (budget < 10_000) return "lt10"
  if (budget <= 20_000) return "10_20"
  if (budget <= 35_000) return "20_35"
  if (budget <= 50_000) return "35_50"
  return "50plus"
}

export type Prefill = Record<string, { value: unknown; from: string }>

/**
 * What we already hold, as suggested answers for this respondent. family_fit belongs to the login
 * that saved it, so it only prefills that login's own set.
 */
export function prefillFor(respondent: Respondent, fit: FamilyFitProfile | null, wrestler: { academicInterest: string | null }): Prefill {
  const out: Prefill = {}
  if (fit) {
    if (respondent === "parent") {
      const d = distanceFromMiles(fit.maxMiles)
      if (d) out.distance = { value: d, from: "your Compare goals" }
      if (fit.homeZip) out[HOME_ZIP_KEY] = { value: fit.homeZip, from: "your Compare goals" }
      const b = budgetBand(fit.budget)
      if (b) out.budget = { value: b, from: "your Compare goals" }
      const feel = [...(fit.size ? [fit.size] : []), ...fit.settings]
      if (feel.length) out.school_feel = { value: feel, from: "your Compare goals" }
    }
    if (fit.majors.length) out.academics = { value: { majors: fit.majors, text: null, undecided: false }, from: "your Compare goals" }
  }
  if (respondent === "athlete" && !out.academics && wrestler.academicInterest?.trim()) {
    out.academics = { value: { majors: [], text: wrestler.academicInterest.trim().slice(0, TEXT_MAX), undecided: false }, from: "the profile" }
  }
  return out
}

/** Family-wide parent answers: the same for every child, so a second child's set starts from the first's. */
export const FAMILY_WIDE_KEYS = ["budget", "budget_kind", "home_zip", "benefits"] as const

/** Adds a sibling's family-wide answers to the prefill, where the profile held nothing better. */
export function withSiblingPrefill(prefill: Prefill, sibling: { firstName: string; answers: Array<{ key: string; value: unknown; notSure?: boolean }> } | null): Prefill {
  if (!sibling) return prefill
  const out = { ...prefill }
  for (const a of sibling.answers) {
    if (!(FAMILY_WIDE_KEYS as readonly string[]).includes(a.key) || a.notSure || a.value == null) continue
    out[a.key] = { value: a.value, from: `your answers for ${sibling.firstName}` }
  }
  return out
}
