"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Menu, User, LogOut, Settings, Trophy, Users, School, Building2, BarChart3, GraduationCap } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function AuthNav() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, loading, signOut, isAdmin } = useAuth()

  const isCoach = user?.user_metadata?.role === "coach" || user?.user_metadata?.role === "admin" || isAdmin

  const navItems = [
    { href: "/athletes", label: "Athletes", icon: Users },
    { href: "/colleges", label: "Colleges", icon: Building2 },
    { href: "/high-schools", label: "High Schools", icon: School },
    { href: "/clubs", label: "Clubs", icon: Trophy },
    { href: "/stats", label: "Stats", icon: BarChart3 },
  ]

  const MobileNav = () => (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <nav className="flex flex-col gap-4">
          <a
            href="https://www.ncwrestlingunited.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-lg font-semibold"
            onClick={() => setIsOpen(false)}
          >
            <img src="/nc-united-main-logo.png" alt="NC United" className="h-8 w-8" />
            NC United Wrestling
          </a>

          <div className="flex flex-col gap-2 mt-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="mt-auto pt-4 border-t">
            {user ? (
              <div className="flex flex-col gap-2">
                <div className="px-3 py-2 text-sm text-gray-600">Signed in as {user.email}</div>
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                {isCoach && (
                  <Link
                    href="/coaches"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <GraduationCap className="h-4 w-4" />
                    Coach&apos;s Portal
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Admin
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/auth/signin" target="_top" rel="noopener" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full bg-transparent">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup" target="_top" rel="noopener" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-red-600 hover:bg-red-700">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <a
          href="https://www.ncwrestlingunited.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mr-6"
        >
          <img src="/nc-united-main-logo.png" alt="NC United" className="h-8 w-8" />
          <span className="hidden sm:inline-block font-bold text-lg">NC United Wrestling</span>
          <span className="sm:hidden font-bold text-lg">NC United</span>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
              <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden lg:inline">{user.email?.split("@")[0] || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {isCoach && (
                  <DropdownMenuItem asChild>
                    <Link href="/coaches" className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Coach&apos;s Portal
                    </Link>
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/signin" target="_top" rel="noopener">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/signup" target="_top" rel="noopener">
                <Button className="bg-red-600 hover:bg-red-700">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>

        <MobileNav />
      </div>
    </header>
  )
}
