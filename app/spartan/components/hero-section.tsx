"use client"

import Image from "next/image"
import { Suspense } from "react"
import { SpartanAthleteRibbon } from "./spartan-athlete-ribbon"

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
          <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-neutral-300">
            Give to NC United. <strong className="text-neutral-200">Every dollar funds training.</strong>
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

        <a
          href="#spartan-checkout"
          className="mb-6 inline-flex min-h-[52px] min-w-[12rem] items-center justify-center rounded-sm bg-[var(--spartan-red)] px-8 font-[family-name:var(--font-barlow-spartan)] text-base font-bold uppercase tracking-[0.1em] text-white shadow-[0_12px_40px_-8px_rgba(204,0,0,0.45)] transition-[transform,background-color] hover:bg-[#990000] active:translate-y-px sm:text-lg"
        >
          Get started
        </a>

        <p className="mb-2 text-center">
          <a href="#races" className="text-[12px] text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline">
            Race &amp; venue details
          </a>
        </p>

        <p className="mt-4 max-w-lg text-[11px] leading-relaxed tracking-[0.03em] text-neutral-500">
          501(c)(3) nonprofit checkout — NC United emails your charitable acknowledgement (IRC-aligned) after payment; ask your tax advisor whether your gift may be deducted.
        </p>
      </div>
    </section>
  )
}
