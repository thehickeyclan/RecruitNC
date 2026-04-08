"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function CountdownTimer({ targetIso, className }: { targetIso: string; className?: string }) {
  /** null until after mount — avoids SSR/client mismatch (Date.now() differs every second). */
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const target = new Date(targetIso).getTime()
  const diff = now === null ? 0 : Math.max(0, target - now)
  const done = now !== null && diff <= 0

  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  const pending = now === null

  return (
    <div
      className={cn("mb-1.5 flex items-start justify-center gap-1 sm:gap-1.5", className)}
      aria-busy={pending}
    >
      <CdBlock value={done ? 0 : d} label="Days" variant="days" muted={pending} />
      <span className="spartan-colon mt-1 font-[family-name:var(--font-barlow-spartan)] text-[clamp(2.5rem,8vw,3.5rem)] font-black leading-none text-[#CC0000]">
        :
      </span>
      <CdBlock value={done ? 0 : h} label="Hours" variant="time" muted={pending} />
      <span className="spartan-colon mt-1 font-[family-name:var(--font-barlow-spartan)] text-[clamp(2.5rem,8vw,3.5rem)] font-black leading-none text-[#CC0000]">
        :
      </span>
      <CdBlock value={done ? 0 : m} label="Min" variant="time" muted={pending} />
      <span className="spartan-colon mt-1 font-[family-name:var(--font-barlow-spartan)] text-[clamp(2.5rem,8vw,3.5rem)] font-black leading-none text-[#CC0000]">
        :
      </span>
      <CdBlock value={done ? 0 : s} label="Sec" variant="time" muted={pending} />
    </div>
  )
}

function CdBlock({
  value,
  label,
  variant,
  muted,
}: {
  value: number
  label: string
  variant: "days" | "time"
  muted?: boolean
}) {
  const display =
    variant === "days" ? (value > 99 ? String(value) : pad(value)) : pad(value)
  return (
    <div className="flex min-w-[3.25rem] flex-col items-center sm:min-w-[4.5rem]">
      <span
        className={cn(
          "tabular-nums font-[family-name:var(--font-barlow-spartan)] text-[clamp(2.75rem,7.5vw,4.5rem)] font-black leading-none tracking-[-0.02em] text-[#CC0000] [text-shadow:0_0_40px_rgba(204,0,0,0.25)] sm:text-[clamp(3rem,8vw,4.75rem)]",
          muted && "opacity-40",
        )}
      >
        {display}
      </span>
      <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.15em] text-[#888]">{label}</span>
    </div>
  )
}
