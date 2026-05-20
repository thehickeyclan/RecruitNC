"use client"

import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function HorizontalScrollRow({
  children,
  className,
  hint = "Swipe sideways for more",
  showHint = true,
  edgeClassName = "from-[#0a2040]",
}: {
  children: ReactNode
  className?: string
  hint?: string
  showHint?: boolean
  edgeClassName?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)
  const [atEnd, setAtEnd] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => {
      const scrollable = el.scrollWidth > el.clientWidth + 4
      setCanScroll(scrollable)
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8)
    }
    check()
    el.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", check)
      ro.disconnect()
    }
  }, [children])

  return (
    <div>
      {showHint && canScroll && !atEnd ? (
        <p className="text-[10px] text-white/45 mb-1.5 flex items-center gap-0.5 px-0.5 sm:hidden">
          {hint}
          <ChevronRight className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        </p>
      ) : null}
      <div className="relative">
        <div
          ref={ref}
          className={cn(
            "flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-none scroll-smooth snap-x snap-proximity",
            className
          )}
        >
          {children}
        </div>
        {canScroll && !atEnd ? (
          <div
            className={cn(
              "pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l to-transparent sm:hidden",
              edgeClassName
            )}
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  )
}
