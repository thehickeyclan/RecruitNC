import Link from "next/link"

/**
 * One row of tabs across a coach's pages, so Coach Home, the board and the perfect recruit read as
 * one place rather than three (Matt, 10 October 2026). The board stays its own page - it is a
 * working table that needs the width - and the tabs are what join them.
 */
const TABS = [
  { key: "home", href: "/coach-home", label: "Coach Home" },
  { key: "recruits", href: "/my-recruits", label: "My Recruits" },
  { key: "standard", href: "/perfect-recruit", label: "Perfect Recruit" },
  { key: "messages", href: "/inbox", label: "Messages" },
  { key: "compare", href: "/compare?src=coach-tabs", label: "Compare" },
] as const

export type CoachTab = (typeof TABS)[number]["key"]

export function CoachTabs({ active, className = "" }: { active: CoachTab; className?: string }) {
  return (
    <nav aria-label="Coach pages" className={`-mx-4 overflow-x-auto px-4 ${className}`}>
      <ul className="flex min-w-max gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={t.key === active ? "page" : undefined}
              className={`inline-block border-b-2 px-3 py-2.5 text-sm font-bold transition-colors ${
                t.key === active ? "border-[#D3B574] text-[#D3B574]" : "border-transparent text-white/55 hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
