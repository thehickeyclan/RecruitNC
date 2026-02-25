"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User, LogOut, Star, ChevronDown, Users, Trophy, Medal } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [statesOpen, setStatesOpen] = useState(false)
  const statesMenuRef = useRef<HTMLDivElement>(null)
  const { user, signOut, isLoading, profile } = useAuth()

  useEffect(() => {
    if (!statesOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (statesMenuRef.current?.contains(e.target as Node)) return
      setStatesOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [statesOpen])

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

  // Top-level nav: Home, Prospects (dropdown), Rankings, Blue (plain <a>), National Team (dropdown).
  const mainNavLinks = [
    { href: "/", label: "Home" },
    { href: "/public-rankings", label: "Rankings" },
  ]
  const prospectsItems = [
    { href: "/prospects/all", label: "Athlete Profiles" },
  ]
  const commitmentItems = [
    { href: "/athletes", label: "All Commitments" },
    { href: "/high-schools", label: "By High School" },
    { href: "/colleges", label: "By College" },
  ]

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
    <nav className="bg-white shadow-sm border-b touch-scroll sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="https://www.ncwrestlingunited.com" className="flex items-center space-x-2 mobile-optimized">
              <Image
                src="/images/nc-united-logo.png"
                alt="NC United"
                width={120}
                height={48}
                className="h-12 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Desktop Navigation — Dropdown items that navigate MUST use <a href>, not Link (Radix blocks navigation otherwise). See .cursorrules. */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized"
              >
                Home
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized flex items-center gap-1">
                  Prospects
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="font-normal text-muted-foreground">
                    Profiles &amp; commitments
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {prospectsItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <a href={item.href} className="cursor-pointer">
                        {item.label}
                      </a>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="font-normal text-muted-foreground">
                    Commitments
                  </DropdownMenuLabel>
                  {commitmentItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <a href={item.href} className="cursor-pointer">
                        {item.label}
                      </a>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {mainNavLinks.slice(1).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href="/blue"
                className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized"
              >
                Blue Program
              </a>
              <DropdownMenu>
                <DropdownMenuTrigger className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized flex items-center gap-1">
                  Nationals
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2 font-semibold">
                      <Trophy className="h-4 w-4" />
                      Nationals
                    </div>
                    <p className="text-xs text-muted-foreground font-normal mt-1">
                      NHSCA Nationals &amp; Super32
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {nationalsItems.map((sub) => {
                    const Icon = sub.icon
                    return (
                      <DropdownMenuItem key={sub.href} asChild>
                        <a href={sub.href} className="cursor-pointer flex items-start gap-3 py-2">
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
              <div className="relative" ref={statesMenuRef}>
                <button
                  type="button"
                  onClick={() => setStatesOpen((o) => !o)}
                  className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized flex items-center gap-1"
                >
                  States
                  <ChevronDown className="h-4 w-4" />
                </button>
                {statesOpen && (
                  <div className="absolute left-0 top-full mt-1 z-50 min-w-[18rem] overflow-hidden rounded-md border bg-white p-1 text-popover-foreground shadow-md">
                    <div className="px-2 py-1.5">
                      <div className="flex items-center gap-2 font-semibold">
                        <Trophy className="h-4 w-4" />
                        States
                      </div>
                      <p className="text-xs text-muted-foreground font-normal mt-1">
                        NCHSAA State Championships
                      </p>
                    </div>
                    <div className="my-1 h-px bg-muted" />
                    {statesItems.map((sub) => {
                      const Icon = sub.icon
                      return (
                        <a
                          key={sub.href}
                          href={sub.href}
                          className="flex cursor-pointer items-start gap-3 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{sub.label}</span>
                            <span className="text-xs text-muted-foreground">{sub.description}</span>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized flex items-center gap-1">
                  Legacy NC
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2 font-semibold">
                      <Users className="h-4 w-4" />
                      Legacy NC
                    </div>
                    <p className="text-xs text-muted-foreground font-normal mt-1">
                      Athletes, schools &amp; awards
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {legacyNcItems.map((sub) => {
                    const Icon = sub.icon
                    return (
                      <DropdownMenuItem key={sub.href} asChild>
                        <a href={sub.href} className="cursor-pointer flex items-start gap-3 py-2">
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
              <DropdownMenu>
                <DropdownMenuTrigger className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized flex items-center gap-1">
                  National Team
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2 font-semibold">
                      <Users className="h-4 w-4" />
                      National Team
                    </div>
                    <p className="text-xs text-muted-foreground font-normal mt-1">
                      NC United National Team Portal
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {nationalTeamItems.map((sub) => {
                    const Icon = sub.icon
                    return (
                      <DropdownMenuItem key={sub.href} asChild>
                        <a href={sub.href} className="cursor-pointer flex items-start gap-3 py-2">
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
              {highlightNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 rounded-md text-sm font-semibold transition-all mobile-optimized bg-red-600 text-white hover:bg-red-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoading ? (
              <div className="flex space-x-2">
                <div className="w-20 h-9 bg-gray-200 animate-pulse rounded-md"></div>
                <div className="w-20 h-9 bg-gray-200 animate-pulse rounded-md"></div>
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2 bg-transparent mobile-optimized"
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
                  className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white bg-transparent mobile-optimized"
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
                  className="mobile-optimized min-h-[44px] min-w-[44px] flex items-center gap-2 px-3 bg-red-600 text-white hover:bg-red-700 hover:text-white"
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
                  <Link
                    href="/"
                    className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-base font-medium transition-colors mobile-optimized min-h-[44px] flex items-center"
                    onClick={() => setIsOpen(false)}
                  >
                    Home
                  </Link>
                  <div className="px-3">
                    <div className="text-gray-600 font-medium text-sm mb-2">Prospects</div>
                    <div className="pl-4 space-y-2">
                      {prospectsItems.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          className="text-gray-600 hover:text-red-600 py-2 rounded-md text-base transition-colors mobile-optimized min-h-[44px] flex items-center block"
                          onClick={() => setIsOpen(false)}
                        >
                          {item.label}
                        </a>
                      ))}
                      <div className="text-gray-500 text-xs font-medium mt-3 mb-1">Commitments</div>
                      {commitmentItems.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          className="text-gray-600 hover:text-red-600 py-2 rounded-md text-base transition-colors mobile-optimized min-h-[44px] flex items-center block"
                          onClick={() => setIsOpen(false)}
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>
                  {mainNavLinks.slice(1).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-base font-medium transition-colors mobile-optimized min-h-[44px] flex items-center"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <a
                    href="/blue"
                    className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-base font-medium transition-colors mobile-optimized min-h-[44px] flex items-center"
                    onClick={() => setIsOpen(false)}
                  >
                    Blue Program
                  </a>
                  <div className="px-3">
                    <div className="text-gray-600 font-medium text-sm mb-2">Nationals</div>
                    <div className="pl-4 space-y-2">
                      {nationalsItems.map((sub) => (
                        <a
                          key={sub.href}
                          href={sub.href}
                          className="text-gray-600 hover:text-red-600 py-2 rounded-md text-base transition-colors mobile-optimized min-h-[44px] flex items-center block"
                          onClick={() => setIsOpen(false)}
                        >
                          {sub.label}
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="px-3">
                    <div className="text-gray-600 font-medium text-sm mb-2">States</div>
                    <div className="pl-4 space-y-2">
                      {statesItems.map((sub) => (
                        <a
                          key={sub.href}
                          href={sub.href}
                          className="text-gray-600 hover:text-red-600 py-2 rounded-md text-base transition-colors mobile-optimized min-h-[44px] flex items-center block"
                          onClick={(e) => {
                            e.preventDefault()
                            setIsOpen(false)
                            window.location.href = sub.href
                          }}
                        >
                          {sub.label}
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="px-3">
                    <div className="text-gray-600 font-medium text-sm mb-2">Legacy NC</div>
                    <div className="pl-4 space-y-2">
                      {legacyNcItems.map((sub) => (
                        <a
                          key={sub.href}
                          href={sub.href}
                          className="text-gray-600 hover:text-red-600 py-2 rounded-md text-base transition-colors mobile-optimized min-h-[44px] flex items-center block"
                          onClick={() => setIsOpen(false)}
                        >
                          {sub.label}
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="px-3">
                    <div className="text-gray-600 font-medium text-sm mb-2">National Team</div>
                    <div className="pl-4 space-y-2">
                      {nationalTeamItems.map((sub) => (
                        <a
                          key={sub.href}
                          href={sub.href}
                          className="text-gray-600 hover:text-red-600 py-2 rounded-md text-base transition-colors mobile-optimized min-h-[44px] flex items-center block"
                          onClick={() => setIsOpen(false)}
                        >
                          {sub.label}
                        </a>
                      ))}
                    </div>
                  </div>
                  {highlightNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="px-3 py-2 rounded-md text-base font-semibold transition-all mobile-optimized min-h-[44px] flex items-center bg-red-600 text-white hover:bg-red-700"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="border-t pt-4 mt-4">
                    {!user && !isLoading ? (
                      <div className="space-y-2">
                        <Button
                          asChild
                          variant="outline"
                          className="w-full border-red-600 text-red-600 hover:bg-red-600 hover:text-white bg-transparent mobile-optimized min-h-[44px]"
                        >
                          <Link href="/auth/signin" target="_top" rel="noopener" onClick={() => setIsOpen(false)}>
                            Sign In
                          </Link>
                        </Button>
                        <Button
                          asChild
                          className="w-full bg-red-600 text-white hover:bg-red-700 mobile-optimized min-h-[44px]"
                        >
                          <Link href="/auth/signup" target="_top" rel="noopener" onClick={() => setIsOpen(false)}>
                            Sign Up
                          </Link>
                        </Button>
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
