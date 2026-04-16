"use client"

import Image from "next/image"
import { Suspense } from "react"
import { HardLink } from "@/components/hard-link"
import { CountdownTimer } from "./countdown-timer"
import { SpartanAthleteRibbon } from "./spartan-athlete-ribbon"
import { SPARTAN_COUNTDOWN_ISO } from "../data"

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black text-center">
      {/* Full artwork visible: contain (not cover) + tall frame — cover in a short strip was zooming into a dark unreadable crop */}
      <div className="relative w-full shrink-0 bg-black pt-[max(0,env(safe-area-inset-top))]">
        <div className="relative w-full">
          <div className="relative mx-auto w-full max-w-[1920px] h-[clamp(14rem,48vmin,32rem)] min-h-[14rem] md:min-h-[17.5rem]">
            <Image
              src="/images/spartan-race-banner.png"
              alt="Spartan-style soldiers in formation — Team NC Spartan banner"
              fill
              priority
              className="object-contain object-center"
              sizes="100vw"
              quality={92}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-gradient-to-t from-black/90 to-transparent md:h-16"
              aria-hidden
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-5 pb-12 pt-4 sm:px-6 md:pt-5">
        <Suspense fallback={null}>
          <SpartanAthleteRibbon />
        </Suspense>

        <div className="w-full max-w-xl rounded-xl border border-white/10 bg-white/[0.03] px-5 py-6 text-center sm:px-8 sm:py-7">
          <p
            className="mb-2 font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--spartan-gold)]"
            style={{ animationDelay: "0ms" }}
          >
            Team NC · Spartan · Fayetteville
          </p>
          <p className="mx-auto mb-4 max-w-md text-[15px] font-semibold leading-snug text-white sm:text-base">
            Weekend May 2–3, 2026 · Fayetteville, NC
          </p>
          <CountdownTimer targetIso={SPARTAN_COUNTDOWN_ISO} className="justify-center" />
          <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-neutral-300">
            <span className="text-[var(--spartan-gold)]">Come race with us</span> — pick any Spartan distance that weekend
            (Sprint to Ultra and more). Team NC lines up together — details when you check out below.
          </p>
        </div>

        <p
          className="mb-3 mt-7 font-[family-name:var(--font-barlow-spartan)] text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--spartan-gold)]"
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
          <strong className="text-neutral-200">Race:</strong> pick any distance in the form&apos;s menu, credit a wrestler.{" "}
          <strong className="text-neutral-200">Sponsor or give:</strong>{" "}
          <strong className="text-neutral-200">$5+</strong> to one athlete or to the NC United fund — any amount at or above
          $5. Same checkout below.
        </p>

        <div className="flex w-full max-w-2xl flex-col items-stretch justify-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
          <HardLink
            href="/spartan?flow=race#spartan-checkout"
            className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-sm bg-[var(--spartan-red)] px-6 font-[family-name:var(--font-barlow-spartan)] text-base font-bold uppercase tracking-[0.08em] text-white shadow-[0_12px_40px_-8px_rgba(204,0,0,0.45)] transition-[transform,background-color] hover:bg-[#990000] active:translate-y-px sm:min-w-[9.5rem] sm:text-lg"
          >
            Racing
          </HardLink>
          <HardLink
            href="/spartan?flow=sponsor#spartan-checkout"
            className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-sm border border-[#C8A94A]/50 bg-[#1a170d] px-6 font-[family-name:var(--font-barlow-spartan)] text-base font-bold uppercase tracking-[0.08em] text-[#C8A94A] transition-colors hover:border-[#C8A94A] hover:bg-[#231c0d] sm:min-w-[9.5rem] sm:text-lg"
          >
            Sponsoring
          </HardLink>
          <HardLink
            href="/spartan?flow=fund#spartan-checkout"
            className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-sm border border-white/40 bg-white/[0.03] px-6 font-[family-name:var(--font-barlow-spartan)] text-base font-bold uppercase tracking-[0.08em] text-white transition-colors hover:border-white hover:bg-white/[0.06] sm:min-w-[9.5rem] sm:text-lg"
          >
            Donating
          </HardLink>
        </div>
        <p className="mt-3 text-center">
          <a href="#races" className="text-[12px] text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline">
            Course &amp; checkout
          </a>
        </p>

        <p className="mt-6 max-w-lg text-[11px] leading-relaxed tracking-[0.04em] text-neutral-500">
          501(c)(3) tax-deductible. Race codes: Spartan sends them after NC United passes names along — timing varies.
        </p>
      </div>
    </section>
  )
}
