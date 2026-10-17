import type { Metadata } from "next"
import { Lock } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { familyAthleteIds } from "@/lib/coach-messages"
import { mostRecentGraduatedClassYear } from "@/lib/class-years"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { ScoutChat } from "./scout-chat"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Scout | Recruiting Command Center" }

/** Scout, the recruiting assistant (Matt's mock-up, 17 Oct 2026). Command Center families only. */
export default async function ScoutPage() {
  const admin = createAdminClient()
  const { viewer, userId } = await resolvePortalViewer({ supabase: await createClient(), admin })
  const open = hasPortalAccess(viewer)

  let firstName: string | null = null
  if (open && userId) {
    const ids = await familyAthleteIds(admin, userId).catch(() => [] as string[])
    const { data } = ids.length ? await admin.from("athletes").select('"firstName", name, graduationyear').in("id", ids) : { data: [] }
    const w = (data ?? [])
      .filter((a) => a.graduationyear && Number(a.graduationyear) > mostRecentGraduatedClassYear())
      .sort((a, b) => Number(a.graduationyear) - Number(b.graduationyear))[0]
    firstName = w ? String(w.firstName ?? "").trim() || String(w.name ?? "").split(" ")[0] || null : null
  }

  return (
    <PortalShell active="scout">
      <div className="mx-auto max-w-3xl text-white">
        {open ? (
          <ScoutChat firstName={firstName} />
        ) : (
          <section className="rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-8 text-center">
            <Lock className="mx-auto h-8 w-8 text-[#D3B574]" aria-hidden />
            <h1 className="mt-3 text-3xl font-black">Scout</h1>
            <p className="mx-auto mt-2 max-w-md text-white/65">Your recruiting assistant: the rules and dates for your wrestler&apos;s class, which colleges fit, what they cost, and what to do next.</p>
            <a href="/command-center" className="mt-5 inline-block rounded-lg bg-[#D3B574] px-5 py-3 text-sm font-black text-[#0A1628]">
              See the Recruiting Command Center
            </a>
          </section>
        )}
      </div>
    </PortalShell>
  )
}
