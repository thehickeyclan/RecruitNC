import type { Metadata } from "next"
import { HardLink } from "@/components/hard-link"
import { FundraisingPlaybookGuideContent } from "./fundraising-playbook-guide-content"

export const metadata: Metadata = {
  title: "The NC United Fundraising Playbook | NC United Wrestling",
  description:
    "How to fund your athlete's development — mindset, donor types, matching gifts, outreach, and the 501(c)(3) model.",
  openGraph: {
    title: "The NC United Fundraising Playbook",
    description: "How to fund athlete development — the system behind NC United Wrestling.",
  },
}

export default function FundraisingPlaybookGuidePage() {
  return (
    <div className="min-h-screen bg-[#061224] text-white">
      <div className="border-b border-white/10 bg-[#0B2545]/90">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-6">
          <HardLink
            href="/fundraising"
            className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
          >
            ← Fundraising hub
          </HardLink>
          <HardLink
            href="/fundraising/playbook"
            className="text-xs font-semibold uppercase tracking-wide text-white/55 underline-offset-4 hover:text-[#C8A94A] hover:underline"
            title="Recipients only: sign in to RecruitNC for donor CRM, exports, and admin dashboards—not the public guide on this site."
          >
            Staff: CRM &amp; dashboards
          </HardLink>
        </div>
      </div>
      <article
        className="mx-auto max-w-3xl px-4 py-12 pb-24"
        style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
      >
        <FundraisingPlaybookGuideContent />
      </article>
    </div>
  )
}
