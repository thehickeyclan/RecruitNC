"use client"

import { usePathname } from "next/navigation"
import { ArrowLeft, Users, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/admin/blue/subscriptions", label: "Members", short: "Members", icon: Users },
  { href: "/admin/blue/subscriptions/registrations", label: "All signups", short: "Signups", icon: ClipboardList },
] as const

export function BlueSubscriptionsPortalNav() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#03154C]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="/admin/blue"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Back to Blue command center"
          >
            <ArrowLeft className="h-4 w-4" />
          </a>
          <h1 className="text-base font-semibold tracking-tight text-white md:text-lg">Blue subscriptions</h1>
        </div>
        <nav className="flex gap-1 rounded-lg bg-black/20 p-1 md:min-w-[280px]">
          {LINKS.map(({ href, label, short, icon: Icon }) => {
            const isMembers = href === "/admin/blue/subscriptions"
            const isActive = isMembers
              ? pathname === "/admin/blue/subscriptions"
              : pathname === href || pathname?.startsWith(`${href}/`)
            return (
              <a
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-[#D3B574] text-[#03154C]" : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </a>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
