"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User, LogOut, Star, ChevronDown, Users, Trophy, Medal, FileEdit } from "lucide-react"
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
  const { user, signOut, isLoading, profile } = useAuth()

  const showMyRecruits =
    profile?.role === "admin" ||
    profile?.role === "college_coach" ||
    profile?.role === "coach" ||
    profile?.is_admin === true

  useEffect(() => {
    if (profile) {
      console.log("[v0] Profile loaded:", {
        role: profile.role,
        is_admin: profile.is_admin,
        showMyRecruits,
      })
    }
  }, [profile, showMyRecruits])

  useEffect(() => {
    console.log("[v0] Mobile menu state changed:", isOpen)
  }, [isOpen])

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
      console.error("Error signing out:", error)
    }
  }

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/commits", label: "Commits" },
    { href: "/public-rankings", label: "Rankings" },
    { href: "/blue", label: "Blue Program" },
    { href: "/national-team", label: "National Team" },
    { href: "/prospects/all", label: "Athlete Profiles" },
    { href: "/my-recruits", label: "My Recruits" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ]

  const nationalTeamItems = [
    { href: "/national-team", label: "About", description: "Learn about the NC United National Team", icon: Users },
    { href: "/national-team/ucd-2024-results", label: "UCD 2024", description: "Ultimate Club Duals 2024 results and highlights", icon: Trophy },
    { href: "/national-team/ucd-2025-results", label: "UCD 2025", description: "Ultimate Club Duals 2025 results and highlights", icon: Trophy },
    { href: "/national-team/nhsca-2025-results", label: "NHSCA 2025", description: "NHSCA Duals 2025 results and highlights", icon: Medal },
    { href: "/national-team/interest-form", label: "Interest Form", description: "Express interest in Spring/Summer 2026 National Team", icon: Users },
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

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.slice(0, 1).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized"
                >
                  {item.label}
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized flex items-center gap-1">
                  Commits
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/athletes" className="cursor-pointer">
                      Athletes
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/high-schools" className="cursor-pointer">
                      High Schools
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/colleges" className="cursor-pointer">
                      Colleges
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {navItems.slice(2).map((item) =>
                item.href === "/national-team" ? (
                  <DropdownMenu key="national-team">
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
                            <Link href={sub.href} className="cursor-pointer flex items-start gap-3 py-2">
                              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{sub.label}</span>
                                <span className="text-xs text-muted-foreground">{sub.description}</span>
                              </div>
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors mobile-optimized"
                  >
                    {item.label}
                  </Link>
                )
              )}
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
                  onClick={() => {
                    console.log("[v0] Menu button clicked, current state:", isOpen)
                    setIsOpen(true)
                  }}
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
                  {navItems.slice(0, 1).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-base font-medium transition-colors mobile-optimized min-h-[44px] flex items-center"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="px-3">
                    <div className="text-gray-600 font-medium text-sm mb-2">Commits</div>
                    <div className="pl-4 space-y-2">
                      <Link
                        href="/athletes"
                        className="text-gray-600 hover:text-red-600 py-2 rounded-md text-base transition-colors mobile-optimized min-h-[44px] flex items-center"
                        onClick={() => setIsOpen(false)}
                      >
                        Athletes
                      </Link>
                      <Link
                        href="/high-schools"
                        className="text-gray-600 hover:text-red-600 py-2 rounded-md text-base transition-colors mobile-optimized min-h-[44px] flex items-center"
                        onClick={() => setIsOpen(false)}
                      >
                        High Schools
                      </Link>
                      <Link
                        href="/colleges"
                        className="text-gray-600 hover:text-red-600 py-2 rounded-md text-base transition-colors mobile-optimized min-h-[44px] flex items-center"
                        onClick={() => setIsOpen(false)}
                      >
                        Colleges
                      </Link>
                    </div>
                  </div>
                  <div className="px-3">
                    <div className="text-gray-600 font-medium text-sm mb-2">National Team</div>
                    <div className="pl-4 space-y-2">
                      {nationalTeamItems.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className="text-gray-600 hover:text-red-600 py-2 rounded-md text-base transition-colors mobile-optimized min-h-[44px] flex items-center"
                          onClick={() => setIsOpen(false)}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                  {navItems.slice(2)
                    .filter((item) => item.href !== "/national-team")
                    .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-base font-medium transition-colors mobile-optimized min-h-[44px] flex items-center"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
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
