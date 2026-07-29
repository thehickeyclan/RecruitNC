"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { TOC_OFFICIAL_APPAREL } from "@/lib/toc/constants"

/**
 * Tee / crewneck carousel: arrows, swipe, dots, and keyboard.
 *
 * Slides whose artwork 404s are dropped on error rather than rendering a broken image, so a
 * piece can be listed in constants before its file lands (and the page self-heals the moment
 * it does — no deploy). If every slide fails, the section renders nothing.
 */
export function TocApparelCarousel() {
  const [index, setIndex] = useState(0)
  const [broken, setBroken] = useState<string[]>([])
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const slides = TOC_OFFICIAL_APPAREL.filter((s) => !broken.includes(s.id))
  if (slides.length === 0) return null

  // Guard against the active index dangling past the end when a slide drops out.
  const active = Math.min(index, slides.length - 1)
  const current = slides[active]!
  const go = (delta: number) => setIndex((active + delta + slides.length) % slides.length)

  /** ~40px of horizontal travel = a swipe; below that it's a tap or a vertical scroll. */
  const onTouchEnd = (endX: number) => {
    if (touchStartX === null) return
    const dx = endX - touchStartX
    setTouchStartX(null)
    if (Math.abs(dx) < 40) return
    go(dx < 0 ? 1 : -1)
  }

  return (
    <div
      className="relative"
      role="group"
      aria-roledescription="carousel"
      aria-label="Tournament of Champions apparel"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault()
          go(1)
        } else if (e.key === "ArrowLeft") {
          e.preventDefault()
          go(-1)
        }
      }}
    >
      <div
        className="relative overflow-hidden rounded-xl border border-white/15 bg-black/40"
        onTouchStart={(e) => setTouchStartX(e.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(e) => onTouchEnd(e.changedTouches[0]?.clientX ?? 0)}
      >
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          width={current.width}
          height={current.height}
          className="h-auto w-full object-contain"
          sizes="(min-width: 1024px) 54vw, 100vw"
          onError={() => setBroken((b) => (b.includes(current.id) ? b : [...b, current.id]))}
        />

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous item"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white backdrop-blur-sm transition-colors hover:bg-[#CC0000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:left-3 sm:p-2.5"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next item"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white backdrop-blur-sm transition-colors hover:bg-[#CC0000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:right-3 sm:p-2.5"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-[#0B1D3A]/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          {current.label}
        </span>
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${s.label}`}
              aria-current={i === active}
              className={
                i === active
                  ? "h-2 w-6 rounded-full bg-[#CC0000] transition-all"
                  : "h-2 w-2 rounded-full bg-white/30 transition-all hover:bg-white/60"
              }
            />
          ))}
        </div>
      )}

      <p className="mt-2 text-center text-xs text-white/45">
        {current.caption} · swipe or use the arrows
      </p>
    </div>
  )
}
