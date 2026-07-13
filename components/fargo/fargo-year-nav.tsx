import { HardLink } from "@/components/hard-link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  FARGO_ARCHIVE_YEARS,
  FARGO_CURRENT_YEAR,
  fargoYearHref,
  type FargoArchiveYear,
} from "@/lib/fargo-archive"

export function FargoYearNav({
  activeYear,
  className,
}: {
  activeYear: FargoArchiveYear
  className?: string
}) {
  return (
    <nav className={cn("flex flex-wrap items-center justify-center gap-2", className)} aria-label="Fargo years">
      {FARGO_ARCHIVE_YEARS.map((year) => {
        const isActive = year === activeYear
        const isCurrent = year === FARGO_CURRENT_YEAR
        return (
          <HardLink
            key={year}
            href={fargoYearHref(year)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "bg-[#002147] text-white shadow-md"
                : "border border-[#002147]/20 bg-white text-[#002147] hover:bg-[#002147]/5",
            )}
          >
            {year}
            {isCurrent && !isActive ? (
              <Badge className="bg-[#B31B1B] text-white text-[10px] px-1.5 py-0 hover:bg-[#B31B1B]">Latest</Badge>
            ) : null}
          </HardLink>
        )
      })}
    </nav>
  )
}

export function FargoHistoricalLinks({ className }: { className?: string }) {
  const years = FARGO_ARCHIVE_YEARS.filter((y) => y !== FARGO_CURRENT_YEAR)
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-3", className)}>
      <span className="text-sm font-medium text-white/80">Previous years:</span>
      {years.map((year) => (
        <HardLink
          key={year}
          href={fargoYearHref(year)}
          className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
        >
          {year} Results
        </HardLink>
      ))}
    </div>
  )
}
