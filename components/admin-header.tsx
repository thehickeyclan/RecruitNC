"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const adminNavItems: {
  title: string
  href: string
  icon: string
  activePrefix?: string
}[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: "🏠",
  },
  {
    title: "User CRM",
    href: "/admin/crm",
    icon: "🧭",
  },
  {
    title: "Submissions",
    href: "/admin/submissions-manager",
    icon: "📝",
  },
  {
    title: "Athletes",
    href: "/admin/athletes",
    icon: "👥",
  },
  {
    title: "Schools",
    href: "/admin/schools",
    icon: "🏫",
  },
  {
    title: "Statistics",
    href: "/admin/commitment-stats",
    icon: "📊",
  },
  {
    title: "Data Dawg",
    href: "/admin/data-dawg/analytics",
    icon: "🐶",
    activePrefix: "/admin/data-dawg",
  },
  {
    title: "NHSCA Analytics",
    href: "/admin/nhsca-analytics",
    icon: "🏆",
  },
  {
    title: "NHSCA Placements",
    href: "/admin/nhsca-placements",
    icon: "📋",
  },
  {
    title: "Result review",
    href: "/admin/identity-review",
    icon: "🔗",
  },
  {
    title: "Logo Manager",
    href: "/admin/enhanced-logo-manager",
    icon: "🎨",
  },
  {
    title: "National team",
    href: "/admin/national-team",
    icon: "🏅",
  },
  {
    title: "TOC",
    href: "/admin/toc",
    icon: "🎟️",
    activePrefix: "/admin/toc",
  },
  {
    title: "Fundraising",
    href: "/admin/fundraising",
    icon: "🪙",
  },
  {
    title: "Reimbursement",
    href: "/admin/expense-requests",
    icon: "🧾",
  },
  {
    title: "Guild credits",
    href: "/admin/guild-credit-allocations",
    icon: "🏛️",
  },
  {
    title: "Guild parent link",
    href: "/admin/guild-parent-link",
    icon: "🔗",
  },
  {
    title: "Blue Program",
    href: "/admin/blue",
    icon: "💳",
  },
  {
    title: "NC United Calendar",
    href: "/admin/calendar",
    icon: "📅",
  },
  {
    title: "Messaging",
    href: "/admin/messaging",
    icon: "📬",
  },
  {
    title: "NCHSAA",
    href: "/admin/nchsaa",
    icon: "📑",
  },
]

export function AdminHeader() {
  const pathname = usePathname()

  /*
   * A slim sub-bar, not a second main menu (Matt, 21 Oct 2026: "2 blue bars"). It sits under the
   * site's own navigation, so it is shorter, a darker navy, carries no second logo, and keeps its
   * links on one line that scrolls sideways rather than wrapping or running off the edge.
   */
  return (
    <header className="border-b border-white/10 bg-[#071427] shadow-sm print:hidden">
      <div className="mx-auto flex h-11 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <a
          href="/admin"
          className="shrink-0 rounded bg-[#D3B574] px-2 py-0.5 text-[11px] font-black uppercase tracking-widest text-[#0A1628] hover:opacity-90"
        >
          Admin
        </a>
        <nav className="flex min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-1 items-center gap-0.5 overflow-x-auto [mask-image:linear-gradient(to_right,black_92%,transparent)]" aria-label="Admin">
          {adminNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.activePrefix != null && pathname.startsWith(item.activePrefix))
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => { window.location.href = item.href }}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border-0 px-2.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer",
                  isActive ? "bg-white/15 text-white" : "bg-transparent text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <span className="text-[12px] leading-none">{item.icon}</span>
                <span>{item.title}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
