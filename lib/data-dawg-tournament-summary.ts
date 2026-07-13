import type { AthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import type { TournamentResultForDisplay } from "@/lib/public-profile-data"

/** Prefer tournament record over generic "Participated" when there is no real placement. */
export function formatNhscaLabelForDataDawg(r: TournamentResultForDisplay): string {
  const rec = r.record?.trim()
  let label = (r.placement ?? "").trim()
  if (!label || /^participated$/i.test(label)) {
    return rec ? `${rec} record` : "Participated"
  }
  if (rec && !label.toLowerCase().includes(rec)) {
    return `${label} (${rec})`
  }
  return label
}

export function formatSuper32LabelForDataDawg(r: TournamentResultForDisplay): string {
  const rec = r.record?.trim()
  let label = (r.placement ?? "").trim()
  if (!label && rec) return `${rec} record`
  if (rec && label && !label.toLowerCase().includes(rec)) return `${label} (${rec})`
  return label || rec || "—"
}

export function formatNhscaLineForDataDawg(r: TournamentResultForDisplay): string {
  const label = formatNhscaLabelForDataDawg(r)
  const div = (r.division ?? "").trim()
  const w = (r.weight ?? "").toString().replace(/lbs?$/i, "").trim()
  const divW = [div && `${div}`, w ? `${w} lbs` : ""].filter(Boolean).join(", ")
  return `- ${r.year}: ${label}${divW ? ` (${divW})` : ""}`
}

export function formatSuper32LineForDataDawg(r: TournamentResultForDisplay): string {
  const label = formatSuper32LabelForDataDawg(r)
  const w = (r.weight ?? "").toString().replace(/lbs?$/i, "").trim()
  return `- ${r.year}: ${label}${w ? ` (${w} lbs)` : ""}`
}

export function formatFargoLabelForDataDawg(r: TournamentResultForDisplay): string {
  const rec = r.record?.trim()
  let label = (r.placement ?? "").trim()
  if (!label && rec) return `${rec} record`
  if (rec && label && !label.toLowerCase().includes(rec)) return `${label} (${rec})`
  return label || rec || "—"
}

export function formatFargoLineForDataDawg(r: TournamentResultForDisplay): string {
  const label = formatFargoLabelForDataDawg(r)
  const div = (r.division ?? "").trim()
  const w = (r.weight ?? "").toString().replace(/lbs?$/i, "").trim()
  const divW = [div && `${div}`, w ? `${w} lbs` : ""].filter(Boolean).join(", ")
  return `- ${r.year}: ${label}${divW ? ` (${divW})` : ""}`
}

/** Compact NHSCA + Super32 + Fargo block for search_athletes / tool JSON. */
export function buildDataDawgTournamentSummary(bundle: AthleteTournamentBundle): {
  nhsca: string[]
  super32: string[]
  fargo: string[]
  note: string
} {
  const nhsca = [...bundle.nhsca]
    .sort((a, b) => b.year - a.year)
    .map(formatNhscaLineForDataDawg)
  const super32 = [...bundle.super32]
    .sort((a, b) => b.year - a.year)
    .map(formatSuper32LineForDataDawg)
  const fargo = [...bundle.fargo]
    .sort((a, b) => b.year - a.year)
    .map(formatFargoLineForDataDawg)
  return {
    nhsca,
    super32,
    fargo,
    note:
      "Merged from nhsca_placements + wrestling_nhsca_results + super32_results + fargo_results tables and profile JSON. Prefer this over nhsca_results / super32_results JSON columns alone (those may say Participated while tables have full records).",
  }
}
