import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { loadCommandCenter } from "../load"
import { WarRoomPlan } from "../war-room-plan"

export const dynamic = "force-dynamic"
export const metadata = { title: "Plan | Recruiting Command Center" }

/** The full plan: this month's steps and where the wrestler competes next, with the year-by-year timeline a tap away. */
export default async function CommandCenterPlan() {
  const { blue, wrestlers, schools } = await loadCommandCenter("/my-recruiting/plan")
  return (
    <PortalShell active="plan">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Your recruiting plan</h1>
          <p className="mt-1 text-sm text-white/65">What to do now, and where coaches can watch next.</p>
        </div>
        <Link href="/recruiting/learn/timeline" className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white/85 hover:border-[#D3B574]">
          Year-by-year timeline <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      {wrestlers.length ? <WarRoomPlan blue={blue} wrestlers={wrestlers} schools={schools} show={["steps", "schedule"]} /> : <p className="mt-6 text-sm text-white/60">No wrestler on this account yet.</p>}
    </PortalShell>
  )
}
