import { PortalShell } from "@/components/portal/portal-shell"
import { loadCommandCenter } from "../load"
import { MyRecruitingAthlete } from "../my-recruiting-athlete"

export const dynamic = "force-dynamic"
export const metadata = { title: "Activity | Recruiting Command Center" }

/** Activity, its own page in the portal: which programs looked, who wrote, what a coach will find on the profile. */
export default async function CommandCenterActivity() {
  const { athletes } = await loadCommandCenter("/my-recruiting/activity")
  return (
    <PortalShell active="activity">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Recruiting activity</h1>
      <p className="mt-1 text-sm text-white/65">Which college programs have looked, which have written, and what a coach will find on the profile.</p>
      <div className="mt-6 space-y-10">
        {athletes.length ? athletes.map((a) => <MyRecruitingAthlete key={a.id} athlete={a} />) : <p className="text-sm text-white/60">No wrestler on this account yet.</p>}
      </div>
    </PortalShell>
  )
}
