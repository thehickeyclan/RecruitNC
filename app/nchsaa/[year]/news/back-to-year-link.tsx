"use client"

import { ArrowLeft } from "lucide-react"

/**
 * Form GET submit — most bulletproof: full page navigation, no JS, cannot be intercepted by router/overlays.
 * <a> and button+onClick get intercepted on article pages; form submit does a real GET request.
 */
export function BackToYearLink({ year }: { year: string }) {
  const action = `/nchsaa/${year}`

  return (
    <form method="get" action={action} className="inline">
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-md border-2 border-[#C20017] bg-transparent px-4 py-2 text-sm font-medium text-[#C20017] hover:bg-[#C20017] hover:text-white transition-colors cursor-pointer"
        aria-label={`Back to ${year} results`}
      >
        <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
        Back to {year} Results
      </button>
    </form>
  )
}
