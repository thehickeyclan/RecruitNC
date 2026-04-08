"use client"

import Image from "next/image"
import { Suspense } from "react"
import { CountdownTimer } from "./countdown-timer"
import { SpartanAthleteRibbon } from "./spartan-athlete-ribbon"
import { SPARTAN_COUNTDOWN_ISO } from "../data"

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black text-center">
      {/* Dark cinematic wide art — subject on right; cover + object-right keeps focus on narrow viewports */}
      <div className="relative w-full shrink-0 bg-black pt-[max(0,env(safe-area-inset-top))]">
        <div className="relative w-full overflow-hidden">
          <div
            className="relative w-full
              h-[min(13.5rem,40vw)] min-[400px]:h-[min(15rem,36vw)]
              md:h-[min(18rem,28svh)] lg:h-[min(22rem,32svh)]"
          >
            <Image
              src="/images/spartan-race-banner.png"
              alt="Spartan-style soldiers in formation — cinematic campaign banner"
              fill
              priority
              className="object-cover object-right"
              sizes="100vw"
              quality={90}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[38%] max-h-32 bg-gradient-to-t from-black via-black/60 to-transparent md:max-h-36"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-black/60 to-transparent md:h-12"
              aria-hidden
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-12 pt-6 md:pt-8">
        <Suspense fallback={null}>
          <SpartanAthleteRibbon />
        </Suspense>

        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="font-[family-name:var(--font-barlow-spartan)] text-[10px] font-semibold uppercase tracking-[0.22em] text-[#888]">
            Presented by
          </span>
          <div className="relative h-12 w-[200px] md:h-14 md:w-[240px]">
            <Image
              src="/images/nc-united-logo-white.png"
              alt="NC United Wrestling — 501(c)(3) nonprofit"
              fill
              className="object-contain object-center"
              sizes="240px"
            />
          </div>
        </div>

        <p
          className="mb-2.5 font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C8A94A]"
          style={{ animationDelay: "0ms" }}
        >
          Race day
        </p>

        <CountdownTimer targetIso={SPARTAN_COUNTDOWN_ISO} />

        <p className="mb-1 text-[13px] uppercase tracking-[0.12em] text-[#777]">
          May 2–3, 2026 · Fayetteville, NC
        </p>
        <p className="mb-7 max-w-md text-[12px] leading-snug text-[#666]">
          Super 10K (team race day): <span className="text-[#C8A94A]">Sunday, May 3</span> — other distances May 2–3 per
          event
        </p>

        <p
          className="mb-3 font-[family-name:var(--font-barlow-spartan)] text-[13px] font-semibold uppercase tracking-[0.2em] text-[#C8A94A]"
          style={{ animationDelay: "100ms" }}
        >
          NC United × Spartan Race
        </p>

        <h1
          className="mb-4 font-[family-name:var(--font-barlow-spartan)] text-[clamp(3.5rem,10vw,6rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] text-white"
          style={{ animationDelay: "200ms" }}
        >
          Earn Your Aroo.
        </h1>

        <p className="mb-8 max-w-lg text-[17px] leading-relaxed text-[#ccc]">
          Wrestlers, families, fans — everyone&apos;s welcome. Every signup through NC United backs North Carolina
          wrestling. Donate here; Spartan emails your race code.
        </p>

        <div className="flex w-full max-w-lg flex-col items-stretch justify-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="#donate"
            className="inline-flex min-h-[52px] items-center justify-center bg-[#CC0000] px-8 font-[family-name:var(--font-barlow-spartan)] text-lg font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#990000]"
          >
            Donate &amp; get your code
          </a>
          <a
            href="#races"
            className="inline-flex min-h-[52px] items-center justify-center border border-white/50 bg-transparent px-8 font-[family-name:var(--font-barlow-spartan)] text-lg font-bold uppercase tracking-[0.08em] text-white transition-colors hover:border-white"
          >
            Race distances
          </a>
        </div>

        <p className="mt-4 max-w-lg text-[11px] leading-relaxed tracking-[0.05em] text-[#666]">
          Tax-deductible gifts to NC United (501(c)(3)). Same mission whether you&apos;re on the course or not — it all
          fuels NC wrestling. Entry codes from Spartan per partner process.
        </p>
      </div>
    </section>
  )
}
