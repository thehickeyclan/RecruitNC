"use client"

import { useEffect, useState } from "react"
import type { FamilyNextStep } from "@/lib/recruiting/family-next-step"
import { usePathname } from "next/navigation"
import { LogOut, Menu, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { RwLogo } from "@/components/recruiting/rw-mark"
import { useCoachMessageBadge, useNavNew } from "@/hooks/use-nav-badges"
import { NotificationBell } from "@/components/recruiting/notification-bell"

/** A count beside a link, or "New" when something came out since this person last looked. */
function NavMark({ count, fresh }: { count?: number; fresh?: boolean }) {
  if (count) return <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{count > 9 ? "9+" : count}</span>
  if (fresh) return <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">New</span>
  return null
}

/**
 * RecruitWrestlers' own header and footer, for families and visitors on recruitwrestlers.com
 * (college coaches get the coach portal frame). Drawn alongside NC United's and shown only on the
 * national address, so the page never flashes the wrong one (app/recruit-brand.css).
 *
 * Plain <a href>: app/layout.tsx navigates same-site links on capture.
 */
/*
 * The menu is the products, not features (Matt, 26 Oct 2026: "the top should not have links like
 * learn, that should be part of command center"). Free: Athletes, Rankings, News, Commitments. Paid: Insider
 * and the Recruiting Command Center. Coaches: free access. Learn and the college map live inside
 * the Command Center.
 */
const FREE = [
  { href: "/prospects/all", label: "Athletes" },
  { href: "/rankings", label: "Rankings" },
  { href: "/recaps", label: "News" },
  // Public to everyone, signed in or not (Matt, 28 Oct 2026).
  { href: "/college-commitments", label: "Commitments" },
]
const PRODUCTS = [
  { href: "/rankings", label: "Insider" },
  { href: "/command-center", label: "Command Center" },
  { href: "/for-coaches", label: "For coaches" },
]
const LINKS = [...FREE, ...PRODUCTS]
const FOOTER = [...FREE, { href: "/membership", label: "Plans" }, { href: "/command-center", label: "Command Center" }, { href: "/for-coaches", label: "For coaches" }, { href: "/about", label: "About" }, { href: "/contact", label: "Contact" }]

export function NationalLockup({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center ${className}`}>
      <RwLogo className="h-7 w-auto sm:h-8" />
    </span>
  )
}

export function NationalHeader() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const pathname = usePathname() ?? ""
  const messages = useCoachMessageBadge(!!user, pathname)
  const fresh = useNavNew(!!user, pathname)
  const marks: Record<string, { count?: number; fresh?: boolean }> = {
    "/inbox": { count: messages.unread },
    "/rankings": { fresh: fresh.rankings },
    "/recaps": { fresh: fresh.news },
  }
  const anyMark = messages.unread > 0 || fresh.rankings || fresh.news
  /*
   * One button, the family's next step (Matt, 29 Oct 2026): free profile, then GPA and cell,
   * then Insider, then the Command Center (lib/recruiting/family-next-step.ts).
   */
  const [next, setNext] = useState<FamilyNextStep | null>(null)
  useEffect(() => {
    if (!user) return
    let cancelled = false
    void fetch("/api/membership/next-step", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: FamilyNextStep | null) => !cancelled && setNext(d))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])
  const cta = user ? (next?.href && next.label ? { href: next.href, label: next.label } : null) : { href: "/create-profile", label: "Claim free profile" }
  const mine = next?.athleteId ? [{ href: `/view-profile?id=${encodeURIComponent(next.athleteId)}`, label: "My profile" }] : []
  const links: { href: string; label: string }[] = user ? [...mine, { href: "/my-recruiting", label: "Command Center" }, ...FREE, { href: "/inbox", label: "Messages" }] : LINKS
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1426]/95 text-white backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="/" aria-label="RecruitWrestlers home">
          <NationalLockup />
        </a>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-white/75 lg:flex">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="inline-flex items-center hover:text-white">
              {l.label}
              {user ? <NavMark {...marks[l.href]} /> : null}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user && cta ? (
            <a href={cta.href} className="hidden rounded-xl bg-[#A3E635] px-4 py-2 text-sm font-bold text-[#0B1426] hover:bg-[#BEF264] xl:inline-block">
              {cta.label}
            </a>
          ) : null}
          {user ? (
            <>
              <NotificationBell signedIn />
              <a href="/profile" className="hidden text-sm font-semibold text-white/80 hover:text-white sm:inline">
                My account
              </a>
              <button type="button" onClick={() => void signOut()} className="hidden items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/60 hover:text-white sm:inline-flex">
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </button>
            </>
          ) : (
            <>
              <a href="/auth/signin" className="hidden text-sm font-semibold text-white/80 hover:text-white sm:inline">
                Sign in
              </a>
              {/* Step one is the free profile, not a price table. */}
              <a href="/create-profile" className="rounded-xl bg-[#A3E635] px-4 py-2 text-sm font-bold text-[#0B1426] hover:bg-[#BEF264]">
                Get started
              </a>
            </>
          )}
          <button type="button" className="rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <span className="relative block">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              {!open && user && anyMark ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-600" aria-label="New" /> : null}
            </span>
          </button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-white/10 px-4 py-3 lg:hidden">
          {user && cta ? (
            <a href={cta.href} className="mb-2 block rounded-xl bg-[#A3E635] px-4 py-3 text-center text-base font-bold text-[#0B1426]">
              {cta.label}
            </a>
          ) : null}
          {[...links, ...(user ? [{ href: "/profile", label: "My account" }] : [{ href: "/auth/signin", label: "Sign in" }])].map((l) => (
            <a key={l.label} href={l.href} className="flex items-center rounded-lg px-2 py-2.5 text-base font-semibold text-white/85 hover:bg-white/5">
              {l.label}
              {user ? <NavMark {...marks[l.href]} /> : null}
            </a>
          ))}
          {user ? (
            <button type="button" onClick={() => void signOut()} className="block w-full rounded-lg px-2 py-2.5 text-left text-base font-semibold text-white/60 hover:bg-white/5">
              Sign out
            </button>
          ) : null}
        </nav>
      ) : null}
    </header>
  )
}

export function NationalFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0B1426] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <NationalLockup />
          <p className="mt-2 text-sm text-white/45">College wrestling recruiting, built on verified results.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
          {FOOTER.map((l) => (
            <a key={l.label} href={l.href} className="hover:text-white">
              {l.label}
            </a>
          ))}
          <a href="/privacy" className="hover:text-white">
            Privacy
          </a>
          <a href="mailto:info@recruitwrestlers.com" className="hover:text-white">
            info@recruitwrestlers.com
          </a>
        </nav>
      </div>
      {/* Ownership line, Matt 20 Oct 2026: RecruitWrestlers is a Guild Ventures company. */}
      <p className="pb-8 text-center text-xs text-white/35">© {new Date().getFullYear()} RecruitWrestlers · A Guild Ventures company</p>
    </footer>
  )
}
