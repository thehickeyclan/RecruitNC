import Link from "next/link"
import { ArrowRight, MapPin } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { loadCommandCenter } from "../load"
import { WarRoomPlan } from "../war-room-plan"

export const dynamic = "force-dynamic"
export const metadata = { title: "Colleges | Recruiting Command Center" }

/** The college board, with the map and the comparison a tap away. */
export default async function CommandCenterColleges() {
  const { blue, wrestlers, schools } = await loadCommandCenter("/my-recruiting/colleges")
  return (
    <PortalShell active="colleges">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Your colleges</h1>
          <p className="mt-1 text-sm text-white/65">Move each college along as recruiting happens. Email a coach, keep notes, compare.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/recruiting/college-map" className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white/85 hover:border-[#D3B574]">
            <MapPin className="h-4 w-4" aria-hidden /> Add from the map
          </Link>
          {schools.length >= 2 ? (
            <Link href="/recruiting/compare" className="inline-flex items-center gap-1 rounded-lg bg-[#D3B574] px-3 py-2 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]">
              Compare <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
      {wrestlers.length ? <WarRoomPlan blue={blue} wrestlers={wrestlers} schools={schools} show={["list"]} /> : <p className="mt-6 text-sm text-white/60">No wrestler on this account yet.</p>}
    </PortalShell>
  )
}
