import type { Metadata } from "next"
import { Suspense } from "react"
import Image from "next/image"
import { TocConfirmFlow } from "@/components/toc/confirm/toc-confirm-flow"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_EVENT_LOGO, TOC_HERO_DATES } from "@/lib/toc/constants"

export const metadata: Metadata = {
  title: "Confirm Your Spot | Tournament of Champions 2026",
  description: "Invited athletes — look up your RecruitNC profile and confirm your spot at NC United Tournament of Champions.",
  robots: { index: false, follow: false },
}

export default function TocConfirmPage() {
  return (
    <>
      <section className="bg-[#0B1D3A] text-white">
        <TocPatrioticBar />
        <div className="container mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 max-w-6xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,14rem)_1fr] lg:items-start lg:gap-10">
            <div className="mx-auto w-full max-w-[12rem] lg:max-w-none">
              <Image
                src={TOC_EVENT_LOGO.src}
                alt=""
                width={TOC_EVENT_LOGO.width}
                height={TOC_EVENT_LOGO.height}
                className="h-auto w-full"
                priority
              />
            </div>
            <div>
              <p className="text-[#CC0000] text-xs sm:text-sm tracking-[0.2em] uppercase font-semibold mb-3">
                Invite only · {TOC_HERO_DATES.headline}
              </p>
              <TocVarsityHeading as="h1" className="text-white text-4xl sm:text-5xl md:text-6xl mb-3">
                Confirm your spot
              </TocVarsityHeading>
              <p className={`text-white/80 text-lg max-w-2xl ${tocDisplayClass()}`}>
                Look yourself up on RecruitNC. Verify your profile. Lock in your weight and jacket size.
              </p>
            </div>
          </div>
        </div>
        <TocPatrioticBar />
      </section>

      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto w-full px-4 sm:px-6 max-w-2xl">
          <Suspense
            fallback={
              <p className="text-muted-foreground text-sm">Loading confirmation…</p>
            }
          >
            <TocConfirmFlow />
          </Suspense>
        </div>
      </section>
    </>
  )
}
