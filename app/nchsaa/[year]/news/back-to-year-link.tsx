"use client"

import { ArrowLeft } from "lucide-react"

/**
 * Button with window.location.href — same bulletproof pattern as article ProfileLink.
 * <a> gets intercepted by Next/router/overlays and breaks; button + location.href works.
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
