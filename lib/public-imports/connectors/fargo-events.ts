/**
 * Fargo Nationals official event registry (year × style × age × gender).
 * USA Bracketing for current/future; Trackwrestling for historical.
 * FloWrestling is never registered as SoR.
 */

import type { FargoAdapterId } from "../adapters/fargo-adapter-types"
import type { FargoGender, FargoStyle } from "@/lib/fargo-division"

export type FargoEventSlot = {
  year: number
  style: FargoStyle
  gender: FargoGender
  age_division: "16U" | "Junior"
  /** Display label */
  label: string
  adapter: FargoAdapterId
  /** USA Wrestling / USAB / Track event id when known */
  source_event_id?: string | null
  /**
   * Live JSON export URL when publicly reachable (must return JSON, not an HTML hub page).
   * Do not point this at usawrestlingevents.com event marketing pages.
   */
  fetch_url?: string | null
  /** Marketing / registration hub (documentation only — not fetched as export) */
  hub_url?: string | null
  /** Local official export under repo + bundled fixture key */
  local_path?: string | null
  notes?: string | null
}

function slot(
  partial: Omit<FargoEventSlot, "label"> & { label?: string },
): FargoEventSlot {
  const styleLabel = partial.style === "GR" ? "Greco-Roman" : "Freestyle"
  const genderLabel = partial.gender === "F" ? "Girls" : "Boys"
  return {
    ...partial,
    label:
      partial.label ||
      `${partial.year} ${partial.age_division} ${genderLabel} ${styleLabel}`,
  }
}

/**
 * Registry of Fargo brackets.
 * Fill `source_event_id` / `fetch_url` / `local_path` as exports are captured each July.
 * 2026 USA Wrestling events hub: https://usawrestlingevents.com/event/2600005902
 */
export const FARGO_EVENT_REGISTRY: FargoEventSlot[] = [
  // —— 2026 USA Bracketing (live scaffolding; local_path filled as exports land) ——
  slot({
    year: 2026,
    style: "FS",
    gender: "M",
    age_division: "Junior",
    adapter: "usa_bracketing",
    source_event_id: "2600005902",
    hub_url: "https://usawrestlingevents.com/event/2600005902",
    local_path: "scripts/data/fargo/exports/2026-junior-boys-fs.json",
  }),
  slot({
    year: 2026,
    style: "FS",
    gender: "M",
    age_division: "16U",
    adapter: "usa_bracketing",
    source_event_id: "2600005902",
    hub_url: "https://usawrestlingevents.com/event/2600005902",
    local_path: "scripts/data/fargo/exports/2026-16u-boys-fs.json",
    notes: "Add USA Bracketing JSON export when available (bundled fixture not yet shipped).",
  }),
  slot({
    year: 2026,
    style: "GR",
    gender: "M",
    age_division: "Junior",
    adapter: "usa_bracketing",
    source_event_id: "2600005902",
    hub_url: "https://usawrestlingevents.com/event/2600005902",
    local_path: "scripts/data/fargo/exports/2026-junior-boys-gr.json",
  }),
  slot({
    year: 2026,
    style: "GR",
    gender: "M",
    age_division: "16U",
    adapter: "usa_bracketing",
    source_event_id: "2600005902",
    hub_url: "https://usawrestlingevents.com/event/2600005902",
    local_path: "scripts/data/fargo/exports/2026-16u-boys-gr.json",
    notes: "Add USA Bracketing JSON export when available (bundled fixture not yet shipped).",
  }),
  slot({
    year: 2026,
    style: "FS",
    gender: "F",
    age_division: "Junior",
    adapter: "usa_bracketing",
    source_event_id: "2600005902",
    hub_url: "https://usawrestlingevents.com/event/2600005902",
    local_path: "scripts/data/fargo/exports/2026-junior-girls-fs.json",
    notes: "Add USA Bracketing JSON export when available (bundled fixture not yet shipped).",
  }),
  slot({
    year: 2026,
    style: "FS",
    gender: "F",
    age_division: "16U",
    adapter: "usa_bracketing",
    source_event_id: "2600005902",
    hub_url: "https://usawrestlingevents.com/event/2600005902",
    local_path: "scripts/data/fargo/exports/2026-16u-girls-fs.json",
    notes: "Add USA Bracketing JSON export when available (bundled fixture not yet shipped).",
  }),

  // —— 2025 USA Bracketing ——
  slot({
    year: 2025,
    style: "FS",
    gender: "M",
    age_division: "Junior",
    adapter: "usa_bracketing",
    local_path: "scripts/data/fargo/exports/2025-junior-boys-fs.json",
  }),
  slot({
    year: 2025,
    style: "FS",
    gender: "M",
    age_division: "16U",
    adapter: "usa_bracketing",
    local_path: "scripts/data/fargo/exports/2025-16u-boys-fs.json",
  }),
  slot({
    year: 2025,
    style: "GR",
    gender: "M",
    age_division: "Junior",
    adapter: "usa_bracketing",
    local_path: "scripts/data/fargo/exports/2025-junior-boys-gr.json",
  }),
  slot({
    year: 2025,
    style: "GR",
    gender: "M",
    age_division: "16U",
    adapter: "usa_bracketing",
    local_path: "scripts/data/fargo/exports/2025-16u-boys-gr.json",
  }),

  // —— Historical Trackwrestling (pre–USA Bracketing years) ——
  slot({
    year: 2024,
    style: "FS",
    gender: "M",
    age_division: "Junior",
    adapter: "trackwrestling",
    local_path: "scripts/data/fargo/exports/2024-junior-boys-fs.track.txt",
    notes: "Register Track tournamentId + export when available",
  }),
  slot({
    year: 2024,
    style: "FS",
    gender: "M",
    age_division: "16U",
    adapter: "trackwrestling",
    local_path: "scripts/data/fargo/exports/2024-16u-boys-fs.track.txt",
  }),
  slot({
    year: 2023,
    style: "FS",
    gender: "M",
    age_division: "Junior",
    adapter: "trackwrestling",
    local_path: "scripts/data/fargo/exports/2023-junior-boys-fs.track.txt",
  }),
  slot({
    year: 2023,
    style: "FS",
    gender: "M",
    age_division: "16U",
    adapter: "trackwrestling",
    local_path: "scripts/data/fargo/exports/2023-16u-boys-fs.track.txt",
  }),
]

export function listFargoEventYears(): number[] {
  return [...new Set(FARGO_EVENT_REGISTRY.map((e) => e.year))].sort((a, b) => b - a)
}

export function getFargoEventsForYear(year: number): FargoEventSlot[] {
  return FARGO_EVENT_REGISTRY.filter((e) => e.year === year)
}

export function getFargoEventSlots(opts: {
  year: number
  style?: FargoStyle
  gender?: FargoGender
  age_division?: string
  adapter?: FargoAdapterId
}): FargoEventSlot[] {
  return getFargoEventsForYear(opts.year).filter((e) => {
    if (opts.style && e.style !== opts.style) return false
    if (opts.gender && e.gender !== opts.gender) return false
    if (opts.age_division && e.age_division !== opts.age_division) return false
    if (opts.adapter && e.adapter !== opts.adapter) return false
    return true
  })
}
