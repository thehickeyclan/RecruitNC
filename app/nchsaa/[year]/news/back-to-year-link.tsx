"use client"

import { ArrowLeft } from "lucide-react"

/**
 * Plain <a> with onClick fallback so navigation always works (avoids Next/link issues).
 */
export function BackToYearLink({ year }: { year: string }) {
  const href = `/nchsaa/${year}`
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault()
        window.location.href = href
      }}
      className="inline-flex items-center gap-2 rounded-md border-2 border-[#C20017] bg-transparent px-4 py-2 text-sm font-medium text-[#C20017] hover:bg-[#C20017] hover:text-white transition-colors"
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      Back to {year} Results
    </a>
  )
}
