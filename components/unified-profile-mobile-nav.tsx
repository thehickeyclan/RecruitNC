"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Jump links for the profile, phone and desktop, in the order the page prints its sections: video,
 * the folkstyle record in one run (in-state, national, wins, season), school, then Freestyle &
 * Greco-Roman - always last (Matt). Pins to the top of the screen once scrolled past and marks the
 * section being read.
 *
 * Pinned with position: fixed, not sticky: the body's overflow-x: hidden makes it the scroll
 * container for sticky elements, and it never scrolls, so nothing on the site can stick.
 */
const NAV_LINKS = [
  { sectionId: "highlights", label: "Video" },
  { sectionId: "in-state", label: "In-state" },
  { sectionId: "tournaments", label: "National" },
  { sectionId: "quality-wins", label: "Wins" },
  { sectionId: "in-season", label: "Season" },
  { sectionId: "olympic-styles", label: "Freestyle/Greco" },
] as const

/** Where the site navigation ends on screen: 0 once it has scrolled away. */
function siteNavHeight(): number {
  const nav = document.querySelector<HTMLElement>('nav[aria-label="Main navigation"]')
  return nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0
}

export function UnifiedProfileMobileNav({
  className,
}: {
  className?: string
  /** Kept for callers; the Wins link shows whenever that section is on the page. */
  showQualityWins?: boolean
}) {
  // Only sections that are actually on the page: a folkstyle-only wrestler has no Freestyle/Greco
  // section, and a link to nothing is worse than no link.
  const [present, setPresent] = useState<ReadonlySet<string> | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [top, setTop] = useState(0)
  const [pinned, setPinned] = useState(false)
  const anchor = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLElement>(null)
  // The bar wraps to two rows on a phone; the placeholder holds its real height while pinned.
  const [barHeight, setBarHeight] = useState(0)

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

  useEffect(() => {
    const measure = () => {
      if (bar.current && !bar.current.classList.contains("fixed")) setBarHeight(bar.current.offsetHeight)
      const line = siteNavHeight()
      setTop(line)
      setPinned(Boolean(anchor.current && anchor.current.getBoundingClientRect().top < line))
    }
    measure()
    document.addEventListener("scroll", measure, { passive: true, capture: true })
    window.addEventListener("resize", measure)
    return () => {
      document.removeEventListener("scroll", measure, { capture: true })
      window.removeEventListener("resize", measure)
    }
  }, [])

  // The section being read: the last one whose top has passed under the bars.
  useEffect(() => {
    const onScroll = () => {
      // Read from just under the bar, whatever its height (two rows on a phone).
      const line = Math.max(siteNavHeight(), bar.current?.getBoundingClientRect().bottom ?? 0) + 24
      let current: string | null = null
      for (const { sectionId } of NAV_LINKS) {
        const el = document.getElementById(sectionId)
        if (el && el.offsetParent && el.getBoundingClientRect().top <= line) current = sectionId
      }
      setActive(current)
    }
    onScroll()
    // Capture, on the document: catches the page scrolling whichever element does the scrolling.
    document.addEventListener("scroll", onScroll, { passive: true, capture: true })
    return () => document.removeEventListener("scroll", onScroll, { capture: true })
  }, [present])

  const jump = (event: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (!el) return
    event.preventDefault()
    const bars = siteNavHeight() + (bar.current?.offsetHeight ?? 60) + 16
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - bars, behavior: "smooth" })
    history.replaceState(null, "", `#${sectionId}`)
  }

  const navLinks = NAV_LINKS.filter((l) => !present || present.has(l.sectionId))
  if (present && navLinks.length < 2) return null

  const links = (
    // Wraps on a phone: a scrolling row cut "Season", "School" and "Freestyle/Greco" off at the edge.
    <div className="flex flex-wrap justify-center gap-x-0.5 lg:flex-nowrap lg:justify-start lg:gap-1">
      {navLinks.map(({ sectionId, label }) => (
        // The link is the 44px touch target the site requires on phones; the pill is the span
        // inside it, so the highlight stays a pill instead of stretching into a tall oval.
        <a
          key={sectionId}
          href={`#${sectionId}`}
          onClick={(e) => jump(e, sectionId)}
          aria-current={active === sectionId ? "true" : undefined}
          className="group inline-flex shrink-0 items-center justify-center"
        >
          <span
            className={cn(
              "rounded-full px-2.5 py-1.5 text-xs font-semibold leading-none transition-colors lg:px-3.5",
              active === sectionId ? "bg-[#D3B574] text-[#0A1628]" : "text-white/70 group-hover:bg-white/10 group-hover:text-white",
            )}
          >
            {label}
          </span>
        </a>
      ))}
    </div>
  )

  return (
    // The placeholder keeps its height while the bar is pinned, so the page does not jump.
    <div ref={anchor} className={cn("min-h-[44px]", className)} style={pinned && barHeight ? { minHeight: barHeight } : undefined}>
      <nav
        ref={bar}
        aria-label="Profile sections"
        style={pinned ? { top } : undefined}
        className={cn(
          "z-30 border-white/10 bg-[#0A1628]/90 py-2 backdrop-blur-md",
          pinned
            ? "fixed inset-x-0 border-b px-4 shadow-lg shadow-black/30"
            : "-mx-4 border-b px-4 lg:mx-0 lg:rounded-full lg:border lg:px-2",
        )}
      >
        <div className={cn(pinned && "container mx-auto px-0 lg:px-4")}>{links}</div>
      </nav>
    </div>
  )
}
