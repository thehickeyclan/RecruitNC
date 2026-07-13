"use client"

import { useEffect, useState } from "react"
import { List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { TOC_SECTION_NAV_GROUPS, TOC_SECTION_NAV_QUICK } from "@/lib/toc/constants"
import { cn } from "@/lib/utils"

type Props = {
  /** When false, the bar stays hidden (hero still in view). */
  show: boolean
}

function NavPill({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-[#0B1D3A]/15 bg-white px-3.5 py-1.5 text-sm font-medium text-[#0B1D3A] hover:border-[#CC0000]/40 hover:text-[#CC0000] transition-colors",
        className,
      )}
    >
      {label}
    </a>
  )
}

export function TocSectionNav({ show }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    if (!sheetOpen) return
    const onHashChange = () => setSheetOpen(false)
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [sheetOpen])

  return (
    <nav
      aria-label="Tournament sections"
      className={cn(
        "sticky top-16 z-40 border-b border-[#0B1D3A]/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 transition-all duration-200",
        show ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none",
      )}
    >
      <div className="container mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-2.5">
          <span className="hidden shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-[#0B1D3A]/45 lg:inline">
            Jump to
          </span>
          <div className="flex items-center gap-2 sm:hidden">
            {TOC_SECTION_NAV_QUICK.map(({ href, label }) => (
              <NavPill key={href} href={href} label={label} />
            ))}
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            {TOC_SECTION_NAV_GROUPS.flatMap((group) =>
              group.links.map(({ href, label }) => <NavPill key={href} href={href} label={label} />),
            )}
          </div>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-[#0B1D3A]/20 text-[#0B1D3A] sm:hidden"
            >
              <List className="mr-1.5 h-4 w-4" aria-hidden />
              Sections
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl px-4 pb-8">
            <SheetHeader className="text-left">
              <SheetTitle className="text-[#0B1D3A]">Tournament sections</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-6">
              {TOC_SECTION_NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0B1D3A]/50">
                    {group.label}
                  </p>
                  <ul className="space-y-1">
                    {group.links.map(({ href, label }) => (
                      <li key={href}>
                        <a
                          href={href}
                          onClick={() => setSheetOpen(false)}
                          className="flex min-h-11 items-center rounded-md px-3 text-base font-medium text-[#0B1D3A] hover:bg-[#0B1D3A]/5"
                        >
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}

/** Place after hero; when it scrolls out of view, sticky nav appears. */
export function TocSectionNavSentinel() {
  const [showNav, setShowNav] = useState(false)

  useEffect(() => {
    const el = document.getElementById("toc-section-nav-sentinel")
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setShowNav(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div id="toc-section-nav-sentinel" className="h-px w-full" aria-hidden />
      <TocSectionNav show={showNav} />
    </>
  )
}
