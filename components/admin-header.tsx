"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const adminNavItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: "🏠",
  },
  {
    title: "Profile Submissions",
    href: "/admin/profile-submissions",
    icon: "📝",
  },
  {
    title: "Profile Confirmations",
    href: "/admin/profile-confirmations",
    icon: "✅",
  },
  {
    title: "Athletes",
    href: "/admin/athletes",
    icon: "👥",
  },
  {
    title: "Stats",
    href: "/admin/stats",
    icon: "📊",
  },
  {
    title: "Media Manager",
    href: "/admin/unified-media-manager",
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
            <Link href="/admin" className="text-xl font-bold text-gray-900">
              NC Wrestling Admin
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
