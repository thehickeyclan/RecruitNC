import type { Metadata } from "next"

import { RankingsSalesClient } from "../rankings/(index)/rankings-sales-client"
import { recentCollegeViewStats } from "@/lib/college-view-signal"
import { loadPlatformStats } from "@/lib/platform-stats"
import { loadTopHundred } from "@/lib/rankings/top-100-view"
import { createAdminClient } from "@/lib/supabase/admin"
import { commandCenterOnSale } from "@/lib/ranking-access"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Plans | RecruitNC",
  description: "Free, Rankings, Command Center and NC United Blue: what each plan includes and what it costs.",
}

/**
 * Every plan, for everyone (15 Oct 2026). /rankings sends anyone who already has the rankings on
 * to the boards; this page does not, so a Rankings subscriber can upgrade to the Command Center and
 * the portal's own locks have somewhere to point.
 */
export default async function PlansPage() {
  const admin = createAdminClient()
  const [collegeViews, topBoard, platform, onSale] = await Promise.all([
    recentCollegeViewStats(admin).catch(() => null),
    loadTopHundred("Male").catch(() => null),
    loadPlatformStats(admin).catch(() => null),
    commandCenterOnSale(admin).catch(() => false),
  ])
  return <RankingsSalesClient collegeViews={collegeViews} topClasses={topBoard?.classes ?? []} platform={platform} alwaysShowPlans commandCenterOnSale={onSale} />
}
