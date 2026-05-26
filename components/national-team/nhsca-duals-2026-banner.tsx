"use client"

import Image from "next/image"
import { ArrowRight, Radio, Trophy } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { NhscaDuals2026SingletPreview } from "@/components/national-team/nhsca-duals-2026-singlet-preview"
import { cn } from "@/lib/utils"
import {
  NhscaDualsCountdownFace,
  useWeighInCountdown,
} from "@/components/national-team/nhsca-weigh-in-countdown"
import {
  NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT,
  NHSCA_DUALS_2026_SELECT_ACHIEVEMENT,
  scopeHeadline,
  scopeSubheadline,
} from "@/lib/nhsca-duals-public-hero-stats"
import { NHSCA_DUALS_2026_NATIONAL_TEAM_PHOTO } from "@/lib/nhsca-duals-2026-team-photos"

const NHSCA_2026_RESULTS_HREF = "/national-team/nhsca-duals-2026-results"

function CountdownPanel({
  large,
  dark,
}: {
  large?: boolean
  /** Navy panel (hero/home on gold) vs gold-on-navy */
  dark?: boolean
}) {
  const countdown = useWeighInCountdown()

  const panelClass = dark
    ? "rounded-2xl bg-[#002147] p-4 sm:p-5 shadow-xl ring-1 ring-[#001428]/60"
    : "rounded-2xl border-2 border-[#002147]/15 bg-white/90 p-4 sm:p-5 shadow-lg backdrop-blur-sm"

  return (
    <div className={panelClass} aria-live="polite" aria-label="Countdown to NHSCA Duals">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B31B1B] px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-sm">
          <Radio className="h-3 w-3" aria-hidden />
          Live
        </span>
        <p
          className={cn(
            "font-bold uppercase tracking-wider",
            dark ? "text-[#D3B574] text-[11px] sm:text-xs" : "text-[#002147]/80 text-[11px] sm:text-xs"
          )}
        >
          Weigh-ins open
        </p>
      </div>
      <p className={cn("text-xs sm:text-sm mb-4", dark ? "text-white/75" : "text-[#002147]/75")}>
        Fri May 22 · 2:00 PM ET
      </p>
      <NhscaDualsCountdownFace
        countdown={countdown}
        large={large}
        dark={dark}
        layout={dark ? "fourBox" : "default"}
      />
    </div>
  )
}

type NhscaDuals2026BannerProps = {
  variant?: "hero" | "home"
  lineupCount?: number | null
  className?: string
}

/**
 * Primary NHSCA Duals 2026 promo — national team landing (hero) and site homepage.
 */
export function NhscaDuals2026Banner({
  variant = "hero",
  lineupCount = null,
  className,
}: NhscaDuals2026BannerProps) {
  const isHero = variant === "hero"
  const isHome = variant === "home"

  if (isHome) {
    return (
      <section
        className={cn(
          "relative overflow-hidden text-[#002147] border-b border-[#B8982E]/50 shadow-lg",
          className
        )}
        aria-label="NHSCA Duals 2026 tournament recap"
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#F5EDD4] via-[#D4BC6A] to-[#A88B28]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.45),transparent_50%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,33,71,0.08),transparent_55%)]"
          aria-hidden
        />

        <div className="relative container mx-auto px-4 py-8 md:py-10">
          <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-[#B31B1B] px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                  <Trophy className="h-3 w-3 mr-1" aria-hidden />
                  Tournament recap
                </span>
                <span className="inline-flex items-center rounded-full bg-[#002147] px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D3B574]">
                  NHSCA Duals 2026
                </span>
              </div>

              <div className="flex flex-wrap items-start gap-4">
                <div className="rounded-xl bg-white p-2.5 shadow-md ring-1 ring-[#002147]/10 shrink-0">
                  <Image
                    src="/images/nhsca-national-duals-logo.png"
                    alt="NHSCA National Duals"
                    width={200}
                    height={80}
                    className="h-9 sm:h-10 w-auto object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#003366]/85">
                    NC United · National Team
                  </p>
                  <h2 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-black leading-[1.08] tracking-tight text-[#002147]">
                    {scopeHeadline("national")}
                  </h2>
                </div>
              </div>

              <p className="text-sm sm:text-base md:text-lg font-medium text-[#002147]/90 leading-snug max-w-2xl">
                {scopeSubheadline("national")}. View full dual results, athlete cards, interviews, highlight reels,
                and tournament photos.
              </p>

              <p className="text-sm text-[#003366]/85">
                May 23–26, 2026 · Virginia Beach Sports Center
                <span className="text-[#002147]/70">
                  {" "}
                  · Select team reached the {NHSCA_DUALS_2026_SELECT_ACHIEVEMENT}
                </span>
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
                <HardLink
                  href={NHSCA_2026_RESULTS_HREF}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#002147] px-5 py-2.5 text-sm sm:text-base font-bold text-white shadow-lg transition hover:bg-[#003366]"
                >
                  NHSCA 2026 Portal
                  <ArrowRight className="ml-2 h-5 w-5 text-[#D3B574]" aria-hidden />
                </HardLink>
                <HardLink
                  href="/national-team"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-[#002147] bg-white/80 px-5 py-2.5 text-sm font-semibold text-[#002147] transition hover:bg-white"
                >
                  NC United National Team
                </HardLink>
              </div>
            </div>

            <div className="w-full shrink-0 lg:max-w-sm xl:max-w-md">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-[#002147]/15 bg-[#002147]/10 shadow-xl ring-1 ring-white/40">
                <Image
                  src={NHSCA_DUALS_2026_NATIONAL_TEAM_PHOTO}
                  alt="NC United National Team at NHSCA Duals 2026"
                  fill
                  className="object-cover"
                  style={{ objectPosition: "center 72%" }}
                  sizes="(max-width: 1024px) 100vw, 384px"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#002147]/90 via-[#002147]/55 to-transparent px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#CBAF5D]">Bracket finish</p>
                  <p className="text-lg font-black text-white">{NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden text-[#002147]",
        isHero ? "border-b-4 border-[#B31B1B]" : "border-b border-[#B8982E]/50 shadow-lg",
        className
      )}
      aria-label="NHSCA Duals 2026"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#F5EDD4] via-[#D4BC6A] to-[#A88B28]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.45),transparent_50%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,33,71,0.08),transparent_55%)]"
        aria-hidden
      />

      <div
        className={cn(
          "relative container mx-auto px-4",
          isHero ? "py-10 md:py-14 lg:py-16" : "py-8 md:py-10"
        )}
      >
        <div
          className={cn(
            "mx-auto flex flex-col gap-8 lg:gap-10",
            isHero ? "max-w-6xl lg:flex-row lg:items-center lg:justify-between" : "max-w-5xl lg:flex-row lg:items-center lg:justify-between"
          )}
        >
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#B31B1B] px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                <Radio className="h-3 w-3 mr-1" aria-hidden />
                NHSCA Duals 2026
              </span>
              <HardLink
                href="/national-team/hub"
                className="inline-flex min-h-[36px] items-center rounded-full bg-[#002147] px-4 py-1.5 text-xs sm:text-sm font-bold text-[#D3B574] shadow-md transition hover:bg-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#002147]"
              >
                Team hub
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </HardLink>
            </div>

            <div className="flex flex-wrap items-start gap-4">
              <div className="rounded-xl bg-white p-2.5 shadow-md ring-1 ring-[#002147]/10 shrink-0">
                <Image
                  src="/images/nhsca-national-duals-logo.png"
                  alt="NHSCA National Duals"
                  width={200}
                  height={80}
                  className={cn("w-auto object-contain", isHero ? "h-10 sm:h-12 md:h-14" : "h-9 sm:h-10")}
                  priority={isHero}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#003366]/85">
                  NC United · National &amp; Select
                </p>
                <h2
                  className={cn(
                    "font-black leading-[1.05] tracking-tight text-[#002147]",
                    isHero ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl mt-1" : "text-2xl sm:text-3xl md:text-4xl mt-1"
                  )}
                >
                  NHSCA Duals 2026
                </h2>
              </div>
            </div>

            <p
              className={cn(
                "font-medium text-[#002147]/90 leading-snug max-w-2xl",
                isHero ? "text-base sm:text-lg md:text-xl" : "text-sm sm:text-base md:text-lg"
              )}
            >
              {variant === "home" ? (
                <>
                  Follow along with the <strong className="text-[#002147]">NC National teams</strong> at NHSCA
                  Duals — live results, rosters, watch links, and team updates for families and fans.
                </>
              ) : (
                <>
                  Follow the <strong className="text-[#002147]">NC National &amp; Select</strong> teams at
                  Virginia Beach — results, rosters, payments, and event info in one place.
                </>
              )}
            </p>

            <p className="text-sm text-[#003366]/85">
              Fri May 22 – Mon May 25 · Virginia Beach Sports Center
              {lineupCount != null && lineupCount > 0 && (
                <span className="font-semibold text-[#002147]"> · {lineupCount} on lineup</span>
              )}
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
              <HardLink
                href="/national-team/hub"
                className={cn(
                  "inline-flex items-center justify-center rounded-xl bg-[#002147] font-bold text-white shadow-lg transition hover:bg-[#003366]",
                  isHero ? "min-h-[52px] px-6 py-3 text-base" : "min-h-[48px] px-5 py-2.5 text-sm sm:text-base"
                )}
              >
                Open NHSCA team hub
                <ArrowRight className="ml-2 h-5 w-5 text-[#D3B574]" aria-hidden />
              </HardLink>
              {!isHome ? (
              <HardLink
                href="/national-team/hub?tab=payments"
                className={cn(
                  "inline-flex items-center justify-center rounded-xl bg-[#B31B1B] font-bold text-white shadow-md transition hover:bg-[#9a1616]",
                  isHero ? "min-h-[52px] px-6 py-3 text-base" : "min-h-[48px] px-5 py-2.5 text-sm"
                )}
              >
                Order team gear
              </HardLink>
              ) : null}
              {!isHome ? (
              <HardLink
                href="/national-team"
                className={cn(
                  "inline-flex items-center justify-center rounded-xl border-2 border-[#002147] bg-white/80 font-semibold text-[#002147] transition hover:bg-white",
                  isHero ? "min-h-[52px] px-6 py-3 text-base" : "min-h-[48px] px-5 py-2.5 text-sm"
                )}
              >
                NC United National Team
              </HardLink>
              ) : null}
            </div>
          </div>

          <div className={cn("w-full shrink-0 space-y-3", isHero ? "lg:max-w-md xl:max-w-lg" : "lg:max-w-sm xl:max-w-md")}>
            {isHero ? (
              <NhscaDuals2026SingletPreview compact className="w-full mx-auto lg:mx-0" />
            ) : null}
            <CountdownPanel large={isHero} dark />
          </div>
        </div>
      </div>
    </section>
  )
}
