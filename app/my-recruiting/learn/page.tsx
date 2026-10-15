import { PortalShell } from "@/components/portal/portal-shell"
import { loadCommandCenter } from "../load"
import { WarRoomLearn } from "../war-room-learn"

export const dynamic = "force-dynamic"
export const metadata = { title: "Learn | Recruiting Command Center" }

/** Learn, its own page in the portal: this year's plan, the questions families ask, the money, the rules. */
export default async function CommandCenterLearn() {
  const { wrestlers } = await loadCommandCenter("/my-recruiting/learn")
  return (
    <PortalShell active="learn">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Learn</h1>
      <p className="mt-1 text-sm text-white/65">This year&apos;s plan, the questions families ask, the money, and the rules for every level.</p>
      <WarRoomLearn wrestlers={wrestlers} />
    </PortalShell>
  )
}
