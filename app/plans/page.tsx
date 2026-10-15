import type { Metadata } from "next"

import { RankingsSalesClient } from "../rankings/(index)/rankings-sales-client"
import { loadSalesData } from "@/lib/recruiting/sales-data"
import { createAdminClient } from "@/lib/supabase/admin"

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
  const d = await loadSalesData(createAdminClient())
  return (
    <RankingsSalesClient
      collegeViews={d.collegeViews}
      topClasses={d.topClasses}
      platform={d.platform}
      commandCenterOnSale={d.onSale}
      mapPreview={d.mapPreview}
      alwaysShowPlans
    />
  )
}
