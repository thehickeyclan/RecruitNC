"use client"

import { ArrowLeft } from "lucide-react"

/**
 * Button with window.location.href — same bulletproof pattern as article ProfileLink.
 * <a> gets intercepted by Next/router/overlays and breaks; button + location.href works.
 */
export function BackToYearLink({ year }: { year: string }) {
  const href = `/nchsaa/${year}`
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = href
      }}
      className="inline-flex items-center gap-2 rounded-md border-2 border-[#C20017] bg-transparent px-4 py-2 text-sm font-medium text-[#C20017] hover:bg-[#C20017] hover:text-white transition-colors cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      Back to {year} Results
    </button>
  )
}
