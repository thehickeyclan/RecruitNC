"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

interface NHSCACountdownProps {
  targetDate: Date
}

export function NHSCACountdown({ targetDate }: NHSCACountdownProps) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [isPast, setIsPast] = useState(false)

  useEffect(() => {
    const calculateDays = () => {
      const now = new Date()
      // Set to start of day for accurate calculation
      now.setHours(0, 0, 0, 0)
      const target = new Date(targetDate)
      target.setHours(0, 0, 0, 0)

      const diffTime = target.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays < 0) {
        setIsPast(true)
        setDaysRemaining(Math.abs(diffDays))
      } else {
        setIsPast(false)
        setDaysRemaining(diffDays)
      }
    }

    calculateDays()
    // Update every minute to keep it accurate
    const interval = setInterval(calculateDays, 60000)

    return () => clearInterval(interval)
  }, [targetDate])

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
          <div className="text-xs md:text-sm text-white/90 mb-1">Days Until NHSCA Nationals</div>
          <div className="font-bold text-2xl md:text-4xl">
            {daysRemaining === 0 ? (
              <span className="animate-pulse">Today!</span>
            ) : (
              `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
