"use client"

import { useEffect, useState } from "react"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function CountdownTimer({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const target = new Date(targetIso).getTime()
  const diff = Math.max(0, target - now)
  const done = diff <= 0

  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  return (
    <div className="mb-1.5 flex items-start justify-center gap-1 sm:gap-1.5">
      <CdBlock value={done ? 0 : d} label="Days" variant="days" />
      <span className="spartan-colon mt-1 font-[family-name:var(--font-barlow-spartan)] text-[clamp(2.5rem,8vw,3.5rem)] font-black leading-none text-[#CC0000]">
        :
      </span>
      <CdBlock value={done ? 0 : h} label="Hours" variant="time" />
      <span className="spartan-colon mt-1 font-[family-name:var(--font-barlow-spartan)] text-[clamp(2.5rem,8vw,3.5rem)] font-black leading-none text-[#CC0000]">
        :
      </span>
      <CdBlock value={done ? 0 : m} label="Min" variant="time" />
      <span className="spartan-colon mt-1 font-[family-name:var(--font-barlow-spartan)] text-[clamp(2.5rem,8vw,3.5rem)] font-black leading-none text-[#CC0000]">
        :
      </span>
      <CdBlock value={done ? 0 : s} label="Sec" variant="time" />
    </div>
  )
}

function CdBlock({ value, label, variant }: { value: number; label: string; variant: "days" | "time" }) {
  const display =
    variant === "days" ? (value > 99 ? String(value) : pad(value)) : pad(value)
  return (
    <div className="flex min-w-[3.25rem] flex-col items-center sm:min-w-[4.5rem]">
      <span className="tabular-nums font-[family-name:var(--font-barlow-spartan)] text-[clamp(2.75rem,7.5vw,4.5rem)] font-black leading-none tracking-[-0.02em] text-[#CC0000] [text-shadow:0_0_40px_rgba(204,0,0,0.25)] sm:text-[clamp(3rem,8vw,4.75rem)]">
        {display}
      </span>
      <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.15em] text-[#888]">{label}</span>
    </div>
  )
}
