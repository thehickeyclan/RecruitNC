import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { logPlaybookMembersVisit } from "@/lib/fundraising/playbook-members-visit"
import { HardLink } from "@/components/hard-link"
import { FundraisingFooter } from "@/app/fundraising/components/FundraisingFooter"
import { PlaybookMembersRedCallout } from "./components/red-callout"
import { PlaybookMembersContent } from "./components/playbook-members-content"

export const metadata: Metadata = {
  title: "Fundraising playbook (members) | NC United Wrestling",
  description:
    "Full NC United fundraising playbook for signed-in families — Venmo alternatives, 501(c)(3) model, outreach, and execution patterns.",
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

  return (
    <div className="min-h-screen bg-[#061224] text-white">
      <PlaybookMembersRedCallout />
      <div className="border-b border-white/10 bg-[#0B2545]/90">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <HardLink href="/fundraising" className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            ← Fundraising hub
          </HardLink>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-wide text-white/55">
            <HardLink href="/fundraising/playbook/guide" className="hover:text-[#C8A94A] hover:underline">
              Public guide
            </HardLink>
            <HardLink href="/fundraising/playbook" className="hover:text-[#C8A94A] hover:underline">
              Staff tools
            </HardLink>
          </div>
        </div>
      </div>
      <PlaybookMembersContent />
      <FundraisingFooter />
    </div>
  )
}
