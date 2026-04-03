"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import type { LucideIcon } from "lucide-react"
import {
  Menu,
  User,
  LogOut,
  Star,
  ChevronDown,
  Users,
  Users2,
  Trophy,
  Medal,
  ShoppingCart,
  ShoppingBag,
  Bell,
  Crown,
  Archive,
  Activity,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useCartStore } from "@/lib/store/cart-store"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { StoreButton } from "@/components/store-button"
import { StoreNavLink } from "@/components/store-nav-link"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type NavNotification = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [hubAccess, setHubAccess] = useState(false)
  const [notifications, setNotifications] = useState<NavNotification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const pathname = usePathname() ?? ""
  const { user, signOut, isLoading, profile } = useAuth()
  const cartItems = useCartStore((s) => s.items)
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const unreadNotifications = notifications.filter((n) => !n.read_at).length

  useEffect(() => {
    if (!user) {
      setHubAccess(false)
      return
    }
    fetch("/api/national-team/hub-access", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setHubAccess(!!data?.allowed))
      .catch(() => setHubAccess(false))
  }, [user])

  const fetchNotifications = useCallback(() => {
    if (!user) return
    fetch("/api/notifications", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setNotifications(Array.isArray(data?.notifications) ? data.notifications : []))
      .catch(() => setNotifications([]))
  }, [user])

  useEffect(() => {
    if (!user) {
      setNotifications([])
      return
    }
    fetchNotifications()
  }, [user, fetchNotifications])

  useEffect(() => {
    if (user && notificationsOpen) fetchNotifications()
  }, [user, notificationsOpen, fetchNotifications])

  const markNotificationRead = useCallback((id: string) => {
    fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ read: true }),
    }).then(() => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
    })
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    fetch("/api/notifications/read-all", { method: "PATCH", credentials: "include" }).then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    })
  }, [])

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href))
  const isDropdownActive = (items: { href: string }[]) => items.some((item) => isActive(item.href))
  const navLinkClass = (href: string) =>
    `text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized ${isActive(href) ? "font-bold" : ""}`
  const navTriggerClass = (items: { href: string }[]) =>
    `text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized flex items-center gap-1 ${isDropdownActive(items) ? "font-bold" : ""}`
  const mobileLinkClass = (href: string) =>
    `px-3 py-2 rounded-md text-base font-medium transition-colors mobile-optimized min-h-[44px] flex items-center block ${isActive(href) ? "font-bold text-red-600" : "text-gray-600 hover:text-red-600"}`
  // Mobile: parent/section labels (Athletes, Events, etc.) are bold; sub-items are not bold
  const mobileMenuParentClass = (active: boolean) =>
    `text-sm mb-2 font-bold ${active ? "text-red-600" : "text-gray-800"}`
  const mobileSubLinkClass = (href: string) =>
    `py-2 rounded-md text-base font-normal transition-colors mobile-optimized min-h-[44px] flex items-center block pl-4 ${isActive(href) ? "text-red-600" : "text-gray-600 hover:text-red-600"}`

  const showMyRecruits =
    profile?.role === "admin" ||
    profile?.role === "college_coach" ||
    profile?.role === "coach" ||
    profile?.is_admin === true


  const getRecruitingPortalUrl = () => {
    // Admins go to schools admin page to choose which portal to preview
    if (profile?.is_admin) {
      return "/admin/schools"
    }
    // Coaches with school assignment go to their branded portal
    if (profile?.school_id) {
      return `/schools/${profile.school_id}/portal`
    }
    // No generic coach portal - coaches need to be assigned to a school
    return "/contact"
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("[RecruitNC] Sign out error:", error instanceof Error ? error.message : String(error))
    }
  }

  // Let links work: do not prevent default. Dropdowns keep onClick for compatibility but link navigates.
  const handleNav = (_e: React.MouseEvent, _url: string) => {}
  const handleNavMobile = () => setIsOpen(false)

  // Primary nav: Home, Athletes, Events, Calendar, Programs, News, Messages, LegacyNC, then [Commitments etc]. Right block: Store, Cart (only when items), Sign In/Account.
  const commitmentItems = [
    { href: "/athletes", label: "All Commitments" },
    { href: "/high-schools", label: "By High School" },
    { href: "/colleges", label: "By College" },
  ]
  const profilesItem = { href: "/prospects/all", label: "Athlete Profiles" }
  const rankingsItem = { href: "/public-rankings", label: "Rankings" }
  const athletesItems = [...commitmentItems, profilesItem, rankingsItem]
  const calendarUrl = "https://calendar.ncwrestlingunited.com"

  const nationalTeamItems = [{ href: "/national-team", label: "National Team" }]

  type EventsMegaLink = {
    href: string
    label: string
    icon: LucideIcon
    badge?: "current" | "muted"
    badgeLabel?: string
  }

  /** States column — NCHSAA (matches Events mega-menu layout). */
  const eventsStatesColumn: EventsMegaLink[] = [
    {
      href: "/nchsaa",
      label: "About",
      icon: Crown,
    },
    {
      href: "/nchsaa/2026",
      label: "2026 Results",
      icon: Trophy,
      badge: "current",
      badgeLabel: "Current",
    },
    {
      href: "/nchsaa/2025",
      label: "2025 Results",
      icon: Trophy,
    },
    {
      href: "/nchsaa/archive",
      label: "Archive",
      icon: Archive,
      badge: "muted",
      badgeLabel: "Historic",
    },
  ]

  /** Nationals column — NHSCA only (Super32 is its own column). */
  const eventsNationalsColumn: EventsMegaLink[] = [
    {
      href: "/nhsca",
      label: "About",
      icon: Trophy,
    },
    {
      href: "/nhsca/2026",
      label: "2026 Results",
      icon: Trophy,
      badge: "current",
      badgeLabel: "Current",
    },
    {
      href: "/nhsca/live",
      label: "Live dashboard",
      icon: Activity,
    },
    {
      href: "/nhsca/2025",
      label: "2025 Results",
      icon: Trophy,
    },
    {
      href: "/nhsca/archive",
      label: "Archive",
      icon: Archive,
      badge: "muted",
      badgeLabel: "35+ Years",
    },
  ]

  const eventsSuper32Column: EventsMegaLink[] = [
    {
      href: "/super32",
      label: "Champions",
      icon: Medal,
    },
  ]

  const eventsNavItemsForActive = [
    ...eventsStatesColumn,
    ...eventsNationalsColumn,
    ...eventsSuper32Column,
  ].map((i) => ({ href: i.href }))

  const legacyNcItems = [
    { href: "/athletes?tab=legacy", label: "Wrestlers", description: "Search by name: NHSCA, NCHSAA, awards & more", icon: Users },
    { href: "/schools", label: "Schools", description: "NC high school wrestling", icon: Medal },
    { href: "/dave-schultz-award", label: "Dave Schultz Award", description: "NC male wrestler award winners", icon: Trophy },
    { href: "/tricia-saunders-award", label: "Tricia Saunders Award", description: "NC female wrestler award winners", icon: Trophy },
  ]

  const highlightNavItems = showMyRecruits
    ? [
        {
          href: getRecruitingPortalUrl(),
          label: "My Recruits",
        },
      ]
    : []

  return (
    <nav className="bg-[#003366] shadow-md touch-scroll sticky top-0 z-50" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center min-h-[72px] py-4">
          {/* Logo — white on blue; use transparent PNG at this path to avoid blend (no black background) */}
          <div className="flex-shrink-0 bg-[#003366]">
            <Link href="/" className="flex items-center space-x-2 mobile-optimized block">
              <Image
                src="/images/nc-united-logo-white.png"
                alt="NC United"
                width={140}
                height={52}
                className="h-11 w-auto object-contain mix-blend-screen"
                priority
              />
            </Link>
          </div>

          {/* Desktop Navigation — Dropdown items that navigate MUST use <a href>, not Link (Radix blocks navigation otherwise). See .cursorrules. */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-1">
              <a href="/" className={navLinkClass("/")}>Home</a>
              <DropdownMenu>
                <DropdownMenuTrigger className={navTriggerClass(athletesItems)}>
                  Athletes
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="font-normal text-muted-foreground">Commitments</DropdownMenuLabel>
                  {commitmentItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <a href={item.href} className="block w-full cursor-pointer">{item.label}</a>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href={profilesItem.href} className="block w-full cursor-pointer">{profilesItem.label}</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={rankingsItem.href} className="block w-full cursor-pointer">{rankingsItem.label}</a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger className={navTriggerClass(eventsNavItemsForActive)}>
                  <Trophy className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  Events
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="w-[min(56rem,calc(100vw-1.5rem))] max-h-[min(90vh,720px)] overflow-y-auto p-0"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x bg-popover text-popover-foreground rounded-md">
                    {/* Column: States */}
                    <div className="p-4 min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <Crown className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                        NCHSAA "States"
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">About, annual results, and archive</p>
                      <div className="flex flex-col gap-0.5">
                        {eventsStatesColumn.map((sub) => {
                          const Icon = sub.icon
                          return (
                            <a
                              key={sub.href}
                              href={sub.href}
                              className="flex gap-3 rounded-md px-2 py-2.5 hover:bg-muted/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <Icon className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-sm text-foreground">{sub.label}</span>
                                  {sub.badge === "current" && sub.badgeLabel && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                      {sub.badgeLabel}
                                    </span>
                                  )}
                                  {sub.badge === "muted" && sub.badgeLabel && (
                                    <span className="inline-flex items-center rounded-full border border-border bg-muted/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      {sub.badgeLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                    {/* Column: Nationals (NHSCA) */}
                    <div className="p-4 min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <Trophy className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                        NHSCA "Nationals"
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">About, annual results, and archive</p>
                      <div className="flex flex-col gap-0.5">
                        {eventsNationalsColumn.map((sub) => {
                          const Icon = sub.icon
                          return (
                            <a
                              key={sub.href}
                              href={sub.href}
                              className="flex gap-3 rounded-md px-2 py-2.5 hover:bg-muted/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <Icon className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-sm text-foreground">{sub.label}</span>
                                  {sub.badge === "current" && sub.badgeLabel && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                      {sub.badgeLabel}
                                    </span>
                                  )}
                                  {sub.badge === "muted" && sub.badgeLabel && (
                                    <span className="inline-flex items-center rounded-full border border-border bg-muted/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      {sub.badgeLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                    {/* Column: Super32 */}
                    <div className="p-4 min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <Medal className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                        Super32
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">Tournament-specific pages</p>
                      <div className="flex flex-col gap-0.5">
                        {eventsSuper32Column.map((sub) => {
                          const Icon = sub.icon
                          return (
                            <a
                              key={sub.href}
                              href={sub.href}
                              className="flex gap-3 rounded-md px-2 py-2.5 hover:bg-muted/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <Icon className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-sm text-foreground">{sub.label}</span>
                              </div>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className={navLinkClass("")}>Calendar</a>
              <a href="/blue" className={navLinkClass("/blue")}>Blue</a>
              <a href="/national-team" className={navLinkClass("/national-team")}>National Team</a>
              <a href="/recruiting/tournaments" className={navLinkClass("/recruiting/tournaments")}>Recruiting</a>
              <a href="/news" className={navLinkClass("/news")}>News</a>
              <DropdownMenu>
                <DropdownMenuTrigger className={navTriggerClass(legacyNcItems)}>
                  LegacyNC
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2 font-semibold">
                      <Users className="h-4 w-4" />
                      LegacyNC
                    </div>
                    <p className="text-xs text-muted-foreground font-normal mt-1">
                      Comprehensive history of NC Wrestling
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {legacyNcItems.map((sub) => {
                    const Icon = sub.icon
                    return (
                      <DropdownMenuItem key={sub.href} asChild>
                        <a href={sub.href} className="flex flex-1 cursor-pointer items-start gap-3 py-2">
                          <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{sub.label}</span>
                            <span className="text-xs text-muted-foreground">{sub.description}</span>
                          </div>
                        </a>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <StoreNavLink className={navLinkClass("/store-app")}>Store</StoreNavLink>
              {highlightNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 rounded-md text-sm font-semibold transition-all mobile-optimized bg-red-600 text-white hover:bg-red-700"
                  onClick={(e) => handleNav(e, item.href)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Icons: Community (hide when already on forum), Notifications, Cart + Auth. */}
          <div className="hidden md:flex items-center gap-1 sm:gap-2">
            {user && !pathname.startsWith("/forum") && (
              <a href="/forum" className="relative flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors" aria-label="Community — messaging, groups, and DMs">
                <Users2 className="h-5 w-5" />
              </a>
            )}
            {user && (
              <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors"
                    aria-label={unreadNotifications > 0 ? `Notifications (${unreadNotifications} unread)` : "Notifications"}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                        {unreadNotifications > 99 ? "99+" : unreadNotifications}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[340px] p-0" sideOffset={8}>
                  <div className="border-b px-3 py-2 flex items-center justify-between">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadNotifications > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground text-center">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => {
                        const href = n.link || "#"
                        return (
                          <a
                            key={n.id}
                            href={href}
                            onClick={() => {
                              markNotificationRead(n.id)
                              setNotificationsOpen(false)
                            }}
                            className={`block px-3 py-2.5 text-left border-b border-border/50 last:border-0 hover:bg-muted/50 ${!n.read_at ? "bg-muted/30" : ""}`}
                          >
                            <p className="text-sm font-medium">{n.title}</p>
                            {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </p>
                          </a>
                        )
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <a href="/cart" target="_top" className="relative flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors" aria-label={cartCount > 0 ? `Cart (${cartCount} items)` : "Cart"}>
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </a>
            <div className="w-px h-6 bg-white/30 mx-1" aria-hidden />
            {isLoading ? (
              <div className="flex space-x-2">
                <div className="w-20 h-9 bg-white/20 animate-pulse rounded-md"></div>
                <div className="w-20 h-9 bg-white/20 animate-pulse rounded-md"></div>
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 flex items-center space-x-2 bg-transparent border-white text-white hover:bg-white hover:text-[#003366] mobile-optimized rounded-lg"
                  >
                    <User className="h-4 w-4" />
                    <span>Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <a href="/profile">Profile</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="/forum">Community</a>
                  </DropdownMenuItem>
                  {showMyRecruits && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a href={getRecruitingPortalUrl()} className="flex items-center">
                          <Star className="h-4 w-4 mr-2" />
                          My Recruits
                        </a>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-10 border-white text-white hover:bg-white hover:text-[#003366] bg-transparent mobile-optimized rounded-lg"
                >
                  <Link href="/auth/signin" target="_top" rel="noopener">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="h-10 bg-red-600 text-white hover:bg-red-700 mobile-optimized rounded-lg">
                  <Link href="/auth/signup" target="_top" rel="noopener">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button and auth buttons */}
          <div className="md:hidden flex items-center gap-2">
            {user && !pathname.startsWith("/forum") && (
              <a href="/forum" className="relative flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 min-h-[44px] min-w-[44px]" aria-label="Community">
                <Users2 className="h-5 w-5" />
              </a>
            )}
            {/* Notifications bell - when logged in */}
            {user && (
              <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 min-h-[44px] min-w-[44px]"
                    aria-label={unreadNotifications > 0 ? `Notifications (${unreadNotifications} unread)` : "Notifications"}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                        {unreadNotifications > 99 ? "99+" : unreadNotifications}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[min(340px,100vw-24px)] p-0" sideOffset={8}>
                  <div className="border-b px-3 py-2 flex items-center justify-between">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadNotifications > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground text-center">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => {
                        const href = n.link || "#"
                        return (
                          <a
                            key={n.id}
                            href={href}
                            onClick={() => {
                              markNotificationRead(n.id)
                              setNotificationsOpen(false)
                            }}
                            className={`block px-3 py-2.5 text-left border-b border-border/50 last:border-0 hover:bg-muted/50 ${!n.read_at ? "bg-muted/30" : ""}`}
                          >
                            <p className="text-sm font-medium">{n.title}</p>
                            {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </p>
                          </a>
                        )
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {/* Cart icon (shopping cart) - always visible */}
            <a href="/cart" target="_top" className="relative flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 min-h-[44px] min-w-[44px]" aria-label={cartCount > 0 ? `Cart (${cartCount} items)` : "Cart"}>
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </a>
            {/* Sign In and Sign Up buttons - only show when not logged in */}
            {!isLoading && !user && (
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white bg-transparent mobile-optimized min-h-[44px] px-3"
                >
                  <Link href="/auth/signin" target="_top" rel="noopener">Sign In</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-red-600 text-white hover:bg-red-700 mobile-optimized min-h-[44px] px-3"
                >
                  <Link href="/auth/signup" target="_top" rel="noopener">Sign Up</Link>
                </Button>
              </div>
            )}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(true)}
                  className="mobile-optimized min-h-[44px] min-w-[44px] flex items-center gap-2 px-3 text-white hover:bg-white/10 border border-white/40"
                >
                  <Menu className="h-5 w-5" />
                  <span className="text-sm font-semibold">MENU</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[85vw] max-w-[400px] overflow-y-auto p-6"
                style={{
                  position: "fixed",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 100,
                }}
              >
                <div className="flex flex-col space-y-4 mt-8 pb-8">
                  <a href="/" className={mobileLinkClass("/")} onClick={() => setIsOpen(false)}>Home</a>
                  <div className="px-3">
                    <div className={mobileMenuParentClass(isDropdownActive(athletesItems))}>Athletes</div>
                    <div className="space-y-2">
                      {commitmentItems.map((item) => (
                        <a key={item.href} href={item.href} className={mobileSubLinkClass(item.href)} onClick={() => setIsOpen(false)}>{item.label}</a>
                      ))}
                      <a href={profilesItem.href} className={mobileSubLinkClass(profilesItem.href)} onClick={() => setIsOpen(false)}>{profilesItem.label}</a>
                      <a href={rankingsItem.href} className={mobileSubLinkClass(rankingsItem.href)} onClick={() => setIsOpen(false)}>{rankingsItem.label}</a>
                    </div>
                  </div>
                  <div className="px-3">
                    <div className={mobileMenuParentClass(isDropdownActive(eventsNavItemsForActive))}>Events</div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 pl-1">NCHSAA "States"</p>
                        <div className="space-y-1">
                          <a href="/nchsaa" className={mobileSubLinkClass("/nchsaa")} onClick={() => setIsOpen(false)}>
                            About
                          </a>
                          <a href="/nchsaa/2026" className={mobileSubLinkClass("/nchsaa/2026")} onClick={() => setIsOpen(false)}>
                            2026 Results
                          </a>
                          <a href="/nchsaa/2025" className={mobileSubLinkClass("/nchsaa/2025")} onClick={() => setIsOpen(false)}>
                            2025 Results
                          </a>
                          <a href="/nchsaa/archive" className={mobileSubLinkClass("/nchsaa/archive")} onClick={() => setIsOpen(false)}>
                            Archive
                          </a>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 pl-1">NHSCA "Nationals"</p>
                        <div className="space-y-1">
                          <a href="/nhsca" className={mobileSubLinkClass("/nhsca")} onClick={() => setIsOpen(false)}>
                            About
                          </a>
                          <a href="/nhsca/2026" className={mobileSubLinkClass("/nhsca/2026")} onClick={() => setIsOpen(false)}>
                            2026 Results
                          </a>
                          <a href="/nhsca/live" className={mobileSubLinkClass("/nhsca/live")} onClick={() => setIsOpen(false)}>
                            Live dashboard
                          </a>
                          <a href="/nhsca/2025" className={mobileSubLinkClass("/nhsca/2025")} onClick={() => setIsOpen(false)}>
                            2025 Results
                          </a>
                          <a href="/nhsca/archive" className={mobileSubLinkClass("/nhsca/archive")} onClick={() => setIsOpen(false)}>
                            Archive
                          </a>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 pl-1">Super32</p>
                        <a href="/super32" className={mobileSubLinkClass("/super32")} onClick={() => setIsOpen(false)}>
                          Champions
                        </a>
                      </div>
                    </div>
                  </div>
                  <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className={mobileLinkClass("")} onClick={() => setIsOpen(false)}>Calendar</a>
                  <a href="/blue" className={mobileLinkClass("/blue")} onClick={() => setIsOpen(false)}>Blue</a>
                  <a href="/national-team" className={mobileLinkClass("/national-team")} onClick={() => setIsOpen(false)}>National Team</a>
                  <a href="/recruiting/tournaments" className={mobileLinkClass("/recruiting/tournaments")} onClick={() => setIsOpen(false)}>Recruiting</a>
                  <a href="/news" className={mobileLinkClass("/news")} onClick={() => setIsOpen(false)}>News</a>
                  {user && (
                    <>
                      <a href="/forum" className={mobileLinkClass("/forum") + " flex items-center gap-2"} onClick={() => setIsOpen(false)}>
                        <Users2 className="h-5 w-5 shrink-0" />
                        <span>Community</span>
                      </a>
                    </>
                  )}
                  <div className="px-3">
                    <div className={mobileMenuParentClass(isDropdownActive(legacyNcItems))}>LegacyNC</div>
                    <div className="space-y-2">
                      {legacyNcItems.map((sub) => (
                        <a key={sub.href} href={sub.href} className={mobileSubLinkClass(sub.href)} onClick={() => setIsOpen(false)}>{sub.label}</a>
                      ))}
                    </div>
                  </div>
                  <StoreNavLink className={mobileLinkClass("/store-app") + " block min-h-[44px] w-full text-left"} onNavigate={() => setIsOpen(false)}>Store</StoreNavLink>
                  <a href="/cart" target="_top" className={mobileLinkClass("/cart") + " flex items-center gap-2 min-h-[44px] w-full text-left"} onClick={() => setIsOpen(false)} aria-label={cartCount > 0 ? `Cart (${cartCount} items)` : "Cart"}>
                    <ShoppingCart className="h-5 w-5 shrink-0" />
                    <span>Cart{cartCount > 0 ? ` (${cartCount})` : ""}</span>
                  </a>
                  {highlightNavItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="px-3 py-2 rounded-md text-base font-semibold transition-all mobile-optimized min-h-[44px] flex items-center bg-red-600 text-white hover:bg-red-700"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </a>
                  ))}
                  <div className="border-t pt-4 mt-4">
                    {!user && !isLoading ? (
                      <div className="space-y-2">
                        <a
                          href="/auth/signin"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-center w-full min-h-[44px] rounded-md border border-red-600 text-red-600 hover:bg-red-600 hover:text-white bg-transparent px-4 py-2 text-sm font-medium"
                        >
                          Sign In
                        </a>
                        <a
                          href="/auth/signup"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-center w-full min-h-[44px] rounded-md bg-red-600 text-white hover:bg-red-700 px-4 py-2 text-sm font-medium"
                        >
                          Sign Up
                        </a>
                      </div>
                    ) : user ? (
                      <div className="space-y-2">
                        <Button
                          asChild
                          variant="outline"
                          className="w-full bg-transparent mobile-optimized min-h-[44px]"
                        >
                          <a href="/profile" onClick={() => setIsOpen(false)}>
                            <User className="h-4 w-4 mr-2" />
                            Profile
                          </a>
                        </Button>
                        {showMyRecruits && (
                          <Button
                            asChild
                            variant="outline"
                            className="w-full bg-transparent mobile-optimized min-h-[44px]"
                          >
                            <a href={getRecruitingPortalUrl()} onClick={() => setIsOpen(false)}>
                              <Star className="h-4 w-4 mr-2" />
                              My Recruits
                            </a>
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            handleSignOut()
                            setIsOpen(false)
                          }}
                          variant="outline"
                          className="w-full text-red-600 border-red-600 hover:bg-red-600 hover:text-white mobile-optimized min-h-[44px]"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-full h-9 bg-gray-200 animate-pulse rounded-md"></div>
                        <div className="w-full h-9 bg-gray-200 animate-pulse rounded-md"></div>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
