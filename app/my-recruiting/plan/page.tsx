import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { RemindersPanel } from "@/components/portal/reminders-panel"
import { VisitsPanel } from "@/components/portal/visits-panel"
import { easternToday } from "@/lib/college-programs/admissions-format"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import data from "@/lib/college-programs/programs-2026-27.json"
import type { CollegeMapSchool } from "@/lib/college-programs/types"
import { remindersOn } from "../journey-data"
import { loadCommandCenter } from "../load"
import { WarRoomPlan } from "../war-room-plan"

export const dynamic = "force-dynamic"
export const metadata = { title: "Schedule and visits | Recruiting Command Center" }

const cleanName = (n: string) => n.replace(/\s*\([^)]*\)\s*/g, " ").trim()
const ALL = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS].map((s) => ({ id: s.id, name: cleanName(s.name) })).sort((a, b) => a.name.localeCompare(b.name))

/**
 * Step 5's working page (28 Oct 2026): where the wrestler competes next, the visits the family has
 * planned (and "did it happen?" once they are past), and the family's reminders.
 */
export default async function CommandCenterPlan() {
  const cc = await loadCommandCenter("/my-recruiting/plan")
  const { blue, wrestlers, schools, athletes } = cc
  const readOnly = cc.viewerId !== cc.authUserId
  return (
    <PortalShell active="plan">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">Step 5</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Schedule and visits</h1>
          <p className="mt-1 text-sm text-white/65">Where coaches can watch next, the visits you have planned, and your reminders.</p>
        </div>
        <Link href="/recruiting/learn/timeline" className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white/85 hover:border-[#D3B574]">
          Year-by-year timeline <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      {wrestlers.length ? (
        <>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <VisitsPanel
              initial={cc.visits.visits}
              available={cc.visits.available}
              today={easternToday()}
              wrestlers={athletes.map((a) => ({ id: a.id, firstName: a.firstName }))}
              listSchools={schools.map((s) => ({ id: s.id, name: s.name, logo: s.logo }))}
              allSchools={ALL}
              remindersOn={remindersOn()}
              readOnly={readOnly}
            />
            {remindersOn() ? (
              <RemindersPanel initial={cc.reminders.reminders} available={cc.reminders.available} schoolNames={Object.fromEntries(ALL.map((s) => [s.id, s.name]))} athleteId={athletes[0]?.id ?? null} readOnly={readOnly} />
            ) : null}
          </div>
          <WarRoomPlan blue={blue} wrestlers={wrestlers} schools={schools} show={["schedule"]} />
        </>
      ) : (
        <p className="mt-6 text-sm text-white/60">No wrestler on this account yet.</p>
      )}
    </PortalShell>
  )
}
