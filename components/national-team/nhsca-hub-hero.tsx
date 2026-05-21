"use client"

import Image from "next/image"
import { ExternalLink, Radio } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import {
  NhscaDualsCountdownFace,
  useWeighInCountdown,
} from "@/components/national-team/nhsca-weigh-in-countdown"

const GROUPME_URL = "https://groupme.com/join_group/113432813/Vdugtepr"
const NHSCA_OFFICIAL = "https://nhsca-events.com/national-duals/"

/** Gold hero band on navy hub — opaque background so text stays readable. */
export function NhscaHubHero() {
  const countdown = useWeighInCountdown()

  return (
    <section className="pt-6 md:pt-8 pb-4">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        <HardLink
          href="/national-team"
          className="inline-flex min-h-[40px] items-center text-sm font-medium text-white/80 hover:text-white mb-5"
        >
          ← National Team
        </HardLink>

        <div className="relative overflow-hidden rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-[#002147]/20">
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#F2E8C9] via-[#D4BC6A] to-[#B8982E]"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.35),transparent_55%)]"
            aria-hidden
          />

          <div className="relative p-5 sm:p-6 md:p-8 text-[#002147]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="inline-flex rounded-xl bg-white p-2.5 shadow-md ring-1 ring-[#002147]/10">
                  <Image
                    src="/images/nhsca-national-duals-logo.png"
                    alt="NHSCA National Duals"
                    width={180}
                    height={72}
                    className="h-9 sm:h-11 w-auto object-contain"
                    priority
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#003366]/80">
                    NC United · Team Hub
                  </p>
                  <h1 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight text-[#002147]">
                    NHSCA Duals 2026
                  </h1>
                </div>
                <p className="text-sm sm:text-base font-medium text-[#002147]/90 leading-snug">
                  Fri May 22 – Mon May 25
                  <span className="text-[#002147]/50 mx-1.5">·</span>
                  Virginia Beach Sports Center
                </p>
                <p className="text-sm text-[#003366]/85 max-w-lg leading-relaxed">
                  Rosters, logistics, and watch links for registered NC United families.
                </p>
              </div>

              <div className="w-full lg:w-auto lg:min-w-[300px] xl:min-w-[340px] shrink-0">
                <div
                  className="rounded-2xl bg-[#002147] p-4 sm:p-5 shadow-xl ring-1 ring-[#001428]/60"
                  aria-live="polite"
                  aria-label="Countdown to NHSCA Duals weigh-ins"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B31B1B] px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                      <Radio className="h-3 w-3" aria-hidden />
                      Live
                    </span>
                    <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#D3B574]">
                      {countdown.phase === "first_round" ? "First round soon" : "Weigh-ins open"}
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-white/75 mb-4">
                    {countdown.phase === "first_round"
                      ? "Sat May 23 · 8:00 AM ET"
                      : "Fri May 22 · 2:00 PM ET"}
                  </p>
                  <NhscaDualsCountdownFace countdown={countdown} dark layout="fourBox" />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2 border-t border-[#002147]/15 pt-5">
              <a
                href={GROUPME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#002147] px-4 text-sm font-bold text-white hover:bg-[#003366]"
              >
                Join GroupMe
                <ExternalLink className="h-4 w-4 text-[#D3B574]" aria-hidden />
              </a>
              <a
                href={NHSCA_OFFICIAL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#002147]/25 bg-white/70 px-4 text-sm font-semibold text-[#002147] hover:bg-white"
              >
                NHSCA official site
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
