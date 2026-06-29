"use client"

import { cn } from "@/lib/utils"

const BASE_NAV_LINKS = [
  { sectionId: "national-results", label: "National" },
  { sectionId: "highlights", label: "Video" },
  { sectionId: "bio", label: "Bio" },
  { sectionId: "programs", label: "School" },
  { sectionId: "contact", label: "Contact" },
  { sectionId: "in-season", label: "In-season" },
] as const

export function UnifiedProfileMobileNav({
  className,
  showQualityWins = false,
}: {
  className?: string
  showQualityWins?: boolean
}) {
  const navLinks = showQualityWins
    ? [
        BASE_NAV_LINKS[0],
        { sectionId: "quality-wins", label: "Quality" },
        ...BASE_NAV_LINKS.slice(1),
      ]
    : [...BASE_NAV_LINKS]

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
