"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Bell,
  ChevronDown,
  GitCompareArrows,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Star,
  Target,
  Trophy,
  User,
  Users,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useCoachMessageBadge, useNavNotifications } from "@/hooks/use-nav-badges"
import { COACH_PREVIEW_KEY, RECRUITING_BRAND, recruitingCoverage, usesRecruitingShell } from "@/lib/recruiting/brand"
import { RecruitingFooter } from "@/components/recruiting/recruiting-footer"
import { RecruitingWordmark } from "@/components/recruiting/recruiting-wordmark"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * The frame around a college coach's pages (Matt, 11 October 2026): a slim bar on top, the
 * recruiting pages down the left, and on a phone the five that matter most along the bottom.
 * A side menu rather than a top bar because this is a tool a coach works in, with more
 * destinations than a bar holds and counts (unread messages) that belong beside their link.
 *
 * Clubs, Blue, the store and giving are the community side's, folded under the parent's name at
 * the foot of the menu. Same app and sign-in as components/navbar.tsx; none of its links or look.
 *
 * Links are plain <a href>, as in the community bar: app/layout.tsx navigates on capture before
 * React click handlers run.
 */
type Item = { href: string; label: string; icon: LucideIcon; badge?: number }

const RESULTS_LINKS = [
  { href: "/nchsaa/2026", label: "NCHSAA State Tournament" },
  { href: "/nhsca", label: "NHSCA Nationals" },
  { href: "/super32", label: "Super32" },
  { href: "/fargo", label: "Fargo" },
  { href: "/athletes", label: "College Commitments" },
]

const COMMUNITY_LINKS = [
  { href: "/?community=1", label: "Home" },
  { href: "/clubs", label: "Clubs" },
  { href: "/calendar", label: "Calendar" },
  { href: "/news", label: "News" },
  { href: "/blue", label: "NC United Blue" },
  { href: "/tournament-of-champions", label: "Tournament of Champions" },
  { href: "/fundraising", label: "Give" },
  { href: "/store-app", label: "Store" },
  { href: "/forum", label: "Community" },
  { href: "/about", label: "About" },
]

function SideMenu({ items, isActive, onNavigate }: { items: Item[]; isActive: (href: string) => boolean; onNavigate?: () => void }) {
  const sub = "flex min-h-[40px] items-center rounded-md pl-11 pr-3 text-sm text-white/60 hover:bg-white/5 hover:text-white"
  const group = "flex min-h-[44px] cursor-pointer list-none items-center gap-3 rounded-md px-3 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white [&::-webkit-details-marker]:hidden"
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
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            ) : null}
          </a>
        )
      })}
      <details className="group/results" open={RESULTS_LINKS.some((l) => isActive(l.href))}>
        <summary className={`${group} border-l-2 border-transparent`}>
          <Trophy className="h-[18px] w-[18px] shrink-0" aria-hidden />
          <span className="flex-1">Results</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open/results:rotate-180" aria-hidden />
        </summary>
        {RESULTS_LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={onNavigate} className={`${sub} ${isActive(l.href) ? "text-[#D3B574]" : ""}`}>
            {l.label}
          </a>
        ))}
      </details>
      <details className="group/community mt-auto border-t border-white/10 pt-2">
        <summary className={`${group} text-white/45`}>
          <span className="flex-1 text-[11px] font-black uppercase tracking-widest">NC United</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open/community:rotate-180" aria-hidden />
        </summary>
        {COMMUNITY_LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={onNavigate} className={`${sub} pl-3`}>
            {l.label}
          </a>
        ))}
      </details>
    </div>
  )
}

export function RecruitingShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const pathname = usePathname() ?? ""
  const { user, profile, signOut } = useAuth()
  const messages = useCoachMessageBadge(!!user, pathname)
  const bell = useNavNotifications(!!user, notificationsOpen)

  /**
   * One My Recruits for every coach: the board with the funnel on it. The program portal
   * (calendar, notes, activity) is a link from that page, not a second place called My Recruits.
   */
  const boardHref = "/my-recruits"
  const home: Item = { href: "/coach-home", label: "Home", icon: Home }
  const athletes: Item = { href: "/prospects/all", label: "Athletes", icon: Users }
  const recruits: Item = { href: boardHref, label: "My Recruits", icon: Star }
  const inbox: Item = { href: "/inbox", label: "Messages", icon: MessageSquare, badge: messages.unread }
  const items: Item[] = [
    home,
    athletes,
    { href: "/public-rankings", label: "Rankings", icon: BarChart3 },
    recruits,
    inbox,
    { href: "/compare?src=nav", label: "Compare", icon: GitCompareArrows },
    { href: "/perfect-recruit", label: "Perfect Recruit", icon: Target },
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
    <div id="app-content" data-shell="recruiting" className="group/shell relative flex min-h-screen flex-col bg-[#0A1628]">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-white/10 bg-[#0A1628] px-4 print:hidden lg:px-5">
        <a href="/coach-home" className="flex shrink-0 items-baseline gap-3" aria-label={`${RECRUITING_BRAND.name} — Home`}>
          <RecruitingWordmark className="text-xl" />
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.25em] text-white/45 sm:inline">{recruitingCoverage()} wrestling</span>
        </a>
        <div className="ml-auto flex items-center gap-1">
          {previewing ? (
            <button type="button" onClick={exitPreview} className="mr-1 rounded-full border border-[#D3B574]/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#D3B574] hover:bg-[#D3B574]/10">
              Coach view · exit
            </button>
          ) : null}
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={iconButton} aria-label={bell.unread > 0 ? `Notifications (${bell.unread} unread)` : "Notifications"}>
                <Bell className="h-5 w-5" />
                {bell.unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {bell.unread > 99 ? "99+" : bell.unread}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(340px,100vw-24px)] p-0" sideOffset={8}>
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold">Notifications</span>
                {bell.unread > 0 && (
                  <button type="button" onClick={bell.markAllRead} className="text-xs text-muted-foreground hover:text-foreground">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {bell.notifications.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
                ) : (
                  bell.notifications.map((n) => (
                    <a
                      key={n.id}
                      href={n.link || "#"}
                      onClick={() => {
                        bell.markRead(n.id)
                        setNotificationsOpen(false)
                      }}
                      className={`block border-b border-border/50 px-3 py-2.5 text-left last:border-0 hover:bg-muted/50 ${!n.read_at ? "bg-muted/30" : ""}`}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </a>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
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

      <div className="flex flex-1">
        <nav aria-label="Recruiting navigation" className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-white/10 p-3 print:hidden lg:block">
          <SideMenu items={items} isActive={isActive} />
        </nav>
        <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
          <main className="flex-1">{children}</main>
          <RecruitingFooter />
        </div>
      </div>

      <nav aria-label="Recruiting navigation" className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-white/10 bg-[#0A1628] print:hidden lg:hidden">
        {[home, athletes, { ...recruits, label: "Recruits" }, inbox].map((item) => {
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
          <SideMenu items={items} isActive={isActive} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
