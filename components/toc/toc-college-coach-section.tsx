import { BadgeCheck, Ticket, Armchair } from "lucide-react"
import { TocCollegeCoachRegistration } from "@/components/toc/toc-college-coach-registration"
import { TocPatrioticBar, TocVarsityHeading } from "@/components/toc/toc-theme"

export function TocCollegeCoachSection() {
  return (
    <div
      id="college-coaches"
      className="relative mt-5 overflow-hidden rounded-sm border border-[#0B1D3A]/15 bg-[#071426] p-5 pt-8 text-white scroll-mt-24 sm:p-7 sm:pt-10"
    >
      <TocPatrioticBar className="absolute inset-x-0 top-0" />
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">College coaches</p>
          <TocVarsityHeading as="h2" className="mt-3 text-white">
            Your credential is on us
          </TocVarsityHeading>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">Register your staff for complimentary tournament admission and access to the credentialed VIP coaches lounge.</p>
          <div className="mt-6 grid gap-3 text-sm text-white/85">
            <p className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-[#C8A94A]" /> Complimentary event admission
            </p>
            <p className="flex items-center gap-3">
              <Armchair className="h-5 w-5 text-[#C8A94A]" /> VIP lounge, hospitality, Wi-Fi and live mat feeds
            </p>
            <p className="flex items-center gap-3">
              <BadgeCheck className="h-5 w-5 text-[#C8A94A]" /> Fast credential check-in for registered staff
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 shadow-2xl sm:p-7">
          <TocCollegeCoachRegistration />
        </div>
      </div>
    </div>
  )
}
