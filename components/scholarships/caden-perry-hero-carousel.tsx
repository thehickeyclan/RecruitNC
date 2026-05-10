"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { CADEN_PERRY_GALLERY_ITEMS, type CadenGallerySlide } from "@/lib/scholarships/caden-perry-gallery-images"
import { cn } from "@/lib/utils"

const AUTO_ADVANCE_MS = 5500

type Slide = CadenGallerySlide & { remote?: boolean }

function buildSlides(heroImageUrl: string | null | undefined): Slide[] {
  const trimmed = typeof heroImageUrl === "string" ? heroImageUrl.trim() : ""
  if (!trimmed) return [...CADEN_PERRY_GALLERY_ITEMS]
  return [{ src: trimmed, alt: "Caden Perry Scholarship — hero image", remote: true }, ...CADEN_PERRY_GALLERY_ITEMS]
}

function SlidePicture({ slide, priority }: { slide: Slide; priority?: boolean }) {
  if (slide.remote) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- CMS hero URLs may be off-domain
      <img src={slide.src} alt={slide.alt} className="h-full w-full object-cover object-[center_25%]" loading={priority ? "eager" : "lazy"} />
    )
  }
  return (
    <Image src={slide.src} alt={slide.alt} fill className="object-cover object-[center_28%]" sizes="100vw" priority={priority} />
  )
}

export function CadenPerryHeroCarousel({ heroImageUrl }: { heroImageUrl?: string | null }) {
  const slides = buildSlides(heroImageUrl)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => (i + dir + slides.length) % slides.length)
    },
    [slides.length],
  )

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mq.matches) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTO_ADVANCE_MS)
    return () => window.clearInterval(id)
  }, [paused, slides.length])

  return (
    <div
      className="relative h-full min-h-[220px] w-full overflow-hidden bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={`${slide.src}-${i}`}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out",
            i === index ? "pointer-events-auto z-[1] opacity-100" : "pointer-events-none z-0 opacity-0",
          )}
          aria-hidden={i !== index}
        >
          <SlidePicture slide={slide} priority={i === 0} />
        </div>
      ))}
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-[#061224] via-[#061224]/45 to-transparent" />

      {slides.length > 1 ? (
        <>
          <div className="pointer-events-auto absolute bottom-16 left-0 right-0 z-[4] flex justify-center gap-2 px-4">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show photo ${i + 1} of ${slides.length}`}
                aria-current={i === index}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A94A]",
                  i === index ? "w-8 bg-[#C8A94A]" : "w-2 bg-white/35 hover:bg-white/55",
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <div className="pointer-events-auto absolute bottom-4 right-4 z-[4] flex gap-2">
            <button
              type="button"
              className="rounded-md border border-white/25 bg-black/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C8A94A]"
              onClick={() => go(-1)}
              aria-label="Previous photo"
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-md border border-white/25 bg-black/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C8A94A]"
              onClick={() => go(1)}
              aria-label="Next photo"
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
