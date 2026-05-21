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

/** Gear browser — swipe or arrows (Payments checkout). */
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
    <div className={cn("space-y-3", className)}>
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
                className="w-full shrink-0 snap-center snap-always flex justify-center px-10"
              >
                <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[3/4]">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    className={cn(
                      "object-contain",
                      localBlackBg
                        ? "mix-blend-screen"
                        : "drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                    )}
                    sizes="320px"
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
          className="absolute left-0 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-[#002147]/90 text-white disabled:opacity-30"
          aria-label="Previous"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollToIndex(active + 1)}
          disabled={active >= count - 1}
          className="absolute right-0 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-[#002147]/90 text-white disabled:opacity-30"
          aria-label="Next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <p className="text-center text-sm font-semibold text-white/90">{current?.label}</p>
    </div>
  )
}
