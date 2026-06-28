import type { ReactNode } from "react"
import { cn, scrollTableXClass } from "@/lib/utils"
import { PROFILE_SCROLL_TABLE_ATTR } from "@/lib/profile-table-scroll"

type ProfileScrollTableProps = {
  /** Minimum table width in px (content wider than viewport → horizontal swipe). */
  minWidthPx: number
  borderClassName?: string
  className?: string
  children: ReactNode
}

/**
 * Single scroll container for wide profile tables. Use this instead of shadcn Table on public profiles.
 */
export function ProfileScrollTable({
  minWidthPx,
  borderClassName,
  className,
  children,
}: ProfileScrollTableProps) {
  return (
    <div
      {...{ [PROFILE_SCROLL_TABLE_ATTR]: "" }}
      className={cn(scrollTableXClass, "profile-scroll-table rounded-lg border", borderClassName, className)}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <table className="w-full caption-bottom text-sm" style={{ minWidth: minWidthPx }}>
        {children}
      </table>
    </div>
  )
}
