"use client"

import { useEffect, useState } from "react"
import { Scale } from "lucide-react"
import { cn } from "@/lib/utils"

/** Friday May 22, 2026 · 2:00 PM Eastern — NC United early weigh-ins at VBSC */
export const NHSCA_WEIGH_IN_TARGET_MS = new Date("2026-05-22T14:00:00-04:00").getTime()

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

export type WeighInCountdownState = {
  days: number
  hours: number
  minutes: number
  seconds: number
  ready: boolean
}

export function useWeighInCountdown(targetMs = NHSCA_WEIGH_IN_TARGET_MS): WeighInCountdownState {
  const [countdown, setCountdown] = useState<WeighInCountdownState>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    ready: false,
  })

  useEffect(() => {
    const tick = () => {
      const d = Math.max(0, targetMs - Date.now())
      if (d <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, ready: true })
        return
      }
      setCountdown({
        days: Math.floor(d / 86400000),
        hours: Math.floor((d % 86400000) / 3600000),
        minutes: Math.floor((d % 3600000) / 60000),
        seconds: Math.floor((d % 60000) / 1000),
        ready: false,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetMs])

  return countdown
}

function CountdownDigits({
  countdown,
  compact,
}: {
  countdown: WeighInCountdownState
  compact?: boolean
}) {
  if (countdown.ready) {
    return (
      <p className={cn("font-black text-[#D3B574]", compact ? "text-lg sm:text-xl" : "text-2xl md:text-3xl")}>
        We&apos;re here — weigh-ins open
      </p>
    )
  }

  const units = [
    { value: countdown.days, label: "Days" },
    { value: countdown.hours, label: "Hrs" },
    { value: countdown.minutes, label: "Min" },
    { value: countdown.seconds, label: "Sec" },
  ]

  return (
    <div className={cn("flex items-center justify-center sm:justify-end gap-1.5 sm:gap-3", compact && "gap-1 sm:gap-2")}>
      {units.map((u, i) => (
        <span key={u.label} className="flex items-center gap-1.5 sm:gap-2">
          {i > 0 && (
            <span className={cn("font-bold text-white/40", compact ? "text-sm" : "text-lg md:text-2xl")} aria-hidden>
              :
            </span>
          )}
          <span className="text-center min-w-[2.25rem] sm:min-w-[2.75rem]">
            <span
              className={cn(
                "block font-black tabular-nums leading-none text-[#D3B574]",
                compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl md:text-5xl"
              )}
            >
              {u.label === "Days" ? u.value : pad2(u.value)}
            </span>
            <span
              className={cn(
                "block uppercase tracking-wider text-white/70 font-semibold",
                compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-xs"
              )}
            >
              {u.label}
            </span>
          </span>
        </span>
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
        aria-label="Countdown to NHSCA weigh-ins"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-start gap-2 sm:items-center">
            <Scale className="h-5 w-5 shrink-0 text-[#D3B574] mt-0.5 sm:mt-0" aria-hidden />
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#D3B574]">Weigh-ins open</p>
              <p className="text-xs sm:text-sm font-medium text-white/95 leading-snug">
                Friday, May 22 · 2:00 PM ET · Virginia Beach Sports Center
              </p>
            </div>
          </div>
          <CountdownDigits countdown={countdown} compact />
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
      <p className="text-center text-[#D3B574] font-bold uppercase tracking-wider text-xs sm:text-sm mb-1">Weigh-ins open</p>
      <p className="text-center text-white/90 text-sm sm:text-lg font-medium mb-5">
        Friday, May 22, 2026 · 2:00 PM ET · Virginia Beach Sports Center
      </p>
      <CountdownDigits countdown={countdown} />
    </section>
  )
}
