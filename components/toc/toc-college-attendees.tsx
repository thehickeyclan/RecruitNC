import Image from "next/image"
import { tocDisplayClass } from "@/components/toc/toc-theme"
import type { TocConfirmedCollege } from "@/lib/toc/confirmed-colleges"

type Props = {
  colleges: TocConfirmedCollege[]
  /** `section` — recruiting block on landing. `hero` — compact strip on confirm page. */
  variant?: "section" | "hero"
}

function TocCollegeLogoGrid({
  colleges,
  compact,
}: {
  colleges: TocConfirmedCollege[]
  compact: boolean
}) {
  return (
    <ul
      className={`grid list-none p-0 m-0 ${
        compact
          ? "mt-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3"
          : "mt-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5"
      }`}
    >
      {colleges.map((college) => (
        <li key={college.name}>
          <div
            className={`flex h-full flex-col items-center justify-center rounded-sm bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-black/5 ${
              compact ? "px-2.5 py-3 sm:px-3 sm:py-4" : "px-4 py-6"
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
        </li>
      ))}
    </ul>
  )
}

/** Static, confirmed-only college strip — no ticker until the field is large enough to warrant it. */
export function TocCollegeAttendees({ colleges, variant = "section" }: Props) {
  if (colleges.length === 0) return null

  if (variant === "hero") {
    return (
      <div className="mt-8 pt-8 border-t border-white/12 max-w-2xl">
        <p className="text-[#CC0000] text-[10px] sm:text-xs tracking-[0.18em] uppercase font-semibold">
          College programs confirmed on site
        </p>
        <p className="mt-1.5 text-sm text-white/60">
          Coaches and staff from these programs will be in the building — lock in your spot and compete where they&apos;re
          watching.
        </p>
        <TocCollegeLogoGrid colleges={colleges} compact />
      </div>
    )
  }

  return (
    <div className="mt-12 pt-10 border-t border-white/12">
      <h3 className={`text-2xl md:text-3xl text-white ${tocDisplayClass()}`}>
        College programs attending
      </h3>
      <p className="mt-2 text-sm text-white/60 max-w-xl">
        These programs are confirmed for attendance at the Tournament of Champions — coaches and staff on site
        Saturday.
      </p>
      <TocCollegeLogoGrid colleges={colleges} compact={false} />
    </div>
  )
}
