import { TocCollegeLogoTicker } from "@/components/toc/toc-college-logo-ticker"
import { tocDisplayClass } from "@/components/toc/toc-theme"
import type { TocConfirmedCollege } from "@/lib/toc/confirmed-colleges"

type Props = {
  colleges: TocConfirmedCollege[]
  /** `banner` — top of landing hero. `section` — recruiting block. `hero` — confirm page. */
  variant?: "banner" | "section" | "hero"
}

/** Confirmed-only college logos in a scrolling ticker (static grid when reduced motion is preferred). */
export function TocCollegeAttendees({ colleges, variant = "section" }: Props) {
  if (colleges.length === 0) return null

  if (variant === "banner") {
    return (
      <div id="colleges" className="scroll-mt-20 pt-8 sm:pt-10 border-t border-white/12">
        <p className="text-[#CC0000] text-[10px] sm:text-xs tracking-[0.18em] uppercase font-semibold">
          College programs confirmed on site
        </p>
        <p className="mt-1.5 text-sm text-white/60 max-w-2xl">
          Coaches and staff from these programs will be in the building Saturday — compete where they&apos;re watching.
        </p>
        <TocCollegeLogoTicker colleges={colleges} compact className="mt-5" />
      </div>
    )
  }

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
        <TocCollegeLogoTicker colleges={colleges} compact className="mt-5" />
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
      <TocCollegeLogoTicker colleges={colleges} compact={false} className="mt-8" />
    </div>
  )
}
