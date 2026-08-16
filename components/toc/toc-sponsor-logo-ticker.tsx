"use client"

import Image from "next/image"
import { TOC_FOUNDING_PARTNERS } from "@/lib/toc/constants"

type TocSponsor = (typeof TOC_FOUNDING_PARTNERS.partners)[number]

function TocSponsorLogoCard({
  sponsor,
  duplicate = false,
}: {
  sponsor: TocSponsor
  duplicate?: boolean
}) {
  const isDark = sponsor.logoTheme === "dark"

  return (
    <a
      href={sponsor.href ?? undefined}
      target={sponsor.href ? "_blank" : undefined}
      rel={sponsor.href ? "noopener noreferrer" : undefined}
      tabIndex={duplicate ? -1 : undefined}
      aria-hidden={duplicate ? true : undefined}
      className={`flex h-[112px] w-[154px] shrink-0 flex-col items-center justify-center rounded-sm px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.2)] ring-1 transition-transform hover:-translate-y-0.5 sm:w-[174px] ${
        isDark
          ? "bg-[#060f1f] ring-white/10"
          : "bg-white ring-black/5"
      }`}
    >
      <div className="relative h-14 w-full">
        <Image
          src={sponsor.logoUrl}
          alt={duplicate ? "" : `${sponsor.name} logo`}
          fill
          className="object-contain"
          sizes="174px"
        />
      </div>
      <span
        className={`mt-2 text-center text-[9px] font-semibold uppercase leading-snug tracking-[0.12em] ${
          isDark ? "text-white/65" : "text-[#0B1D3A]/65"
        }`}
      >
        {sponsor.name}
      </span>
    </a>
  )
}

/** Compact, continuously scrolling recognition for official TOC partners. */
export function TocSponsorLogoTicker({ className = "" }: { className?: string }) {
  const sponsors = TOC_FOUNDING_PARTNERS.partners
  // Four sponsor sets make each half of the track wider than the hero at desktop sizes.
  const cycle = Array.from({ length: 4 }, () => sponsors).flat()
  const displaySponsors = [...cycle, ...cycle]

  return (
    <div className={`relative overflow-hidden ${className}`} aria-label="Official Tournament of Champions partners">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#0B1D3A] to-transparent sm:w-12"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#0B1D3A] to-transparent sm:w-12"
        aria-hidden
      />

      <div className="toc-sponsor-ticker-viewport py-1">
        <div className="toc-sponsor-ticker-track flex w-max items-stretch gap-3 sm:gap-4">
          {displaySponsors.map((sponsor, index) => (
            <TocSponsorLogoCard
              key={`${sponsor.name}-${index}`}
              sponsor={sponsor}
              duplicate={index >= sponsors.length}
            />
          ))}
        </div>
      </div>

      <ul className="toc-sponsor-ticker-static m-0 list-none gap-3 p-0 sm:gap-4">
        {sponsors.map((sponsor) => (
          <li key={sponsor.name} className="flex justify-center">
            <TocSponsorLogoCard sponsor={sponsor} />
          </li>
        ))}
      </ul>

      <style jsx>{`
        .toc-sponsor-ticker-viewport {
          display: block;
        }

        .toc-sponsor-ticker-static {
          display: none;
        }

        .toc-sponsor-ticker-track {
          animation: toc-sponsor-scroll 48s linear infinite;
        }

        .toc-sponsor-ticker-viewport:hover .toc-sponsor-ticker-track {
          animation-play-state: paused;
        }

        @keyframes toc-sponsor-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .toc-sponsor-ticker-viewport {
            display: none;
          }

          .toc-sponsor-ticker-static {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          @media (min-width: 640px) {
            .toc-sponsor-ticker-static {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
        }
      `}</style>
    </div>
  )
}
