import type { Metadata } from "next"
import { Suspense } from "react"
import { TocConfirmFlow } from "@/components/toc/confirm/toc-confirm-flow"
import { TocCollegeAttendees } from "@/components/toc/toc-college-attendees"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"
import { resolveTocConfirmedColleges } from "@/lib/toc/confirmed-colleges"
import { getTocEventConfig } from "@/lib/toc/event-config"
import { TOC_HERO_DATES } from "@/lib/toc/constants"
import { formatTocRegistrationFee, registrationPaymentDueDisplay } from "@/lib/toc/registration-policy"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Confirm Your Spot | Tournament of Champions 2026",
  description: "Invited athletes — look up your RecruitNC profile and confirm your spot at NC United Tournament of Champions.",
  robots: { index: false, follow: false },
}

export default async function TocConfirmPage() {
  const config = await getTocEventConfig()
  const confirmedColleges = await resolveTocConfirmedColleges(config.confirmed_colleges)

  return (
    <>
      <section className="bg-[#0B1D3A] text-white">
        <TocPatrioticBar />
        <div className="container mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 max-w-3xl">
          <p className="text-[#CC0000] text-xs sm:text-sm tracking-[0.2em] uppercase font-semibold mb-3">
            Invite only · {TOC_HERO_DATES.headline}
          </p>
          <TocVarsityHeading as="h1" className="text-white text-4xl sm:text-5xl md:text-6xl mb-3">
            Confirm your spot
          </TocVarsityHeading>
          <p className={`text-white/80 text-lg max-w-2xl ${tocDisplayClass()}`}>
            For invited athletes only. Look up your RecruitNC profile, verify it, choose weight and jacket size, then complete secure card checkout.
          </p>
          <p className="mt-3 text-white/55 text-sm max-w-2xl">
            Confirm by <strong className="text-white/75">{registrationPaymentDueDisplay()}</strong>.{" "}
            <strong className="text-white/75">Your spot is locked only after the {formatTocRegistrationFee()} registration payment is completed.</strong>
          </p>
          <p className="mt-3 text-white/55 text-sm max-w-2xl">
            Not on the list yet? Your coach or NC United sends the invite first — then search works, or use the link in
            your email.
          </p>
          <TocCollegeAttendees colleges={confirmedColleges} variant="hero" />
        </div>
        <TocPatrioticBar />
      </section>

      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto w-full px-4 sm:px-6 max-w-2xl">
          <Suspense fallback={<p className="text-muted-foreground text-sm">Loading confirmation…</p>}>
            <TocConfirmFlow />
          </Suspense>
        </div>
      </section>
    </>
  )
}
