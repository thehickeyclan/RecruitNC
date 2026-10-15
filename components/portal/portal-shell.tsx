import Link from "next/link"
import { Activity, BookOpen, CalendarDays, Compass, LayoutDashboard, Map as MapIcon, MessageSquare } from "lucide-react"

/**
 * The family portal's frame (Matt's design, 14 Oct 2026): one menu down the left on a computer, a
 * scrolling bar of the same items on a phone. Every Command Center page sits inside it, so a
 * family always knows where they are and how to get to the rest.
 */
export type PortalSection = "home" | "plan" | "colleges" | "map" | "messages" | "learn" | "activity"

const ITEMS: Array<{ key: PortalSection; label: string; href: string; icon: typeof Activity }> = [
  { key: "home", label: "Command Center", href: "/my-recruiting", icon: LayoutDashboard },
  { key: "plan", label: "Plan", href: "/recruiting/learn/timeline", icon: CalendarDays },
  { key: "colleges", label: "Colleges", href: "/recruiting/compare", icon: Compass },
  { key: "map", label: "Map", href: "/recruiting/college-map", icon: MapIcon },
  { key: "messages", label: "Messages", href: "/inbox", icon: MessageSquare },
  { key: "learn", label: "Learn", href: "/my-recruiting/learn", icon: BookOpen },
  { key: "activity", label: "Activity", href: "/my-recruiting/activity", icon: Activity },
]

export function PortalShell({ active, children }: { active: PortalSection; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <nav aria-label="Command Center" className="sticky top-0 z-30 border-b border-white/10 bg-[#0A1628]/95 backdrop-blur lg:hidden">
        <ul className="flex gap-1 overflow-x-auto px-3 py-2">
          {ITEMS.map(({ key, label, href, icon: Icon }) => (
            <li key={key} className="shrink-0">
              <Link
                href={href}
                aria-current={key === active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${key === active ? "bg-[#D3B574] text-[#0A1628]" : "text-white/70 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-white/10 px-3 py-6 lg:flex">
          <p className="px-3 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">Recruiting Portal</p>
          <ul className="mt-4 space-y-1">
            {ITEMS.map(({ key, label, href, icon: Icon }) => (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={key === active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${key === active ? "bg-[#D3B574]/15 text-white ring-1 ring-[#D3B574]/50" : "text-white/65 hover:bg-white/5 hover:text-white"}`}
                >
                  <Icon className={`h-4 w-4 ${key === active ? "text-[#D3B574]" : ""}`} aria-hidden /> {label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/profile" className="mt-auto px-3 text-xs font-semibold text-white/45 hover:text-white">
            Account settings
          </Link>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
