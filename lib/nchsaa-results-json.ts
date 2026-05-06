/**
 * Pure JSON parsing for `athletes.nchsaa_results` — safe to import from client components.
 * Server-only Supabase logic stays in `lib/nchsaa-results.ts`.
 */

export type NchsaaRowForProfile = {
  year: number
  classification: string
  weight_class: string
  place: number | null
  school: string
  wrestler_name: string
}

/**
 * Map `athletes.nchsaa_results` JSON/JSONB (array of state rows) into the same shape as table rows.
 */
export function nchsaaJsonToProfileRows(raw: unknown, fallbackWrestlerName: string): NchsaaRowForProfile[] {
  if (raw == null) return []
  let arr: unknown[] = []
  if (Array.isArray(raw)) {
    arr = raw
  } else if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw)
      arr = Array.isArray(p) ? p : []
    } catch {
      return []
    }
  } else {
    return []
  }

  const name = (fallbackWrestlerName ?? "").trim() || "Unknown"
  const out: NchsaaRowForProfile[] = []
  for (const item of arr) {
    if (!item || typeof item !== "object") continue
    const o = item as Record<string, unknown>
    const year = Number(o.year)
    if (!year || Number.isNaN(year)) continue
    const placeRaw = o.place
    const place = placeRaw == null || placeRaw === "" ? null : Number(placeRaw)
    out.push({
      year,
      classification: String(o.classification ?? (o as { class?: string }).class ?? ""),
      weight_class: String(o.weight_class ?? (o as { weightClass?: string }).weightClass ?? ""),
      place: place != null && !Number.isNaN(place) ? place : null,
      school: String(o.school ?? ""),
      wrestler_name: String(o.wrestler_name ?? (o as { wrestlerName?: string }).wrestlerName ?? name),
    })
  }
  return out.sort((a, b) => b.year - a.year)
}
