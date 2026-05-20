"use client"

import Image from "next/image"
import { ExternalLink } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { useWeighInCountdown } from "@/components/national-team/nhsca-weigh-in-countdown"

const GROUPME_URL = "https://groupme.com/join_group/113432813/Vdugtepr"
const NHSCA_OFFICIAL = "https://nhsca-events.com/national-duals/"

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

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

        <div className="relative overflow-hidden rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-[#D4BC6A]/40">
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#E8DDB8] via-[#D4BC6A] to-[#B8982E]"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]"
            aria-hidden
          />

          <div className="relative p-5 sm:p-6 md:p-8 text-[#002147]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="inline-flex rounded-lg bg-white/90 p-2 shadow-md ring-1 ring-[#002147]/15 backdrop-blur-sm">
                  <Image
                    src="/images/nhsca-national-duals-logo.png"
                    alt="NHSCA National Duals"
                    width={180}
                    height={72}
                    className="h-8 sm:h-10 w-auto object-contain"
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

              <div className="w-full lg:w-auto lg:min-w-[280px] shrink-0">
                <div className="rounded-xl bg-[#002147]/95 p-4 shadow-md ring-1 ring-[#D4BC6A]/30 backdrop-blur-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center rounded-full bg-[#C41E3A] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Live
                    </span>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#D3B574]">
                      Weigh-ins open
                    </p>
                  </div>
                  <p className="text-xs text-white/75 mb-3">Fri May 22 · 2:00 PM ET</p>
                  {countdown.ready ? (
                    <p className="text-center text-2xl font-black text-white py-2">We&apos;re here!</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { v: countdown.days, l: "Days", pad: false },
                        { v: countdown.hours, l: "Hrs", pad: true },
                        { v: countdown.minutes, l: "Min", pad: true },
                        { v: countdown.seconds, l: "Sec", pad: true },
                      ].map(({ v, l, pad }) => (
                        <div
                          key={l}
                          className="rounded-lg bg-white/10 px-1 py-2.5 text-center backdrop-blur-sm"
                        >
                          <div className="text-xl sm:text-2xl font-black tabular-nums text-white leading-none">
                            {pad ? pad2(v) : v}
                          </div>
                          <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[#D3B574]">
                            {l}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2 border-t border-[#002147]/15 pt-5">
              <a
                href={GROUPME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-[#002147] px-5 py-3 text-sm font-bold text-white hover:bg-[#003366] transition-colors shadow-md"
              >
                Join GroupMe
                <ExternalLink className="h-4 w-4 opacity-80" />
              </a>
              <a
                href={NHSCA_OFFICIAL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border-2 border-[#002147] bg-white px-5 py-3 text-sm font-bold text-[#002147] hover:bg-[#002147]/5 transition-colors"
              >
                NHSCA official site
                <ExternalLink className="h-4 w-4 opacity-70" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
