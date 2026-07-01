"use client"

import Image from "next/image"
import type { TocConfirmedCollege } from "@/lib/toc/confirmed-colleges"

type Props = {
  colleges: TocConfirmedCollege[]
  compact?: boolean
  className?: string
}

function TocCollegeLogoCard({
  college,
  compact,
}: {
  college: TocConfirmedCollege
  compact: boolean
}) {
  return (
    <div
      className={`flex h-full flex-col items-center justify-center rounded-sm bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-black/5 ${
        compact ? "px-2.5 py-3 sm:px-3 sm:py-4 w-[108px] sm:w-[120px]" : "px-4 py-6 w-[140px] sm:w-[160px]"
      }`}
    >
      <div className={`relative w-full ${compact ? "h-10 max-w-[96px]" : "h-14 max-w-[140px]"}`}>
        <Image
          src={college.logoUrl}
          alt={`${college.name} logo`}
          fill
          className="object-contain"
          sizes={compact ? "96px" : "140px"}
          unoptimized
        />
      </div>
      <span
        className={`mt-2 text-center font-medium uppercase tracking-[0.12em] text-[#0B1D3A]/65 leading-snug ${
          compact ? "text-[9px] sm:text-[10px]" : "text-[11px]"
        }`}
      >
        {college.name}
      </span>
    </div>
  )
}

/** Infinite horizontal scroll of confirmed college logos — pauses on hover. */
export function TocCollegeLogoTicker({ colleges, compact = true, className = "" }: Props) {
  const displayColleges = [...colleges, ...colleges]

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      aria-label="Confirmed college programs attending"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 sm:w-12 bg-gradient-to-r from-[#0B1D3A] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 sm:w-12 bg-gradient-to-l from-[#0B1D3A] to-transparent"
        aria-hidden
      />

      <div className="toc-college-ticker-viewport py-1">
        <div className="toc-college-ticker-track flex w-max items-stretch gap-3 sm:gap-4">
          {displayColleges.map((college, index) => (
            <div
              key={`${college.name}-${index}`}
              className="shrink-0"
              aria-hidden={index >= colleges.length ? true : undefined}
            >
              <TocCollegeLogoCard college={college} compact={compact} />
            </div>
          ))}
        </div>
      </div>

      <ul className="toc-college-ticker-static mt-0 grid list-none p-0 m-0 gap-3 sm:gap-4">
        {colleges.map((college) => (
          <li key={college.name}>
            <TocCollegeLogoCard college={college} compact={compact} />
          </li>
        ))}
      </ul>

      <style jsx>{`
        .toc-college-ticker-viewport {
          display: block;
        }

        .toc-college-ticker-static {
          display: none;
        }

        .toc-college-ticker-track {
          animation: toc-college-scroll 45s linear infinite;
        }

        .toc-college-ticker-viewport:hover .toc-college-ticker-track {
          animation-play-state: paused;
        }

        @keyframes toc-college-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .toc-college-ticker-viewport {
            display: none;
          }

          .toc-college-ticker-static {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          @media (min-width: 640px) {
            .toc-college-ticker-static {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          @media (min-width: 768px) {
            .toc-college-ticker-static {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }
          }

          @media (min-width: 1024px) {
            .toc-college-ticker-static {
              grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            }
          }
        }
      `}</style>
    </div>
  )
}
