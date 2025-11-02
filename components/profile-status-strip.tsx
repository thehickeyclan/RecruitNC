"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"

/**
 * Optional slim strip that you can place near the profile header.
 * It avoids any "claim" wording and focuses on verification state only.
 */
export default function ProfileStatusStrip({
  confirmed = false,
  className,
}: {
  confirmed?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "w-full rounded-md px-3 py-2 text-xs md:text-sm",
        confirmed
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900"
          : "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900",
        "flex items-center gap-2",
        className,
      )}
      aria-live="polite"
      role="status"
    >
      {confirmed ? (
        <>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>{"This profile is verified by the community."}</span>
        </>
      ) : (
        <>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 15h-2v-2h2Zm0-4h-2V7h2Z" />
          </svg>
          <span>{"This profile hasn't been verified yet."}</span>
        </>
      )}
    </div>
  )
}
