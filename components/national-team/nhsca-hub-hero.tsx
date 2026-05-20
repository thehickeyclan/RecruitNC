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

/** Matches National Team schedule tile — gold band + weigh-in countdown (single place for dates). */
export function NhscaHubHero() {
  const countdown = useWeighInCountdown()

  return (
    <section className="text-white pt-6 md:pt-8 pb-4">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        <HardLink
          href="/national-team"
          className="inline-flex min-h-[40px] items-center text-sm font-medium text-white/80 hover:text-white mb-6"
        >
          ← National Team
        </HardLink>

        <div className="rounded-2xl border-2 border-[#B8982E] bg-gradient-to-br from-[#CBAF5D]/30 via-[#D4BC6A]/25 to-[#B8982E]/30 p-5 md:p-8 shadow-lg text-[#002147]">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="min-w-0 flex-1">
              <Image
                src="/images/nhsca-national-duals-logo.png"
                alt="NHSCA National Duals"
                width={160}
                height={64}
                className="h-10 sm:h-12 w-auto object-contain mb-3"
                priority
              />
              <h1 className="text-2xl md:text-3xl font-black leading-tight">NHSCA Duals 2026</h1>
              <p className="text-sm md:text-base text-[#002147]/85 mt-1">
                Fri May 22 – Mon May 25 · Virginia Beach Sports Center
              </p>
              <p className="text-sm font-medium text-[#003366] mt-2">
                Team hub for registered NC United families — roster, logistics, watch links
              </p>
            </div>

            <div className="shrink-0 md:text-right">
              <p className="font-bold uppercase tracking-wider text-xs mb-1">Weigh-ins open</p>
              <p className="text-sm text-[#002147]/80 mb-3">Fri May 22 · 2:00 PM ET</p>
              {countdown.ready ? (
                <p className="text-xl md:text-2xl font-black">We&apos;re here!</p>
              ) : (
                <div className="flex gap-3 md:gap-4 md:justify-end">
                  {[
                    { v: countdown.days, l: "Days", pad: false },
                    { v: countdown.hours, l: "Hrs", pad: true },
                    { v: countdown.minutes, l: "Min", pad: true },
                    { v: countdown.seconds, l: "Sec", pad: true },
                  ].map(({ v, l, pad }) => (
                    <div key={l} className="text-center">
                      <div className="text-2xl md:text-3xl font-black tabular-nums">{pad ? pad2(v) : v}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#002147]/70">{l}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-2 border-t border-[#002147]/15 pt-5">
            <a
              href={GROUPME_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-[#002147] px-4 py-2.5 text-sm font-semibold text-[#D3B574] hover:bg-[#003366] transition-colors"
            >
              Join GroupMe
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href={NHSCA_OFFICIAL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border-2 border-[#002147]/30 bg-white/60 px-4 py-2.5 text-sm font-semibold text-[#002147] hover:bg-white transition-colors"
            >
              NHSCA official site
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
