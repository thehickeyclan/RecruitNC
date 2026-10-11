"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ChevronDown, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * One row of the profile: an icon, a title and a line of real data, opening in place.
 *
 * The iPhone app's profile is a header and a short list of these (Matt's mock, 8 October 2026),
 * and the website's was fourteen full-width cards stacked 6,000 pixels deep. A coach reads the
 * line and opens only what he came for. The row is the header; the section it opens is rendered
 * beside it in the page's column and shown or hidden by the same key (components/athlete-detail).
 */
export function ProfileRow({
  icon: Icon,
  title,
  summary,
  locked = false,
  open,
  onToggle,
  controls,
  className,
}: {
  icon: LucideIcon
  title: string
  /** What is inside, said in one line: "NHSCA Nationals Champion '26 · Fargo 7th '26". */
  summary: ReactNode
  /** The viewer cannot see this section's detail; the row says who can. */
  locked?: boolean
  open: boolean
  onToggle: () => void
  /** The id of the section this row opens, for assistive technology. */
  controls?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className={cn(
        "group flex w-full items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 text-left shadow-sm transition-colors hover:border-[#D3B574]/60 lg:px-6 lg:py-4",
        open && "border-[#D3B574]/60",
        className,
      )}
    >
      <Icon className="h-6 w-6 shrink-0 text-[#D3B574]" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-foreground lg:text-lg">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{summary}</span>
      </span>
      {locked ? (
        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : (
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground", open && "rotate-180")} aria-hidden />
      )}
    </button>
  )
}
