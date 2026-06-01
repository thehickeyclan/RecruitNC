"use client"

import type { ReactNode } from "react"
import { NewsImageSlot } from "@/components/news/news-image-slot"

/** Full-width program / facility shot — stacked on all breakpoints. */
export function RecruitingAwardsProgramFigure({
  src,
  alt,
  caption,
  contain = false,
}: {
  src: string
  alt: string
  caption: string
  /** Branded wide graphics (e.g. Lynchburg) — show full art without cropping. */
  contain?: boolean
}) {
  return (
    <figure className="not-prose my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
      <div
        className={`relative w-full min-h-[200px] ${
          contain ? "aspect-[21/9] md:aspect-[2.4/1]" : "aspect-[16/10] md:max-h-[360px] md:aspect-auto md:h-[320px]"
        }`}
      >
        <NewsImageSlot
          src={src}
          alt={alt}
          width={1200}
          height={contain ? 500 : 750}
          fill
          sizes="(max-width: 768px) 100vw, 48rem"
          className={contain ? "object-contain object-center p-1 sm:p-2" : "object-cover object-center"}
          label={caption}
        />
      </div>
      <figcaption className="border-t border-slate-200 bg-white px-3 py-2 text-center text-sm text-slate-600">
        {caption}
      </figcaption>
    </figure>
  )
}

/** Portrait athlete photo — full width on mobile; floats beside copy on md+. */
export function RecruitingAwardsAthletePortraitFigure({
  src,
  alt,
  caption,
  align = "right",
}: {
  src: string
  alt: string
  caption: string
  align?: "left" | "right"
}) {
  const floatClass = align === "right" ? "md:float-right md:ml-6" : "md:float-left md:mr-6"

  return (
    <figure
      className={`not-prose my-4 w-full max-w-[min(100%,20rem)] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm md:my-1 md:max-w-[240px] lg:max-w-[280px] ${floatClass}`}
    >
      <div className="relative aspect-[3/4] w-full">
        <NewsImageSlot
          src={src}
          alt={alt}
          width={900}
          height={1200}
          fill
          sizes="(max-width: 768px) 100vw, 280px"
          className="object-cover object-center"
          label={caption}
        />
      </div>
      <figcaption className="border-t border-slate-200 bg-white px-2 py-1.5 text-center text-xs text-slate-600 sm:text-sm">
        {caption}
      </figcaption>
    </figure>
  )
}

/** Landscape athlete / signing photo — floats beside copy on md+. */
export function RecruitingAwardsAthleteLandscapeFigure({
  src,
  alt,
  caption,
  align = "right",
}: {
  src: string
  alt: string
  caption: string
  align?: "left" | "right"
}) {
  const floatClass = align === "right" ? "md:float-right md:ml-6" : "md:float-left md:mr-6"

  return (
    <figure
      className={`not-prose my-4 w-full max-w-[min(100%,24rem)] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm md:my-1 md:max-w-[300px] lg:max-w-[340px] ${floatClass}`}
    >
      <div className="relative aspect-[16/10] w-full">
        <NewsImageSlot
          src={src}
          alt={alt}
          width={1200}
          height={750}
          fill
          sizes="(max-width: 768px) 100vw, 340px"
          className="object-cover object-center"
          label={caption}
        />
      </div>
      <figcaption className="border-t border-slate-200 bg-white px-2 py-1.5 text-center text-xs text-slate-600 sm:text-sm">
        {caption}
      </figcaption>
    </figure>
  )
}

/** Wraps prose so floated figures clear correctly after the block. */
export function RecruitingAwardsFloatSection({ children }: { children: ReactNode }) {
  return <div className="not-prose text-slate-700 md:flow-root [&_p]:my-3">{children}</div>
}
