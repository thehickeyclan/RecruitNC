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
        <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
        <nav className="flex flex-col h-full">
          <a
            href="/"
            className="flex items-center gap-2 p-4 bg-[#003366] text-white"
            onClick={() => setIsOpen(false)}
          >
            <img src="/images/nc-united-logo-white.png" alt="NC United" className="h-9 w-auto mix-blend-screen" />
            <span className="text-lg font-semibold">NC United Wrestling</span>
          </a>
          {user && (
            <div className="border-b px-4 pb-4">
              <div className="px-3 py-2 text-sm text-gray-600 truncate" title={user.email ?? ""}>
                Signed in as {user.email}
              </div>
              <div className="flex flex-col gap-2">
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
                  type="button"
                  onClick={() => {
                    void signOut()
                    setIsOpen(false)
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2 p-4 flex-1 overflow-y-auto">
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

          {!user && (
            <div className="mt-auto border-t pt-4 px-4 pb-4">
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
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-[#003366] shadow-md">
      <div className="container flex h-14 items-center">
        <a href="/" className="flex items-center gap-2 mr-6">
          <img src="/images/nc-united-logo-white.png" alt="NC United" className="h-9 w-auto mix-blend-screen" />
          <span className="hidden sm:inline-block font-bold text-lg text-white">NC United Wrestling</span>
          <span className="sm:hidden font-bold text-lg text-white">NC United</span>
        </a>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-md text-white hover:bg-white/10 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-16 h-8 bg-white/20 animate-pulse rounded"></div>
              <div className="w-16 h-8 bg-white/20 animate-pulse rounded"></div>
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10 hover:text-white">
                  <User className="h-4 w-4" />
                  <span className="hidden lg:inline">{user.email?.split("@")[0] || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <a href="/profile" className="cursor-pointer flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </a>
                </DropdownMenuItem>
                {isCoach && (
                  <DropdownMenuItem asChild>
                    <a href="/coaches" className="cursor-pointer flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Coach&apos;s Portal
                    </a>
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <a href="/admin" className="cursor-pointer flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Admin
                    </a>
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
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-[#003366] bg-transparent">Sign In</Button>
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
