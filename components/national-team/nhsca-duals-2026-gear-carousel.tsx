"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  NHSCA_DUALS_2026_ALL_GEAR_PHOTOS,
  isLocalNhscaGearSrc,
  type NhscaGearPhoto,
} from "@/lib/nhsca-duals-2026-gear-images"
import { cn } from "@/lib/utils"

type NhscaDuals2026GearCarouselProps = {
  photos?: NhscaGearPhoto[]
  className?: string
}

/** Premium gear stage — Payments checkout (kids / families first look). */
export function NhscaDuals2026GearCarousel({
  photos = NHSCA_DUALS_2026_ALL_GEAR_PHOTOS,
  className,
}: NhscaDuals2026GearCarouselProps) {
  const [active, setActive] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const count = photos.length
  const current = photos[active]

  const scrollToIndex = useCallback(
    (index: number) => {
      const i = Math.max(0, Math.min(index, count - 1))
      setActive(i)
      const track = trackRef.current
      if (!track) return
      const slide = track.children[i] as HTMLElement | undefined
      slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    },
    [count]
  )

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
    <div className={cn("space-y-4", className)}>
      {/* Hero stage */}
      <div className="relative">
        <div
          ref={trackRef}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none"
          aria-live="polite"
        >
          {photos.map((photo) => {
            const localBlackBg = isLocalNhscaGearSrc(photo.src)
            return (
              <figure
                key={photo.id}
                className="w-full shrink-0 snap-center snap-always flex flex-col items-center px-8 sm:px-12"
              >
                <div
                  className={cn(
                    "relative w-full max-w-[300px] sm:max-w-[340px] md:max-w-[380px] aspect-[3/4]",
                    "rounded-2xl overflow-hidden",
                    "bg-[radial-gradient(ellipse_at_50%_38%,rgba(203,175,93,0.22)_0%,rgba(255,255,255,0.07)_42%,transparent_72%)]",
                    "ring-1 ring-[#CBAF5D]/35",
                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_48px_rgba(0,0,0,0.55)]"
                  )}
                >
                  {/* Floor glow */}
                  <div
                    className="pointer-events-none absolute inset-x-[12%] bottom-[6%] h-[14%] rounded-full bg-[#CBAF5D]/20 blur-2xl"
                    aria-hidden
                  />
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    className={cn(
                      "object-contain p-3 sm:p-4",
                      localBlackBg
                        ? "mix-blend-screen scale-[1.02]"
                        : "drop-shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
                    )}
                    sizes="(max-width: 640px) 300px, 380px"
                    draggable={false}
                    priority={photo.id === "blue-front"}
                  />
                </div>
              </figure>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollToIndex(active - 1)}
          disabled={active <= 0}
          className="absolute left-0 top-[42%] -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#002147]/95 text-white shadow-xl ring-1 ring-[#CBAF5D]/40 disabled:opacity-25 hover:bg-[#003366] hover:ring-[#CBAF5D]/60 transition-colors"
          aria-label="Previous product"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollToIndex(active + 1)}
          disabled={active >= count - 1}
          className="absolute right-0 top-[42%] -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#002147]/95 text-white shadow-xl ring-1 ring-[#CBAF5D]/40 disabled:opacity-25 hover:bg-[#003366] hover:ring-[#CBAF5D]/60 transition-colors"
          aria-label="Next product"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Active product title */}
      <div className="text-center px-2">
        <p className="text-base sm:text-lg font-bold text-white tracking-tight">{current?.label}</p>
        <p className="mt-1 text-[11px] sm:text-xs text-[#CBAF5D]/80 uppercase tracking-[0.14em]">
          NC United · NHSCA Duals 2026
        </p>
      </div>

      {/* Product picker — horizontal chips */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory -mx-1 px-1"
        role="tablist"
        aria-label="Browse team gear"
      >
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => scrollToIndex(i)}
            className={cn(
              "shrink-0 snap-start rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-semibold transition-all",
              i === active
                ? "bg-[#CBAF5D] text-[#002147] shadow-md shadow-[#CBAF5D]/25"
                : "bg-white/10 text-white/65 hover:bg-white/15 hover:text-white ring-1 ring-white/10"
            )}
          >
            {photo.label}
          </button>
        ))}
      </div>

      {/* Dot progress */}
      <div className="flex justify-center gap-1.5">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => scrollToIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === active ? "w-5 bg-[#CBAF5D]" : "w-1.5 bg-white/25 hover:bg-white/40"
            )}
            aria-label={`View ${photo.label}`}
          />
        ))}
      </div>
    </div>
  )
}
