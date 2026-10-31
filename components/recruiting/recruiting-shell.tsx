"use client"

import { BrandLockup } from "@/components/recruiting/brand-frames"
import { releasedClassYears } from "@/lib/public-rankings-cap"
import { coachProgramOf, viewGenderFor } from "@/lib/recruiting/coach-program"
import { useState } from "react"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  ChevronDown,
  GitCompareArrows,
  GraduationCap,
  HeartHandshake,
  LogOut,
  Menu,
  MessageSquare,
  Star,
  Target,
  User,
  Users,
  FileText,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useCoachMessageBadge, useInterestBadge, useNavNew } from "@/hooks/use-nav-badges"
import { NotificationBell } from "@/components/recruiting/notification-bell"
import { COACH_PREVIEW_KEY, COMMUNITY_PARTNER_LINKS, RECRUITING_BRAND, hasCommunityAccess, recruitingCoverage, usesRecruitingShell } from "@/lib/recruiting/brand"
import { RecruitingFooter } from "@/components/recruiting/recruiting-footer"
import { RecruitingWordmark } from "@/components/recruiting/recruiting-wordmark"
import { RecruitingSearch } from "@/components/recruiting/recruiting-search"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOnRecruitWrestlers } from "@/components/recruiting/brand-host"

/**
 * The frame around a college coach's pages (Matt, 11 October 2026): a slim bar on top, the
 * recruiting pages down the left, and on a phone the five that matter most along the bottom.
 * A side menu rather than a top bar because this is a tool a coach works in, with more
 * destinations than a bar holds and counts (unread messages) that belong beside their link.
 *
 * Nothing of the community side is in this menu: no clubs, Blue, store, giving or news (Matt,
 * 13 October 2026 - "no need for anything NC United on the coaches portal"; the two are being
 * separated). Same app and sign-in as components/navbar.tsx; none of its links or look.
 *
 * Links are plain <a href>, as in the community bar: app/layout.tsx navigates on capture before
 * React click handlers run.
 */
/** `badge` counts; `fresh` is a "New" tag for something released since the coach last looked. */
type Item = { href: string; label: string; icon: LucideIcon; badge?: number; fresh?: boolean }

function SideMenu({ items, isActive, onNavigate, partner }: { items: Item[]; isActive: (href: string) => boolean; onNavigate?: () => void; partner: boolean }) {
  return (
    <div className="flex h-full flex-col gap-1">
      {items.map((item) => {
        const active = isActive(item.href)
        return (
          <a
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[44px] items-center gap-3 rounded-md border-l-2 px-3 text-sm font-semibold transition-colors ${
              active ? "border-[#D3B574] bg-[#D3B574]/10 text-[#D3B574]" : "border-transparent text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="flex-1 whitespace-nowrap">{item.label}</span>
            {item.badge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            ) : item.fresh ? (
              <span className="shrink-0 rounded-full bg-red-600 px-1 py-px text-[9px] font-bold uppercase text-white">New</span>
            ) : null}
          </a>
        )
      })}
      {/* Only for a program that also works with NC United (UNC, whose room NC United practices in). */}
      {partner ? (
        <div className="mt-auto border-t border-white/10 pt-2">
          <p className="px-3 pb-1 text-[11px] font-black uppercase tracking-widest text-white/45">NC United</p>
          {COMMUNITY_PARTNER_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={onNavigate} className="flex min-h-[40px] items-center rounded-md px-3 text-sm text-white/60 hover:bg-white/5 hover:text-white">
              {l.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function RecruitingShell({ children, hideNcUnited = false }: { children: React.ReactNode; hideNcUnited?: boolean }) {
  const onRw = useOnRecruitWrestlers()
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname() ?? ""
  const { user, profile, signOut } = useAuth()
  const messages = useCoachMessageBadge(!!user, pathname)
  const interestNew = useInterestBadge(!!user, pathname)
  const fresh = useNavNew(!!user, pathname)

  /**
   * One My Recruits for every coach: the board with the funnel on it. The program portal
   * (calendar, notes, activity) is a link from that page, not a second place called My Recruits.
   */
  const boardHref = "/my-recruits"
  const athletes: Item = { href: "/prospects/all", label: "Athletes", icon: Users }
  const recruits: Item = { href: boardHref, label: "My Recruits", icon: Star }
  const inbox: Item = { href: "/inbox", label: "Messages", icon: MessageSquare, badge: messages.unread }
  /*
   * Once a women's class is released the menu names both sets (Matt, 13 October 2026): a women's
   * coach must find the women's rankings in one click, not under a link that has always meant the
   * men's. Her own program's set is listed first. Until then it is the one "Rankings", as before.
   */
  const womensOut = releasedClassYears("Female").length > 0
  const womensFirst = viewGenderFor(coachProgramOf(user)) === "Female"
  const rankings: Item[] = !womensOut
    ? [{ href: "/public-rankings", label: "Rankings", icon: BarChart3, fresh: fresh.rankings }]
    : (() => {
        const mens: Item = { href: "/public-rankings#mens", label: "Men's Rankings", icon: BarChart3, fresh: fresh.rankings }
        const womens: Item = { href: "/public-rankings#womens", label: "Women's Rankings", icon: BarChart3, fresh: fresh.rankings }
        return womensFirst ? [womens, mens] : [mens, womens]
      })()
  // My Recruits is the coach's home (Matt, 27 Oct 2026): first, and Coach Home folds into it.
  const items: Item[] = [
    recruits,
    athletes,
    ...rankings,
    { href: "/interested", label: "Interested", icon: HeartHandshake, badge: interestNew },
    { href: "/coach-reports", label: "Reports", icon: FileText, badge: fresh.reports },
    inbox,
    { href: "/compare?src=nav", label: "Compare", icon: GitCompareArrows },
    { href: "/perfect-recruit", label: "Perfect Recruit", icon: Target },
    { href: "/college-commitments", label: "Commitments", icon: GraduationCap },
  ]

  const isActive = (link: string) => {
    const href = link.split("?")[0]!
    // Both boards are "My Recruits", whichever one this coach's link points at.
    if (link === boardHref && (pathname.startsWith("/my-recruits") || /^\/schools\/[^/]+\/portal/.test(pathname))) return true
    return pathname === href || (href !== "/" && pathname.startsWith(href))
  }
  /** An admin looking at the coach interface (COACH_PREVIEW_KEY), not a coach. */
  const previewing = !!profile && !usesRecruitingShell(profile)
  const exitPreview = () => {
    try {
      localStorage.removeItem(COACH_PREVIEW_KEY)
    } catch {}
    window.location.href = "/"
  }
  const iconButton = "relative flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("[RecruitNC] Sign out error:", error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div id="app-content" data-shell="recruiting" className="group/shell relative flex min-h-screen flex-col bg-[#0A1628] print:bg-white">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-white/10 bg-[#0A1628] px-4 print:hidden lg:px-5">
        <a href="/my-recruits" className="flex shrink-0 items-baseline gap-3" aria-label={`${onRw || hideNcUnited ? "RecruitWrestlers" : RECRUITING_BRAND.name} — Home`}>
          {/* RecruitNC here; RecruitWrestlers on recruitwrestlers.com (app/recruit-brand.css). */}
          {hideNcUnited ? null : (
            <span className="ncu-only">
              <RecruitingWordmark className="text-xl" />
            </span>
          )}
          <BrandLockup />
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.25em] text-white/45 sm:inline">{recruitingCoverage(onRw)} wrestling</span>
        </a>
        <RecruitingSearch className="hidden min-w-0 max-w-md flex-1 md:block" />
        <div className="ml-auto flex items-center gap-1">
          {previewing ? (
            <button type="button" onClick={exitPreview} className="mr-1 rounded-full border border-[#D3B574]/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#D3B574] hover:bg-[#D3B574]/10">
              Coach view · exit
            </button>
          ) : null}
          <NotificationBell signedIn={!!user} />
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-1 flex h-10 items-center gap-2 rounded-lg border border-white/20 px-3 text-sm font-semibold text-white hover:bg-white/10">
              <User className="h-4 w-4" />
              <span className="hidden max-w-[160px] truncate sm:inline">{profile?.full_name || "Account"}</span>
              <ChevronDown className="h-4 w-4 text-white/50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href="/profile">My Account</a>
              </DropdownMenuItem>
              {previewing ? (
                <DropdownMenuItem onClick={exitPreview}>Exit coach view</DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="border-b border-white/10 px-4 py-2 print:hidden md:hidden">
        <RecruitingSearch />
      </div>

      <div className="flex flex-1">
        <nav aria-label="Recruiting navigation" className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-white/10 p-3 print:hidden lg:block">
          <SideMenu items={items} isActive={isActive} partner={hasCommunityAccess(profile)} />
        </nav>
        <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
          <main className="flex-1">{children}</main>
          <RecruitingFooter />
        </div>
      </div>

      <nav aria-label="Recruiting navigation" className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-white/10 bg-[#0A1628] print:hidden lg:hidden">
        {[{ ...recruits, label: "Recruits" }, athletes, { ...rankings[0], label: "Rankings" }, inbox].map((item) => {
          const active = isActive(item.href)
          return (
            <a
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-[#D3B574]" : "text-white/60"}`}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
              {item.badge ? (
                <span className="absolute right-[22%] top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : item.fresh ? (
                <span className="absolute right-[26%] top-2 h-2.5 w-2.5 rounded-full bg-red-600" aria-label="New" />
              ) : null}
            </a>
          )
        })}
        <button type="button" onClick={() => setMenuOpen(true)} className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-white/60">
          <Menu className="h-5 w-5" aria-hidden />
          More
        </button>
      </nav>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[85vw] max-w-[360px] overflow-y-auto border-white/10 bg-[#0A1628] p-4 pt-10 text-white">
          <SideMenu items={items} isActive={isActive} partner={hasCommunityAccess(profile)} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
