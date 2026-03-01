"use client"

import { ArrowLeft } from "lucide-react"

/**
 * Button + window.location.href — same bulletproof pattern as article ProfileLink and First Flight
 * would need if its back link ever broke.
 *
 * Root cause: This page is under AuthGuard (client). Link does client-side nav to /nchsaa/2026,
 * which loads NCHSAAYearResultsClient; that transition can hang or get intercepted. First Flight
 * back link goes to /news (lighter page) so Link works there. Here we force a full page load
 * so the back action always completes.
 */
export function BackToYearLink({ year }: { year: string }) {
  const href = `/nchsaa/${year}`

  const go = () => {
    window.location.href = href
  }

  return (
    <button
      type="button"
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          go()
        }
      }}
      className="inline-flex items-center gap-2 rounded-md border-2 border-[#C20017] bg-transparent px-4 py-2 text-sm font-medium text-[#C20017] hover:bg-[#C20017] hover:text-white transition-colors cursor-pointer"
      aria-label={`Back to ${year} results`}
    >
      <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
      Back to {year} Results
    </button>
  )
}
