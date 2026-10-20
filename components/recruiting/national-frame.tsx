"use client"

import { useState } from "react"
import { LogOut, Menu, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { RwLogo } from "@/components/recruiting/rw-mark"

/**
 * RecruitWrestlers' own header and footer, for families and visitors on recruitwrestlers.com
 * (college coaches get the coach portal frame). Drawn alongside NC United's and shown only on the
 * national address, so the page never flashes the wrong one (app/recruit-brand.css).
 *
 * Plain <a href>: app/layout.tsx navigates same-site links on capture.
 */
const LINKS = [
  { href: "/prospects/all", label: "Athletes" },
  { href: "/public-rankings", label: "Rankings" },
  { href: "/recruiting/college-map", label: "Colleges" },
  { href: "/recruiting/learn", label: "Learn" },
]

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
  const links = user ? [{ href: "/my-recruiting", label: "Command Center" }, ...LINKS, { href: "/inbox", label: "Messages" }] : LINKS
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1426]/95 text-white backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="/" aria-label="RecruitWrestlers home">
          <NationalLockup />
        </a>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-white/75 lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
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
              <a href="/create-profile" className="rounded-xl bg-[#A3E635] px-4 py-2 text-sm font-bold text-[#0B1426] hover:bg-[#BEF264]">
                Get started
              </a>
            </>
          )}
          <button type="button" className="rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-white/10 px-4 py-3 lg:hidden">
          {[...links, ...(user ? [{ href: "/profile", label: "My account" }] : [{ href: "/auth/signin", label: "Sign in" }])].map((l) => (
            <a key={l.href} href={l.href} className="block rounded-lg px-2 py-2.5 text-base font-semibold text-white/85 hover:bg-white/5">
              {l.label}
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
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white">
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
