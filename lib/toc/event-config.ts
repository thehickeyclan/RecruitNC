import { createAdminClient } from "@/lib/supabase/admin"
import { mergeTocConfirmedCollegeNames, parseConfirmedCollegeNames } from "@/lib/toc/confirmed-colleges"
import { TOC_CONFIRMED_COLLEGES, TOC_DEFAULT_CONFIG } from "@/lib/toc/constants"

function resolveConfirmedCollegesFromRow(raw: unknown): string[] {
  return mergeTocConfirmedCollegeNames(parseConfirmedCollegeNames(raw))
}

export type TocEventConfig = {
  phase: string
  event_dates: string
  venue_name: string | null
  venue_address: string | null
  hero_primary_cta_label: string
  hero_primary_cta_href: string
  watch_live_url: string | null
  brackets_url: string | null
  /** Merged code defaults + optional DB extras — see mergeTocConfirmedCollegeNames. */
  confirmed_colleges: string[]
}

/** Load single-row event config; falls back to defaults if table missing. */
export async function getTocEventConfig(): Promise<TocEventConfig> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from("toc_event_config").select("*").eq("id", 1).maybeSingle()
    if (error || !data) {
      return {
        ...TOC_DEFAULT_CONFIG,
        watch_live_url: null,
        brackets_url: null,
        confirmed_colleges: [...TOC_CONFIRMED_COLLEGES],
      }
    }
    return {
      phase: String(data.phase ?? TOC_DEFAULT_CONFIG.phase),
      event_dates: String(data.event_dates ?? TOC_DEFAULT_CONFIG.event_dates),
      venue_name: data.venue_name ? String(data.venue_name) : TOC_DEFAULT_CONFIG.venue_name,
      venue_address: data.venue_address ? String(data.venue_address) : TOC_DEFAULT_CONFIG.venue_address,
      hero_primary_cta_label: String(data.hero_primary_cta_label ?? TOC_DEFAULT_CONFIG.hero_primary_cta_label),
      hero_primary_cta_href: String(data.hero_primary_cta_href ?? TOC_DEFAULT_CONFIG.hero_primary_cta_href),
      watch_live_url: data.watch_live_url ? String(data.watch_live_url) : null,
      brackets_url: data.brackets_url ? String(data.brackets_url) : null,
      confirmed_colleges: resolveConfirmedCollegesFromRow(data.confirmed_colleges),
    }
  } catch {
    return {
      ...TOC_DEFAULT_CONFIG,
      watch_live_url: null,
      brackets_url: null,
      confirmed_colleges: [...TOC_CONFIRMED_COLLEGES],
    }
  }
}
