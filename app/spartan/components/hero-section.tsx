"use client"

import Image from "next/image"
import { CountdownTimer } from "./countdown-timer"
import { SPARTAN_COUNTDOWN_ISO } from "../data"

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black text-center">
      {/* Banner first in document flow so logo stays unobstructed; countdown sits below */}
      <div className="relative w-full shrink-0 bg-black">
        <div className="relative mx-auto h-[min(38vh,340px)] w-full max-w-5xl md:h-[min(36vh,380px)]">
          <Image
            src="/images/spartan-race-hero.jpg"
            alt="Spartan Race"
            fill
            priority
            className="object-contain object-center p-4 md:p-6"
            sizes="100vw"
            quality={90}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-12 pt-6 md:pt-8">
        <p
          className="mb-2.5 font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C8A94A]"
          style={{ animationDelay: "0ms" }}
        >
          Race day
        </p>

        <CountdownTimer targetIso={SPARTAN_COUNTDOWN_ISO} />

        <p className="mb-7 text-[13px] uppercase tracking-[0.12em] text-[#777]">
          May 2–3, 2026 · Fayetteville, NC
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
