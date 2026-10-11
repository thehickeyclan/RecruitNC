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
        // The app's row: surface card, hairline border, 60px tall, gold icon.
        "group flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-[#1a3a5f] bg-[#0f1c2e] px-3 py-2 text-left transition-colors hover:border-[#D3B574]/60",
        open && "rounded-b-none",
        className,
      )}
    >
      <Icon className="h-5 w-5 shrink-0 text-[#D3B574]" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold leading-tight text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-[#A8BBD1]">{summary}</span>
      </span>
      {locked ? (
        <Lock className="h-4 w-4 shrink-0 text-[#6B829D]" aria-hidden />
      ) : (
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[#6B829D] transition-transform group-hover:text-white", open && "rotate-180")} aria-hidden />
      )}
    </button>
  )
}
