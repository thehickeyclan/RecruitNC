import { BadgeCheck, Ticket, Armchair } from "lucide-react"
import { TocCollegeCoachRegistration } from "@/components/toc/toc-college-coach-registration"
import { TocPatrioticBar, TocVarsityHeading } from "@/components/toc/toc-theme"

export function TocCollegeCoachSection() {
  return (
    <section id="college-coaches" className="relative scroll-mt-20 bg-[#071426] py-12 text-white sm:py-16 md:py-20">
      <TocPatrioticBar className="absolute inset-x-0 top-0" />
      <div className="container mx-auto grid max-w-6xl gap-8 px-4 pt-3 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
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
    </section>
  )
}
