"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Shield, GraduationCap, Building, Users, Trophy, BarChart3, Settings, Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AuthNav } from "@/components/auth-nav"

export function PortalNavigation() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const navItems = [
    { href: "/", label: "Dashboard", icon: BarChart3 },
    { href: "/athletes", label: "Commits", icon: Users },
    { href: "/colleges", label: "Colleges", icon: GraduationCap },
    { href: "/high-schools", label: "High Schools", icon: Building },
    { href: "/clubs", label: "Wrestling Clubs", icon: Shield },
    { href: "/stats", label: "Statistics", icon: Trophy },
  ]

  return (
    <div className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Mobile navigation */}
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] sm:w-[300px]">
                <div className="flex flex-col gap-4 py-4">
                  {navItems.map((item) => {
                    const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center justify-start py-6 px-3 rounded-md text-base w-full cursor-pointer",
                          isActive ? "bg-[#0a1e50] text-white" : "text-[#0a1e50] hover:bg-[#0a1e50]/10",
                        )}
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        <span className="text-base">{item.label}</span>
                      </a>
                    )
                  })}

                  {/* Admin button at the bottom */}
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant={pathname.startsWith("/admin") ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "justify-start py-6 w-full",
                        pathname.startsWith("/admin") ? "bg-[#0a1e50] text-white" : "text-[#0a1e50] border-[#0a1e50]",
                      )}
                      asChild
                      onClick={() => setOpen(false)}
                    >
                      <Link href="/admin">
                        <Settings className="mr-3 h-5 w-5" />
                        <span className="text-base">Admin Portal</span>
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="pt-4 border-t">
                    <AuthNav />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                    isActive ? "bg-[#0a1e50] text-white" : "text-[#0a1e50] hover:bg-[#0a1e50]/10",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
            <AuthNav />
          </div>

          {/* Admin button on the right — plain <a> so navigation always works */}
          <div>
            <a
              href="/admin"
              className={cn(
                "inline-flex items-center justify-center rounded-md py-2 px-4 text-sm font-medium border",
                pathname.startsWith("/admin") ? "bg-[#0a1e50] text-white border-[#0a1e50]" : "text-[#0a1e50] border-[#0a1e50] hover:bg-[#0a1e50]/10",
              )}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Admin</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
