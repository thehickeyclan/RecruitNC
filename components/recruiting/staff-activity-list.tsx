import Link from "next/link"
import { ArrowRightLeft, FileCheck2, MessageSquare, Phone, Star, StarOff, type LucideIcon } from "lucide-react"
import type { StaffActivityItem } from "@/lib/recruiting/staff-activity"
import { cn } from "@/lib/utils"

const ICON: Record<StaffActivityItem["kind"], LucideIcon> = {
  added: Star,
  removed: StarOff,
  stage: ArrowRightLeft,
  applied: FileCheck2,
  contact: Phone,
  message: MessageSquare,
  reply: MessageSquare,
}

/** "Today 2:14 PM", "Oct 3", or with the year once it is not this one. */
function when(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const now = new Date()
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
  const day = (x: Date) => x.toLocaleDateString("en-US", { timeZone: "America/New_York" })
  if (day(d) === day(now)) return `Today ${time}`
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
    timeZone: "America/New_York",
  })
}

/** Who did what on the staff's board, newest first (lib/recruiting/staff-activity.ts). */
export function StaffActivityList({ items, className }: { items: StaffActivityItem[]; className?: string }) {
  return (
    <ul className={cn("divide-y divide-white/5", className)}>
      {items.map((item) => {
        const Icon = ICON[item.kind] ?? Star
        const [before, after] = item.text.split(item.athleteName)
        return (
          <li key={item.id} className="flex items-start gap-3 py-2.5 text-sm">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#D3B574]" aria-hidden />
            <p className="min-w-0 flex-1 text-white/70">
              <span className="font-bold text-white">{item.by}</span>{" "}
              {after === undefined ? (
                item.text
              ) : (
                <>
                  {before}
                  <Link href={`/athletes/${item.athleteId}`} className="font-semibold text-white hover:underline">
                    {item.athleteName}
                  </Link>
                  {after}
                </>
              )}
            </p>
            <time dateTime={item.at} className="shrink-0 whitespace-nowrap text-xs text-white/40">
              {when(item.at)}
            </time>
          </li>
        )
      })}
    </ul>
  )
}
