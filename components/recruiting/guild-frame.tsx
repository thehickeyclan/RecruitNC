"use client"

import { useState } from "react"
import { Playfair_Display } from "next/font/google"
import { LogOut, Menu, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { GUILD_GOLD } from "@/lib/recruiting/guild-brand"

/**
 * Guild Recruiting's own header and footer (recruit.wrestlingguild.com). Related to Guild Training
 * - the G emblem, black and Guild gold, the Playfair "GUILD" of wrestlingguild.com - but its own
 * product: its own navigation and a sans product voice (Matt, 16 Oct 2026: "establish a distinct
 * Guild Recruiting product experience"). Drawn beside NC United's frame and shown only on the
 * Guild address (app/recruit-brand.css), so the wrong one never flashes.
 *
 * Plain <a href>: app/layout.tsx navigates same-site links on capture.
 */
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700", "800"], display: "swap" })

export { GUILD_GOLD } from "@/lib/recruiting/guild-brand"

const LINKS = [
  { href: "/prospects/all", label: "Athletes" },
  { href: "/public-rankings", label: "Rankings" },
  { href: "/recruiting/college-map", label: "Colleges" },
  { href: "/recruiting/learn", label: "Learn" },
]

export function GuildRecruitingLockup({ size = "md" }: { size?: "md" | "lg" }) {
  const g = size === "lg" ? "h-11 w-11" : "h-8 w-8"
  return (
    <span className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/guild/guild-mark.png" alt="" className={`${g} rounded-md object-contain`} />
      <span className="flex flex-col leading-none">
        <span className={`${playfair.className} ${size === "lg" ? "text-2xl" : "text-lg"} font-extrabold tracking-[0.12em] text-white`}>GUILD</span>
        <span className={`${size === "lg" ? "text-[11px]" : "text-[9px]"} mt-0.5 font-bold uppercase tracking-[0.42em]`} style={{ color: GUILD_GOLD }}>
          Recruiting
        </span>
      </span>
    </span>
  )
}

export function GuildHeader() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const links = user ? [{ href: "/my-recruiting", label: "Command Center" }, ...LINKS, { href: "/inbox", label: "Messages" }] : LINKS
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/95 text-white backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="/" aria-label="Guild Recruiting home">
          <GuildRecruitingLockup />
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-white/70 lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <a href="/profile" className="hidden text-sm font-medium text-white/80 hover:text-white sm:inline">
                My account
              </a>
              <button type="button" onClick={() => void signOut()} className="hidden items-center gap-1 rounded-md px-2 py-1.5 text-sm text-white/60 hover:text-white sm:inline-flex">
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </button>
            </>
          ) : (
            <>
              <a href="/auth/signin" className="hidden text-sm font-medium text-white/80 hover:text-white sm:inline">
                Sign in
              </a>
              <a href="/create-profile" className="rounded-md px-4 py-2 text-sm font-bold text-black hover:opacity-90" style={{ backgroundColor: GUILD_GOLD }}>
                Get started
              </a>
            </>
          )}
          <button type="button" className="rounded-md p-2 text-white/80 hover:bg-white/10 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-white/10 px-4 py-3 lg:hidden">
          {[...links, ...(user ? [{ href: "/profile", label: "My account" }] : [{ href: "/auth/signin", label: "Sign in" }])].map((l) => (
            <a key={l.href} href={l.href} className="block rounded-md px-2 py-2.5 text-base font-medium text-white/85 hover:bg-white/5">
              {l.label}
            </a>
          ))}
          {user ? (
            <button type="button" onClick={() => void signOut()} className="block w-full rounded-md px-2 py-2.5 text-left text-base font-medium text-white/60 hover:bg-white/5">
              Sign out
            </button>
          ) : null}
        </nav>
      ) : null}
    </header>
  )
}

export function GuildFooter() {
  return (
    <footer className="border-t border-white/10 bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <GuildRecruitingLockup />
            <p className="mt-3 text-sm text-white/50">College wrestling recruiting, built on verified results.</p>
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
          </nav>
        </div>
      </div>
    </footer>
  )
}

/** The sign-in page's left panel on Guild Recruiting's address, in place of NC United's. */
export function GuildSignInPanel() {
  return (
    <div className="order-2 flex flex-col justify-center rounded-xl border border-white/10 bg-black p-6 text-white shadow-xl sm:p-8 lg:order-1">
      <GuildRecruitingLockup size="lg" />
      <h2 className="mt-6 text-2xl font-black tracking-tight sm:text-3xl">College recruiting, built on verified results.</h2>
      <ul className="mt-6 space-y-3 text-sm text-white/75">
        <li>
          <span className="font-semibold text-white">Families:</span> your Command Center: the plan, your college list, who viewed the profile and who reached out.
        </li>
        <li>
          <span className="font-semibold text-white">College coaches:</span> search athletes, scouting reports and one board for your staff. Free for college staff.
        </li>
      </ul>
      <a href="/create-profile" className="mt-8 inline-flex w-fit items-center rounded-md px-5 py-3 text-sm font-bold text-black hover:opacity-90" style={{ backgroundColor: GUILD_GOLD }}>
        New here? Find your profile
      </a>
    </div>
  )
}
