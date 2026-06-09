"use client"

import { useEffect, useState } from "react"
import { tocDisplayClass } from "@/components/toc/toc-theme"

type Props = {
  targetDate: Date
  className?: string
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

export function TocCountdown({ targetDate, className = "" }: Props) {
  const [parts, setParts] = useState<{ days: number; hours: number; mins: number } | null>(null)

  useEffect(() => {
    const tick = () => {
      const diff = targetDate.getTime() - Date.now()
      if (diff <= 0) {
        setParts({ days: 0, hours: 0, mins: 0 })
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const mins = Math.floor((diff / (1000 * 60)) % 60)
      setParts({ days, hours, mins })
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [targetDate])

  if (!parts) return null

  const items = [
    { label: "Days", value: parts.days },
    { label: "Hours", value: parts.hours },
    { label: "Min", value: parts.mins },
  ]

  return (
    <div className={`flex gap-2 sm:gap-4 w-full sm:w-auto ${className}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex-1 sm:flex-none min-w-0 sm:min-w-[4.5rem] rounded-sm border-2 border-white/30 bg-[#060f1f]/80 px-2 sm:px-3 py-2 text-center relative overflow-hidden"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#CC0000]" aria-hidden />
          <div className={`text-2xl sm:text-3xl md:text-4xl tabular-nums text-white ${tocDisplayClass()}`}>
            {pad(item.value)}
          </div>
          <div className={`text-[10px] sm:text-xs text-white/70 ${tocDisplayClass()}`}>{item.label}</div>
        </div>
      ))}
    </div>
  )
}
