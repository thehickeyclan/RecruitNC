import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { buildMapPreview } from "@/lib/college-programs/map-preview"
import data from "@/lib/college-programs/programs-2026-27.json"
import type { CollegeMapSchool } from "@/lib/college-programs/types"
import { recentCollegeViewStats } from "@/lib/college-view-signal"
import { loadPlatformStats } from "@/lib/platform-stats"
import { commandCenterOnSale } from "@/lib/ranking-access"
import { loadTopHundred } from "@/lib/rankings/top-100-view"

const ALL_SCHOOLS = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]

/**
 * What the sales pages (/rankings, /plans, /command-center) show: live coach numbers, the Top 75's
 * classes, whether the Command Center can be bought, and the real college map. Each part fails on
 * its own; a page never goes down for a number.
 */
export async function loadSalesData(admin: SupabaseClient) {
  const [collegeViews, topBoard, platform, onSale] = await Promise.all([
    recentCollegeViewStats(admin).catch(() => null),
    loadTopHundred("Male").catch(() => null),
    loadPlatformStats(admin).catch(() => null),
    commandCenterOnSale(admin).catch(() => false),
  ])
  const mapPreview = (() => {
    try {
      return buildMapPreview(ALL_SCHOOLS, { accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN })
    } catch {
      return null
    }
  })()
  return { collegeViews, topClasses: topBoard?.classes ?? [], platform, onSale, mapPreview }
}
