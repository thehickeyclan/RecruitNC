"use client"

import Image from "next/image"
import { X } from "lucide-react"
import { useEffect, useState } from "react"

const STORAGE_KEY = "recruitnc_hide_nhsca_live_dashboard_banner"

/** Override with NEXT_PUBLIC_NHSCA_LIVE_DASHBOARD_URL in env when the live URL changes. */
export const NHSCA_LIVE_DASHBOARD_URL =
  process.env.NEXT_PUBLIC_NHSCA_LIVE_DASHBOARD_URL ?? "https://v0-real-time-dashboard-one.vercel.app/nhsca"

const NAVY = "#0D1A4D"
const RED = "#B31B1B"
const GOLD = "#D3B574"

export function NhscaLiveDashboardBanner() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1") {
        setDismissed(true)
      }
    } catch {
      /* storage blocked */
    }
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* ignore */
    }
  }

  if (dismissed) return null

  return (
    <div
      className="relative z-40 overflow-hidden border-b-2 shadow-lg"
      style={{ borderColor: GOLD, backgroundColor: NAVY }}
      role="region"
      aria-label="NHSCA Nationals live coverage"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30 nhsca-live-banner-shimmer"
        aria-hidden
      />
      <div className="relative container mx-auto flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="hidden shrink-0 sm:block">
            <Image
              src="/images/nhsca-logo.png"
              alt=""
              width={56}
              height={56}
              className="h-12 w-12 object-contain md:h-14 md:w-14"
            />
          </div>
          <div className="flex min-w-0 items-start gap-3">
            <span className="relative mt-1.5 flex h-3 w-3 shrink-0" aria-hidden>
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ backgroundColor: RED }}
              />
              <span
                className="relative inline-flex h-3 w-3 rounded-full shadow-[0_0_10px_2px_rgba(179,27,27,0.7)]"
                style={{ backgroundColor: RED }}
              />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight text-white md:text-xl">
                NHSCA Nationals - <span style={{ color: GOLD }}>LIVE</span>
              </h2>
              <p className="mt-1 text-sm leading-snug text-white/90 md:text-base">
                Track NC wrestlers in real-time at Virginia Beach
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
          <a
            href={NHSCA_LIVE_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold text-[#0D1A4D] shadow-md transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ backgroundColor: GOLD }}
          >
            View Live Dashboard
            <span className="ml-1.5" aria-hidden>
              →
            </span>
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Dismiss NHSCA live banner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
