"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  NHSCA_DUALS_2026_ALL_GEAR_PHOTOS,
  type NhscaGearPhoto,
} from "@/lib/nhsca-duals-2026-gear-images"
import { cn } from "@/lib/utils"

type NhscaDuals2026GearCarouselProps = {
  photos?: NhscaGearPhoto[]
  className?: string
}

/** Compact gear browser — side nav + swipe/arrow slides (Payments checkout). */
export function NhscaDuals2026GearCarousel({
  photos = NHSCA_DUALS_2026_ALL_GEAR_PHOTOS,
  className,
}: NhscaDuals2026GearCarouselProps) {
  const [active, setActive] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const count = photos.length

  const scrollToIndex = useCallback((index: number) => {
    const i = Math.max(0, Math.min(index, count - 1))
    setActive(i)
    const track = trackRef.current
    if (!track) return
    const slide = track.children[i] as HTMLElement | undefined
    slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }, [count])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const onScroll = () => {
      const { scrollLeft, offsetWidth } = track
      if (offsetWidth <= 0) return
      const i = Math.round(scrollLeft / offsetWidth)
      setActive(Math.max(0, Math.min(i, count - 1)))
    }

    track.addEventListener("scroll", onScroll, { passive: true })
    return () => track.removeEventListener("scroll", onScroll)
  }, [count])

  return (
    <div className={cn("flex flex-col sm:flex-row gap-3 min-h-0", className)}>
      {/* Side nav — product picker */}
      <nav
        className="sm:w-[7.5rem] md:w-32 shrink-0 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-y-auto sm:max-h-[220px] scrollbar-none snap-x sm:snap-none pb-1 sm:pb-0"
        aria-label="Team gear products"
      >
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => scrollToIndex(i)}
            className={cn(
              "shrink-0 snap-start text-left rounded-lg px-2.5 py-2 text-[10px] sm:text-[11px] font-semibold leading-tight transition-colors min-h-[36px] sm:min-h-[40px]",
              i === active
                ? "bg-[#CBAF5D] text-[#002147]"
                : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
            )}
            aria-current={i === active ? "true" : undefined}
          >
            {photo.label}
          </button>
        ))}
      </nav>

      {/* Main slide + arrows */}
      <div className="relative flex-1 min-w-0">
        <p className="text-[10px] text-white/45 mb-1.5 sm:hidden">Swipe photos →</p>
        <div
          ref={trackRef}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none"
          aria-live="polite"
        >
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="w-full shrink-0 snap-center snap-always flex flex-col items-center px-10 sm:px-12 py-1"
            >
              <div className="relative w-full max-w-[220px] aspect-[3/4] flex items-center justify-center">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  className="object-contain p-2 drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                  sizes="220px"
                  draggable={false}
                />
              </div>
              <figcaption className="mt-2 text-center text-[11px] font-semibold text-white/85">
                {photo.label}
              </figcaption>
            </figure>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollToIndex(active - 1)}
          disabled={active <= 0}
          className="absolute left-0 top-[calc(50%-12px)] -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#002147]/90 text-white shadow-lg ring-1 ring-white/20 disabled:opacity-30 hover:bg-[#002147]"
          aria-label="Previous product"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollToIndex(active + 1)}
          disabled={active >= count - 1}
          className="absolute right-0 top-[calc(50%-12px)] -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#002147]/90 text-white shadow-lg ring-1 ring-white/20 disabled:opacity-30 hover:bg-[#002147]"
          aria-label="Next product"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <p className="mt-2 text-center text-[10px] text-white/40 tabular-nums">
          {active + 1} / {count}
        </p>
      </div>
    </div>
  )
}
