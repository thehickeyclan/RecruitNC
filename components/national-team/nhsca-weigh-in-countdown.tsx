"use client"

import { useEffect, useState } from "react"
import { Scale } from "lucide-react"
import {
  NHSCA_FIRST_ROUND_TARGET_MS,
  NHSCA_WEIGH_IN_TARGET_MS,
  type NhscaDualsCountdownPhase,
  easternCalendarDaysUntil,
  formatCountdownDuration,
  getNhscaDualsCountdownPhase,
  nhscaDualsCalendarDayLabel,
  nhscaDualsCountdownReadyMessage,
  nhscaDualsCountdownTargetMs,
} from "@/lib/nhsca-duals-event-times"
import { cn } from "@/lib/utils"

export { NHSCA_WEIGH_IN_TARGET_MS, NHSCA_FIRST_ROUND_TARGET_MS } from "@/lib/nhsca-duals-event-times"

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

export type WeighInCountdownState = {
  phase: NhscaDualsCountdownPhase
  /** Calendar days until active target (ET) */
  calendarDays: number
  hours: number
  minutes: number
  seconds: number
  durationLabel: string
  ready: boolean
  firstRoundMs: number
}

export function useWeighInCountdown(): WeighInCountdownState {
  const [countdown, setCountdown] = useState<WeighInCountdownState>({
    phase: "weigh_in",
    calendarDays: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    durationLabel: "",
    ready: false,
    firstRoundMs: Math.max(0, NHSCA_FIRST_ROUND_TARGET_MS - Date.now()),
  })

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const phase = getNhscaDualsCountdownPhase(now)
      const firstRoundMs = Math.max(0, NHSCA_FIRST_ROUND_TARGET_MS - now)

      if (phase === "underway") {
        setCountdown({
          phase,
          calendarDays: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          durationLabel: "",
          ready: true,
          firstRoundMs: 0,
        })
        return
      }

      const targetMs = nhscaDualsCountdownTargetMs(phase)
      const remaining = Math.max(0, targetMs - now)
      const calendarDays = easternCalendarDaysUntil(now, targetMs)

      setCountdown({
        phase,
        calendarDays,
        hours: Math.floor(remaining / 3600000),
        minutes: Math.floor((remaining % 3600000) / 60000),
        seconds: Math.floor((remaining % 60000) / 1000),
        durationLabel: formatCountdownDuration(remaining),
        ready: false,
        firstRoundMs,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return countdown
}

function phaseTimeHint(phase: NhscaDualsCountdownPhase): string {
  if (phase === "first_round") return "8:00 AM ET"
  return "2:00 PM ET"
}

/** Shared countdown face — home, national team, hub hero, sticky bar */
export function NhscaDualsCountdownFace({
  countdown,
  large,
  dark,
  compact,
}: {
  countdown: WeighInCountdownState
  large?: boolean
  dark?: boolean
  compact?: boolean
}) {
  const digitClass = large
    ? "text-3xl sm:text-4xl md:text-5xl"
    : compact
      ? "text-xl sm:text-2xl"
      : "text-2xl sm:text-3xl md:text-4xl"
  const labelClass = large ? "text-[10px] sm:text-xs" : compact ? "text-[9px] sm:text-[10px]" : "text-[9px] sm:text-[10px]"

  if (countdown.ready) {
    return (
      <p
        className={cn(
          "font-black text-center py-2",
          dark ? "text-white" : "text-[#002147]",
          compact ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"
        )}
      >
        {nhscaDualsCountdownReadyMessage(countdown.phase)}
      </p>
    )
  }

  if (countdown.calendarDays >= 1) {
    return (
      <div className={cn("text-center", compact ? "py-1" : "py-2")}>
        <p
          className={cn(
            "font-black tabular-nums leading-none",
            digitClass,
            dark ? "text-white" : "text-[#002147]",
            compact && !dark && "text-4xl sm:text-5xl"
          )}
        >
          {countdown.calendarDays}
        </p>
        <p
          className={cn(
            "mt-1.5 sm:mt-2 font-bold uppercase tracking-wider",
            compact ? "text-[10px]" : "text-sm",
            dark ? "text-[#D3B574]" : "text-[#002147]/80"
          )}
        >
          {nhscaDualsCalendarDayLabel(countdown.phase, countdown.calendarDays)}
        </p>
        <p
          className={cn(
            "mt-1 sm:mt-2 tabular-nums",
            compact ? "text-[10px]" : "text-xs",
            dark ? "text-white/55" : "text-[#002147]/65"
          )}
        >
          {countdown.durationLabel}
          {compact ? ` · ${phaseTimeHint(countdown.phase)}` : " remaining (Eastern)"}
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        compact
          ? "flex items-center justify-center gap-1.5 sm:gap-3 sm:justify-end"
          : "grid grid-cols-3 gap-2 sm:gap-3"
      )}
    >
      {[
        { v: countdown.hours, l: "Hrs" },
        { v: countdown.minutes, l: "Min" },
        { v: countdown.seconds, l: "Sec" },
      ].map(({ v, l }) => (
        <div
          key={l}
          className={cn(
            compact ? "text-center min-w-[2.25rem] sm:min-w-[2.75rem]" : "rounded-xl px-1 py-2.5 sm:py-3 text-center",
            !compact && (dark ? "bg-white/10" : "bg-[#002147]/5"),
            compact && dark && "rounded-lg bg-white/10 px-1 py-2.5 backdrop-blur-sm"
          )}
        >
          <div
            className={cn(
              "font-black tabular-nums leading-none",
              digitClass,
              dark ? "text-white" : "text-[#002147]",
              compact && dark && "text-xl sm:text-2xl"
            )}
          >
            {compact ? pad2(v) : pad2(v)}
          </div>
          <div
            className={cn(
              "mt-1 font-bold uppercase tracking-wider",
              labelClass,
              dark ? "text-[#D3B574]" : "text-[#002147]/65"
            )}
          >
            {l}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Sticky top bar or in-page card — countdown to Friday 2:00 PM weigh-ins */
export function NhscaWeighInCountdown({
  variant = "sticky",
  className,
}: {
  variant?: "sticky" | "card"
  className?: string
}) {
  const countdown = useWeighInCountdown()
  const compact = variant === "sticky"

  if (variant === "sticky") {
    return (
      <section
        className={cn(
          "sticky top-0 z-50 w-full border-b border-[#B31B1B]/50 bg-gradient-to-r from-[#001a33] via-[#002147] to-[#003366] text-white shadow-lg",
          className
        )}
        aria-live="polite"
        aria-label="Countdown to NHSCA Duals"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-start gap-2 sm:items-center">
            <Scale className="h-5 w-5 shrink-0 text-[#D3B574] mt-0.5 sm:mt-0" aria-hidden />
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#D3B574]">
                NHSCA Duals 2026
              </p>
              <p className="text-xs sm:text-sm font-medium text-white/95 leading-snug">
                Fri May 22 · 2:00 PM ET weigh-ins · First round Sat May 23 · 8:00 AM ET
              </p>
            </div>
          </div>
          <NhscaDualsCountdownFace countdown={countdown} dark compact />
        </div>
      </section>
    )
  }

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-[#B31B1B]/40 bg-gradient-to-br from-[#002147] to-[#003366] px-4 py-6 sm:px-6 sm:py-8 text-white shadow-lg",
        className
      )}
      aria-live="polite"
    >
      <p className="text-center text-[#D3B574] font-bold uppercase tracking-wider text-xs sm:text-sm mb-1">
        NHSCA Duals 2026
      </p>
      <p className="text-center text-white/90 text-sm sm:text-lg font-medium mb-5">
        Friday, May 22, 2026 · 2:00 PM ET · Virginia Beach Sports Center
      </p>
      <NhscaDualsCountdownFace countdown={countdown} dark />
    </section>
  )
}
