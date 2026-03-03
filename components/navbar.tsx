"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User, LogOut, Star, ChevronDown, Users, Trophy, Medal } from "lucide-react"
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

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname() ?? ""
  const { user, signOut, isLoading, profile } = useAuth()
  const cartItems = useCartStore((s) => s.items)
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)

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

  // Force full-page nav so nothing (Radix, router) can intercept. Use for every internal nav link.
  const handleNav = (e: React.MouseEvent, url: string) => {
    e.preventDefault()
    window.location.href = url
  }
  const handleNavMobile = (e: React.MouseEvent, url: string) => {
    e.preventDefault()
    setIsOpen(false)
    window.location.href = url
  }

  // Primary nav: Home, Athletes, Events (States + Nationals), Calendar, Programs, News, Store, LegacyNC.
  const commitmentItems = [
    { href: "/athletes", label: "All Commitments" },
    { href: "/high-schools", label: "By High School" },
    { href: "/colleges", label: "By College" },
  ]
  const profilesItem = { href: "/prospects/all", label: "Athlete Profiles" }
  const rankingsItem = { href: "/public-rankings", label: "Rankings" }
  const athletesItems = [...commitmentItems, profilesItem, rankingsItem]
  const programsItems = [
    { href: "/blue", label: "Blue Program", description: "NC United Blue membership", icon: Users },
    { href: "/national-team", label: "National Team", description: "NC United National Team Portal", icon: Trophy },
  ]
  const calendarUrl = "https://calendar.ncwrestlingunited.com"

  const nationalTeamItems = [
    { href: "/national-team", label: "About", description: "Learn about the NC United National Team", icon: Users },
    { href: "/national-team/ucd-2024-results", label: "UCD 2024", description: "Ultimate Club Duals 2024 results and highlights", icon: Trophy },
    { href: "/national-team/ucd-2025-results", label: "UCD 2025", description: "Ultimate Club Duals 2025 results and highlights", icon: Trophy },
    { href: "/national-team/nhsca-2025-results", label: "NHSCA 2025", description: "NHSCA Duals 2025 results and highlights", icon: Medal },
    { href: "/national-team/interest-form", label: "Interest Form", description: "Express interest in Spring/Summer 2026 National Team", icon: Users },
  ]

  const nationalsItems = [
    { href: "/nhsca", label: "Tournament Overview", description: "About NHSCA Nationals & divisions", icon: Trophy },
    { href: "/nhsca/2025", label: "2025 Results", description: "Current year results & All-Americans", icon: Medal },
    { href: "/nhsca/archive", label: "Digital Archive", description: "Complete history 1990–2025", icon: Trophy },
    { href: "/super32", label: "Super32 Champions", description: "All-time Super32 Champions from NC", icon: Medal },
  ]

  const statesItems = [
    { href: "/nchsaa", label: "Tournament Overview", description: "NCHSAA State Championships & 8-class system", icon: Trophy },
    { href: "/nchsaa/2026", label: "2026 Results", description: "2026 State Championship results", icon: Medal },
    { href: "/nchsaa/2025", label: "2025 Results", description: "2025 State Championship results", icon: Medal },
    { href: "/nchsaa/archive", label: "Digital Archive", description: "Search historical state results", icon: Trophy },
  ]

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
        <div className="flex justify-between items-center h-16">
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
              <a href="/" className={navLinkClass("/")} onClick={(e) => handleNav(e, "/")}>Home</a>
              <DropdownMenu>
                <DropdownMenuTrigger className={navTriggerClass(athletesItems)}>
                  Athletes
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="font-normal text-muted-foreground">Commitments</DropdownMenuLabel>
                  {commitmentItems.map((item) => (
                    <div key={item.href} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
                      <a href={item.href} className="block w-full" onClick={(e) => handleNav(e, item.href)}>{item.label}</a>
                    </div>
                  ))}
                  <DropdownMenuSeparator />
                  <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
                    <a href={profilesItem.href} className="block w-full" onClick={(e) => handleNav(e, profilesItem.href)}>{profilesItem.label}</a>
                  </div>
                  <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
                    <a href={rankingsItem.href} className="block w-full" onClick={(e) => handleNav(e, rankingsItem.href)}>{rankingsItem.label}</a>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger className={navTriggerClass([...statesItems, ...nationalsItems])}>
                  Events
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2 font-semibold">
                      <Trophy className="h-4 w-4" />
                      States
                    </div>
                    <p className="text-xs text-muted-foreground font-normal mt-1">NCHSAA State Championships</p>
                  </DropdownMenuLabel>
                  {statesItems.map((sub) => {
                    const Icon = sub.icon
                    return (
                      <div key={sub.href} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
                        <a href={sub.href} className="flex flex-1 items-start gap-3 py-2" onClick={(e) => handleNav(e, sub.href)}>
                          <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{sub.label}</span>
                            <span className="text-xs text-muted-foreground">{sub.description}</span>
                          </div>
                        </a>
                      </div>
                    )
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2 font-semibold">
                      <Trophy className="h-4 w-4" />
                      Nationals
                    </div>
                    <p className="text-xs text-muted-foreground font-normal mt-1">NHSCA Nationals &amp; Super32</p>
                  </DropdownMenuLabel>
                  {nationalsItems.map((sub) => {
                    const Icon = sub.icon
                    return (
                      <div key={sub.href} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
                        <a href={sub.href} className="flex flex-1 items-start gap-3 py-2" onClick={(e) => handleNav(e, sub.href)}>
                          <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{sub.label}</span>
                            <span className="text-xs text-muted-foreground">{sub.description}</span>
                          </div>
                        </a>
                      </div>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className={navLinkClass("")}>Calendar</a>
              <DropdownMenu>
                <DropdownMenuTrigger className={navTriggerClass([...programsItems, ...nationalTeamItems])}>
                  Programs
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="font-normal font-semibold">Programs</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
                    <a href="/blue" className="block w-full" onClick={(e) => handleNav(e, "/blue")}>Blue Program</a>
                  </div>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">National Team</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56">
                      {nationalTeamItems.map((sub) => (
                        <div key={sub.href} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
                          <a href={sub.href} className="block w-full" onClick={(e) => handleNav(e, sub.href)}>{sub.label}</a>
                        </div>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
              <a href="/news" className={navLinkClass("/news")} onClick={(e) => handleNav(e, "/news")}>News</a>
              <a href="/go/store" className={`${navLinkClass("/store")} cursor-pointer`} onClick={(e) => handleNav(e, "/go/store")}>Store</a>
              <a href="/cart" className={navLinkClass("/cart")} onClick={(e) => handleNav(e, "/cart")}>
                Cart
                {cartCount > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1.5 text-xs text-white">
                    {cartCount}
                  </span>
                )}
              </a>
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
                      <div key={sub.href} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
                        <a href={sub.href} className="flex flex-1 items-start gap-3 py-2" onClick={(e) => handleNav(e, sub.href)}>
                          <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{sub.label}</span>
                            <span className="text-xs text-muted-foreground">{sub.description}</span>
                          </div>
                        </a>
                      </div>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
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

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
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
                    className="flex items-center space-x-2 bg-transparent border-white text-white hover:bg-white hover:text-[#003366] mobile-optimized"
                  >
                    <User className="h-4 w-4" />
                    <span>Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  {showMyRecruits && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={getRecruitingPortalUrl()} className="flex items-center">
                          <Star className="h-4 w-4 mr-2" />
                          My Recruits
                        </Link>
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
              <div className="flex space-x-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-white text-white hover:bg-white hover:text-[#003366] bg-transparent mobile-optimized"
                >
                  <Link href="/auth/signin" target="_top" rel="noopener">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="bg-red-600 text-white hover:bg-red-700 mobile-optimized">
                  <Link href="/auth/signup" target="_top" rel="noopener">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button and auth buttons */}
          <div className="md:hidden flex items-center gap-2">
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
                    <div className={mobileMenuParentClass(isDropdownActive([...statesItems, ...nationalsItems]))}>Events</div>
                    <div className="space-y-2">
                      {statesItems.map((sub) => (
                        <a key={sub.href} href={sub.href} className={mobileSubLinkClass(sub.href)} onClick={() => setIsOpen(false)}>{sub.label}</a>
                      ))}
                      {nationalsItems.map((sub) => (
                        <a key={sub.href} href={sub.href} className={mobileSubLinkClass(sub.href)} onClick={() => setIsOpen(false)}>{sub.label}</a>
                      ))}
                    </div>
                  </div>
                  <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className={mobileLinkClass("")} onClick={() => setIsOpen(false)}>Calendar</a>
                  <div className="px-3">
                    <div className={mobileMenuParentClass(isDropdownActive([...programsItems, ...nationalTeamItems]))}>Programs</div>
                    <div className="space-y-2">
                      <a href="/blue" className={mobileSubLinkClass("/blue")} onClick={() => setIsOpen(false)}>Blue Program</a>
                      <div className="pl-4 border-l-2 border-white/20 mt-2 space-y-1">
                        <p className="text-xs font-bold text-white/90 mb-1">National Team</p>
                        {nationalTeamItems.map((sub) => (
                          <a key={sub.href} href={sub.href} className={mobileSubLinkClass(sub.href)} onClick={() => setIsOpen(false)}>{sub.label}</a>
                        ))}
                      </div>
                    </div>
                  </div>
                  <a href="/news" className={mobileLinkClass("/news")} onClick={() => setIsOpen(false)}>News</a>
                  <a href="/go/store" className={`${mobileLinkClass("/store")} block min-h-[44px] flex items-center`} onClick={(e) => { handleNav(e, "/go/store"); setIsOpen(false); }}>Store</a>
                  <a href="/cart" className={mobileLinkClass("/cart")} onClick={(e) => { e.preventDefault(); setIsOpen(false); window.location.href = "/cart"; }}>
                    Cart{cartCount > 0 ? ` (${cartCount})` : ""}
                  </a>
                  <div className="px-3">
                    <div className={mobileMenuParentClass(isDropdownActive(legacyNcItems))}>LegacyNC</div>
                    <div className="space-y-2">
                      {legacyNcItems.map((sub) => (
                        <a key={sub.href} href={sub.href} className={mobileSubLinkClass(sub.href)} onClick={() => setIsOpen(false)}>{sub.label}</a>
                      ))}
                    </div>
                  </div>
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
                          target="_top"
                          rel="noopener"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-center w-full min-h-[44px] rounded-md border border-red-600 text-red-600 hover:bg-red-600 hover:text-white bg-transparent px-4 py-2 text-sm font-medium"
                        >
                          Sign In
                        </a>
                        <a
                          href="/auth/signup"
                          target="_top"
                          rel="noopener"
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
                          <Link href="/profile" onClick={() => setIsOpen(false)}>
                            <User className="h-4 w-4 mr-2" />
                            Profile
                          </Link>
                        </Button>
                        {showMyRecruits && (
                          <Button
                            asChild
                            variant="outline"
                            className="w-full bg-transparent mobile-optimized min-h-[44px]"
                          >
                            <Link href={getRecruitingPortalUrl()} onClick={() => setIsOpen(false)}>
                              <Star className="h-4 w-4 mr-2" />
                              My Recruits
                            </Link>
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
