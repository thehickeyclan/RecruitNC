"use client"

import Image from "next/image"
import { CountdownTimer } from "./countdown-timer"
import { SPARTAN_COUNTDOWN_ISO } from "../data"

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pb-10 pt-14 text-center">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/spartan-race-banner.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/70 to-black/85"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center">
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

        <p className="mb-8 max-w-md text-[17px] leading-relaxed text-[#ccc]">
          Support NC&apos;s top wrestlers. Run the mud. Fund the mission.
        </p>

        <div className="flex w-full max-w-lg flex-col items-stretch justify-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="#races"
            className="inline-flex min-h-[52px] items-center justify-center bg-[#CC0000] px-8 font-[family-name:var(--font-barlow-spartan)] text-lg font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#990000]"
          >
            Register now
          </a>
          <a
            href="#donate"
            className="inline-flex min-h-[52px] items-center justify-center border border-white/50 bg-transparent px-8 font-[family-name:var(--font-barlow-spartan)] text-lg font-bold uppercase tracking-[0.08em] text-white transition-colors hover:border-white"
          >
            Donate →
          </a>
        </div>

        <p className="mt-4 max-w-md text-[11px] tracking-[0.05em] text-[#666]">
          100% of proceeds support NC United athletes. NC United is a 501(c)(3) nonprofit.
        </p>
      </div>
    </section>
  )
}
