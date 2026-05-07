import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { getFundraisingAthletesIndexRows } from "@/lib/fundraising/athlete-fundraising-profiles"
import { logPlaybookMembersVisit } from "@/lib/fundraising/playbook-members-visit"
import { HardLink } from "@/components/hard-link"
import { FundraisingFooter } from "@/app/fundraising/components/FundraisingFooter"
import { PlaybookMembersContent } from "./components/playbook-members-content"

export const metadata: Metadata = {
  title: "Fundraising playbook | NC United Wrestling",
  description:
    "Family fundraising playbook for NC United Wrestling — nonprofit checkout, outreach ideas. Sign-in required for activation requests.",
  robots: { index: false, follow: false },
}

export default async function FundraisingPlaybookMembersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/signin?returnTo=${encodeURIComponent("/fundraising/playbook/members")}`)
  }

  const h = await headers()
  const referer = h.get("referer")
  await logPlaybookMembersVisit(supabase, user, referer)

  const admin = createAdminClient()
  const entries = await getFundraisingAthleteEntries(admin)
  const fundraisingDirectoryRows = await getFundraisingAthletesIndexRows(admin, entries)

  const { data: actRows } = await supabase
    .from("fundraising_activation_requests")
    .select("fundraising_slug,status,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const activationStatusBySlug: Record<string, string> = {}
  for (const r of actRows ?? []) {
    const slug =
      typeof r.fundraising_slug === "string" && r.fundraising_slug.trim()
        ? r.fundraising_slug.trim().toLowerCase()
        : ""
    const st = typeof r.status === "string" ? r.status : ""
    if (slug && activationStatusBySlug[slug] === undefined) {
      activationStatusBySlug[slug] = st
    }
  }

  return (
    <div className="min-h-screen bg-[#061224] text-white">
      <div className="border-b border-white/10 bg-[#0B2545]/90">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <HardLink href="/fundraising" className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            ← Fundraising hub
          </HardLink>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-wide text-white/55">
            <HardLink href="/fundraising/playbook" className="hover:text-[#C8A94A] hover:underline">
              Staff tools
            </HardLink>
          </div>
        </div>
      </div>

      <PlaybookMembersContent
        fundraisingDirectoryRows={fundraisingDirectoryRows}
        activationStatusBySlug={activationStatusBySlug}
      />
      <FundraisingFooter />
    </div>
  )
}
