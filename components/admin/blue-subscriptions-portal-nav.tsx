"use client"

import { usePathname } from "next/navigation"
import { ArrowLeft, CreditCard, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/admin/blue/subscriptions", label: "Subscriptions & billing", icon: CreditCard },
  { href: "/admin/blue/subscriptions/registrations", label: "Registration pipeline", icon: ClipboardList },
] as const

export function BlueSubscriptionsPortalNav() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-40 border-b border-[#03154C]/10 bg-white/90 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <a
            href="/admin/blue"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#03154C]/25 hover:bg-slate-50"
            aria-label="Back to Blue program"
          >
            <ArrowLeft className="h-4 w-4" />
          </a>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-[#03154C] md:text-xl">Blue subscription management</h1>
            <p className="text-sm text-slate-600">Billing status, renewals, and registration intake</p>
          </div>
        </div>
        <nav className="flex w-full gap-1 rounded-xl border border-slate-200/80 bg-slate-100/90 p-1 shadow-inner md:w-auto md:min-w-[420px]">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const isRootSubscriptions = href === "/admin/blue/subscriptions"
            const isActive = isRootSubscriptions
              ? pathname === "/admin/blue/subscriptions"
              : pathname === href || pathname?.startsWith(`${href}/`)
            return (
              <a
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-white text-[#03154C] shadow-sm ring-1 ring-[#03154C]/10"
                    : "text-slate-600 hover:bg-white/70 hover:text-[#03154C]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{isRootSubscriptions ? "Billing" : "Forms"}</span>
              </a>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
