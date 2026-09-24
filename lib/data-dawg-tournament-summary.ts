import type { AthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import type { TournamentResultForDisplay } from "@/lib/public-profile-data"
import type { OtherTournamentResult } from "@/lib/other-tournaments"

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

export function formatOtherTournamentLineForDataDawg(r: OtherTournamentResult): string {
  const details = [r.record ? `${r.record} record` : null, r.placement ? `placed ${r.placement}` : null]
    .filter(Boolean)
    .join(", ")
  const weight = r.weight ? `, ${String(r.weight).replace(/lbs?$/i, "").trim()} lbs` : ""
  return `- ${r.year} ${r.eventShortName}: ${details || "Competed"}${weight}`
}

/** Compact NHSCA + Super32 + Fargo block for search_athletes / tool JSON. */
export function buildDataDawgTournamentSummary(bundle: AthleteTournamentBundle): {
  nhsca: string[]
  super32: string[]
  fargo: string[]
  other: string[]
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
  const other = [...bundle.other]
    .sort((a, b) => String(b.eventDate ?? b.year).localeCompare(String(a.eventDate ?? a.year)))
    .map(formatOtherTournamentLineForDataDawg)
  return {
    nhsca,
    super32,
    fargo,
    other,
    note:
      "Merged from verified NHSCA, Super32, Fargo, and other tournament result stores plus profile JSON. `other` includes linked or verified results such as NHSCA National Duals; review-only rows are excluded. Prefer this summary over profile JSON columns alone.",
  }
}
