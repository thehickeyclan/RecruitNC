import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { logPlaybookMembersVisit } from "@/lib/fundraising/playbook-members-visit"
import { HardLink } from "@/components/hard-link"
import { FundraisingFooter } from "@/app/fundraising/components/FundraisingFooter"
import { PlaybookMembersContent } from "./components/playbook-members-content"
import { FundraisingPlaybookAckSection } from "../_components/fundraising-playbook-ack-section"

export const metadata: Metadata = {
  title: "Fundraising playbook | NC United Wrestling",
  description:
    "NC United fundraising playbook for families — 501(c)(3) model, Digital Wallet, outreach, activation. Sign-in required.",
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

  const { data: ackRow } = await supabase
    .from("fundraising_playbook_acks")
    .select("acknowledged_at")
    .eq("user_id", user.id)
    .maybeSingle()
  const playbookAckAt = typeof ackRow?.acknowledged_at === "string" ? ackRow.acknowledged_at : null

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

      <PlaybookMembersContent />
      <FundraisingPlaybookAckSection
        id="playbook-activation-ack"
        initialAcknowledgedAt={playbookAckAt}
        userSignedIn
      />
      <FundraisingFooter />
    </div>
  )
}
