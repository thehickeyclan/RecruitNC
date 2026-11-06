import type { Metadata } from "next"
import { Lock } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { sendCollegeCoachesToTheirPortal } from "@/lib/recruiting/families-only"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { PrioritiesApp } from "./priorities-app"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "What matters | Recruiting Command Center" }

/**
 * "What Matters to Your Family" and its permanent home, My Recruiting Priorities (survey v3).
 * Each login answers its own set: a parent the parent set, the wrestler the athlete set
 * (/api/recruiting-priorities decides which). A preview of another family shows nothing here.
 */
export default async function PrioritiesPage() {
  const admin = createAdminClient()
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (auth.user) await sendCollegeCoachesToTheirPortal(admin, auth.user.id)
  const { viewer } = await resolvePortalViewer({ supabase, admin })
  return (
    <PortalShell active="priorities">
      <div className="mx-auto max-w-2xl">
        {hasPortalAccess(viewer) ? (
          <PrioritiesApp />
        ) : (
          <section className="rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-8 text-center text-white">
            <Lock className="mx-auto h-8 w-8 text-[#D3B574]" aria-hidden />
            <h1 className="mt-3 text-3xl font-black">What matters to your family</h1>
            <a href="/command-center" className="mt-5 inline-block rounded-lg bg-[#D3B574] px-5 py-3 text-sm font-black text-[#0A1628]">
              See the Recruiting Command Center
            </a>
          </section>
        )}
      </div>
    </PortalShell>
  )
}
