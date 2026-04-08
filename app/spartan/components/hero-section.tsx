"use client"

import Image from "next/image"
import { Suspense } from "react"
import { CountdownTimer } from "./countdown-timer"
import { SpartanAthleteRibbon } from "./spartan-athlete-ribbon"
import { SPARTAN_COUNTDOWN_ISO } from "../data"

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black text-center">
      {/* Taller frame + anchored crop (right, ~upper-third) so crest / helmet top stay in view */}
      <div className="relative w-full shrink-0 bg-black pt-[max(0,env(safe-area-inset-top))]">
        <div className="relative w-full overflow-hidden">
          <div
            className="relative w-full
              h-[min(16.5rem,48vw)] min-[400px]:h-[min(18rem,44vw)]
              md:h-[min(26rem,36svh)] lg:h-[min(30rem,40svh)]"
          >
            <Image
              src="/images/spartan-race-banner.png"
              alt="Spartan-style soldiers in formation — cinematic campaign banner"
              fill
              priority
              className="object-cover object-[82%_18%] min-[400px]:object-[85%_17%] md:object-[88%_15%] lg:object-[90%_14%]"
              sizes="100vw"
              quality={90}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[42%] max-h-40 bg-gradient-to-t from-black via-black/55 to-transparent md:max-h-44"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-black/70 via-black/20 to-transparent md:h-14"
              aria-hidden
            />
          </div>
        </div>
        <div
          className="mx-auto h-px w-[min(12rem,55vw)] max-w-full bg-gradient-to-r from-transparent via-[var(--spartan-gold)]/35 to-transparent"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-5 pb-14 pt-8 sm:px-6 md:pt-10">
        <Suspense fallback={null}>
          <SpartanAthleteRibbon />
        </Suspense>

        <div className="mb-9 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[var(--spartan-surface)] px-6 py-5 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.9)] backdrop-blur-[2px] sm:max-w-md sm:px-8">
          <span className="font-[family-name:var(--font-barlow-spartan)] text-[10px] font-semibold uppercase tracking-[0.26em] text-[#9a9a9a]">
            Presented by
          </span>
          <div className="relative mx-auto mt-3 h-10 w-[min(200px,70vw)] sm:h-11 md:h-12 md:w-[220px]">
            <Image
              src="/images/nc-united-logo-white.png"
              alt="NC United Wrestling — 501(c)(3) nonprofit"
              fill
              className="object-contain object-center"
              sizes="220px"
            />
          </div>
        </div>

        <div className="w-full max-w-xl rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent px-4 py-7 sm:px-8">
          <p
            className="mb-4 font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--spartan-gold)]"
            style={{ animationDelay: "0ms" }}
          >
            Race day
          </p>
          <CountdownTimer targetIso={SPARTAN_COUNTDOWN_ISO} />
          <p className="mt-5 text-[13px] uppercase tracking-[0.14em] text-neutral-400">
            May 2–3, 2026 · Fayetteville, NC
          </p>
          <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-neutral-500">
            Super 10K (team race day): <span className="text-[var(--spartan-gold)]">Sunday, May 3</span> — other
            distances May 2–3 per event
          </p>
        </div>

        <p
          className="mb-3 mt-10 font-[family-name:var(--font-barlow-spartan)] text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--spartan-gold)]"
          style={{ animationDelay: "100ms" }}
        >
          NC United × Spartan Race
        </p>

        <h1
          className="mb-5 max-w-[18ch] font-[family-name:var(--font-barlow-spartan)] text-[clamp(3.25rem,9.5vw,5.75rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-white [text-wrap:balance]"
          style={{ animationDelay: "200ms" }}
        >
          Earn Your Aroo.
        </h1>

        <p className="mb-9 max-w-lg text-[17px] leading-relaxed text-neutral-300">
          Wrestlers, families, fans — everyone&apos;s welcome. Every signup through NC United backs North Carolina
          wrestling. Donate here; Spartan emails your race code.
        </p>

        <div className="flex w-full max-w-lg flex-col items-stretch justify-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="#donate"
            className="inline-flex min-h-[52px] items-center justify-center rounded-sm bg-[var(--spartan-red)] px-8 font-[family-name:var(--font-barlow-spartan)] text-lg font-bold uppercase tracking-[0.08em] text-white shadow-[0_12px_40px_-8px_rgba(204,0,0,0.45)] transition-[transform,background-color] hover:bg-[#990000] active:translate-y-px"
          >
            Donate &amp; get your code
          </a>
          <a
            href="#races"
            className="inline-flex min-h-[52px] items-center justify-center rounded-sm border border-white/40 bg-white/[0.03] px-8 font-[family-name:var(--font-barlow-spartan)] text-lg font-bold uppercase tracking-[0.08em] text-white transition-colors hover:border-white hover:bg-white/[0.06]"
          >
            Race distances
          </a>
        </div>

        <p className="mt-6 max-w-lg text-[11px] leading-relaxed tracking-[0.04em] text-neutral-500">
          Tax-deductible gifts to NC United (501(c)(3)). Same mission whether you&apos;re on the course or not — it all
          fuels NC wrestling. Entry codes from Spartan per partner process.
        </p>
      </div>
    </section>
  )
}
