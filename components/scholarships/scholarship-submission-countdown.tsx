"use client"

import { useEffect, useMemo, useState } from "react"

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function breakdown(msRemaining: number): { days: number; hours: number; minutes: number; seconds: number } {
  if (msRemaining <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const sec = Math.floor(msRemaining / 1000)
  const days = Math.floor(sec / 86400)
  const hours = Math.floor((sec % 86400) / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = sec % 60
  return { days, hours, minutes, seconds }
}

export function ScholarshipSubmissionCountdown(props: {
  scholarshipName: string
  /** UTC ms — end of submission day Eastern */
  deadlineUtcMs: number
  /** Human label e.g. "May 31, 2026" */
  deadlineLabel: string
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const msRemaining = useMemo(() => props.deadlineUtcMs - now, [props.deadlineUtcMs, now])
  const ended = msRemaining <= 0
  const parts = breakdown(msRemaining)

  const df = "font-[family-name:var(--font-fundraising-display)]"

  return (
    <div
      className="border-b border-[#C8A94A]/28 bg-[#07172e]/95 px-4 py-4 text-white sm:py-5"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <p className={`${df} text-[10px] font-bold uppercase tracking-[0.22em] text-[#CC0000]`}>Application deadline</p>
          <p className="mt-1 text-sm font-semibold text-white/92">{props.scholarshipName}</p>
          <p className="mt-1 text-xs text-white/48">
            Submissions close <span className="text-white/65">{props.deadlineLabel}</span>
            <span className="text-white/38"> · 11:59 PM Eastern Time</span>
          </p>
        </div>

        {ended ? (
          <p className={`${df} shrink-0 text-center text-xs font-bold uppercase tracking-[0.14em] text-white/45 sm:text-left`}>
            Deadline passed
          </p>
        ) : (
          <div
            className="grid shrink-0 grid-cols-4 gap-3 sm:gap-5"
            aria-live="polite"
            aria-label="Time remaining until application deadline"
          >
            {(
              [
                { label: "Days", value: parts.days, pad: false },
                { label: "Hours", value: parts.hours, pad: true },
                { label: "Min", value: parts.minutes, pad: true },
                { label: "Sec", value: parts.seconds, pad: true },
              ] as const
            ).map((u) => (
              <div key={u.label} className="text-center">
                <p className={`${df} tabular-nums text-[clamp(1.35rem,4vw,1.85rem)] font-black leading-none text-[#C8A94A]`}>
                  {u.pad ? pad2(u.value) : String(u.value)}
                </p>
                <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{u.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
