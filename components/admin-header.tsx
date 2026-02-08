"use client"

import Link from "next/link"
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
    title: "Blue Page",
    href: "/admin/blue",
    icon: "🖼️",
  },
]

export function AdminHeader() {
  const pathname = usePathname()

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <Link href="https://www.ncwrestlingunited.com" className="flex items-center space-x-2">
              <Image
                src="/nc-united-main-logo.png"
                alt="NC United"
                width={32}
                height={32}
                className="h-8 w-auto"
                priority
              />
              <span className="text-xl font-bold text-gray-900">NC Wrestling Admin</span>
            </Link>

            <nav className="hidden md:flex space-x-6">
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              View Site
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
