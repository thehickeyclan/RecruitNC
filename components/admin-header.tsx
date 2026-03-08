"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const adminNavItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: "🏠",
  },
  {
    title: "Submissions",
    href: "/admin/submissions-manager",
    icon: "📝",
  },
  {
    title: "Athletes",
    href: "/admin/athletes",
    icon: "👥",
  },
  {
    title: "Schools",
    href: "/admin/schools",
    icon: "🏫",
  },
  {
    title: "Statistics",
    href: "/admin/commitment-stats",
    icon: "📊",
  },
  {
    title: "NHSCA Analytics",
    href: "/admin/nhsca-analytics",
    icon: "🏆",
  },
  {
    title: "NHSCA Placements",
    href: "/admin/nhsca-placements",
    icon: "📋",
  },
  {
    title: "Logo Manager",
    href: "/admin/enhanced-logo-manager",
    icon: "🎨",
  },
  {
    title: "Blue Program",
    href: "/admin/blue",
    icon: "💳",
  },
  {
    title: "Messaging",
    href: "/admin/messaging",
    icon: "📬",
  },
  {
    title: "NCHSAA",
    href: "/admin/nchsaa",
    icon: "📑",
  },
]

export function AdminHeader() {
  const pathname = usePathname()

  return (
    <header className="bg-[#003366] shadow-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center space-x-8">
            <a href="/" className="flex items-center space-x-3">
              <Image
                src="/images/nc-united-logo-white.png"
                alt="NC United"
                width={120}
                height={44}
                className="h-9 w-auto object-contain mix-blend-screen"
                priority
              />
              <span className="text-lg font-bold text-white hidden sm:inline">Admin</span>
            </a>

            <nav className="hidden md:flex space-x-1">
              {adminNavItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => { window.location.href = item.href }}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-transparent border-0 cursor-pointer",
                    pathname === item.href
                      ? "bg-white/20 text-white"
                      : "text-white hover:bg-white/10",
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.title}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <a href="/" className="text-sm text-white hover:bg-white/10 px-3 py-2 rounded-md transition-colors">
              View Site
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
