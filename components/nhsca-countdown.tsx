"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import {
  NHSCA_NATIONALS_2026_DAY_MS,
  easternCalendarDaysUntil,
} from "@/lib/nhsca-duals-event-times"

/** Days until NHSCA High School Nationals (America/New_York calendar). */
export function NHSCACountdown() {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [isPast, setIsPast] = useState(false)

  useEffect(() => {
    const calculateDays = () => {
      const now = Date.now()
      const endOfNationalsDay = NHSCA_NATIONALS_2026_DAY_MS + 86400000

      if (now < NHSCA_NATIONALS_2026_DAY_MS) {
        setIsPast(false)
        setDaysRemaining(easternCalendarDaysUntil(now, NHSCA_NATIONALS_2026_DAY_MS))
      } else if (now < endOfNationalsDay) {
        setIsPast(false)
        setDaysRemaining(0)
      } else {
        setIsPast(true)
        setDaysRemaining(easternCalendarDaysUntil(NHSCA_NATIONALS_2026_DAY_MS, now))
      }
    }

    calculateDays()
    const interval = setInterval(calculateDays, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (daysRemaining === null) {
    return null
  }

  if (isPast) {
    return (
      <div className="bg-[#B31B1B] text-white p-4 rounded-lg flex items-center gap-3">
        <Clock className="w-5 h-5 flex-shrink-0" />
        <div>
          <div className="font-bold text-lg">
            {daysRemaining === 0 ? "Today!" : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} ago`}
          </div>
          <div className="text-sm text-white/90">Tournament has passed</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-[#002147] to-[#B31B1B] text-white p-4 md:p-6 rounded-lg shadow-lg">
      <div className="flex items-center gap-3 md:gap-4">
        <Clock className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-xs md:text-sm text-white/90 mb-1">Days until NHSCA Nationals (ET)</div>
          <div className="font-bold text-2xl md:text-4xl">
            {daysRemaining === 0 ? (
              <span className="animate-pulse">Today!</span>
            ) : (
              `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`
            )}
          </div>
          <p className="text-[10px] md:text-xs text-white/75 mt-1">March 27, 2026 · Eastern</p>
        </div>
      </div>
    </div>
  )
}
