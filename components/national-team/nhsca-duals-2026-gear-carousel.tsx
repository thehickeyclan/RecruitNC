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
    <div className={cn("space-y-2", className)}>
      <div className="relative max-w-[240px] mx-auto">
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
                className="w-full shrink-0 snap-center snap-always flex justify-center px-7"
              >
                <div className="relative w-[130px] sm:w-[150px] h-[175px] sm:h-[195px]">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    className={cn(
                      "object-contain object-center",
                      localBlackBg
                        ? "mix-blend-screen"
                        : "drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
                    )}
                    sizes="150px"
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
          className="absolute -left-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-[#002147]/90 text-white disabled:opacity-30"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollToIndex(active + 1)}
          disabled={active >= count - 1}
          className="absolute -right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-[#002147]/90 text-white disabled:opacity-30"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="text-center text-xs text-white/75">{current?.label}</p>
    </div>
  )
}
