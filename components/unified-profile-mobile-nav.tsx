"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Section shortcuts, in the order the profile prints them: the folkstyle record in one run, then
 * video, then Freestyle & Greco-Roman - always last (Matt). "National" and "Team" used to point at
 * #national-results and #national-team, which the profile no longer renders: dead links.
 */
const NAV_LINKS = [
  { sectionId: "programs", label: "School" },
  { sectionId: "nchsaa-states", label: "States" },
  { sectionId: "tournaments", label: "National" },
  { sectionId: "quality-wins", label: "Wins" },
  { sectionId: "in-season", label: "In-season" },
  { sectionId: "highlights", label: "Video" },
  { sectionId: "olympic-styles", label: "Freestyle/Greco" },
] as const

export function UnifiedProfileMobileNav({
  className,
}: {
  className?: string
  /** Kept for callers; the Wins link now shows whenever that section is on the page. */
  showQualityWins?: boolean
}) {
  // Only sections that are actually on the page: a folkstyle-only wrestler has no Freestyle/Greco
  // section, and a link to nothing is worse than no link.
  const [present, setPresent] = useState<ReadonlySet<string> | null>(null)
  useEffect(() => {
    const check = () => setPresent(new Set(NAV_LINKS.map((l) => l.sectionId).filter((id) => document.getElementById(id))))
    check()
    // Wins and the match log fetch their data after the page and appear later, so watch for them
    // rather than guessing a delay; stop once everything has shown or after twenty seconds.
    const observer = new MutationObserver(() => {
      check()
      if (NAV_LINKS.every((l) => document.getElementById(l.sectionId))) observer.disconnect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    const stop = window.setTimeout(() => observer.disconnect(), 20_000)
    return () => {
      observer.disconnect()
      window.clearTimeout(stop)
    }
  }, [])
  const navLinks = NAV_LINKS.filter((l) => !present || present.has(l.sectionId))

  return (
    <nav
      aria-label="Profile sections"
      className={cn(
        "lg:hidden sticky top-0 z-30 -mx-4 px-4 py-2 border-b border-white/10 bg-[#0A1628]/95 backdrop-blur-md",
        className
      )}
    >
      <div className="flex gap-2 overflow-x-auto scroll-table-x pb-0.5">
        {navLinks.map(({ sectionId, label }) => (
          <a
            key={sectionId}
            href={`#${sectionId}`}
            className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-[#D3B574]/20 hover:text-[#D3B574] transition-colors min-h-0 min-w-0"
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  )
}
