"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import { AuthButtons } from "./auth-buttons"
import { useAuth } from "@/contexts/auth-context"

export function SimpleNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user } = useAuth()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    console.log("Auth state in SimpleNavbar:", { user })
  }, [user])

  const links = [
    { href: "/", label: "Home" },
    { href: "/athletes", label: "Athletes" },
  ]

  // Add Admin link if user is logged in (for testing, we'll show it to all logged-in users)
  if (isClient && user) {
    links.push({ href: "/admin", label: "Admin" })
  }

  links.push({ href: "/about", label: "About" })

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link href="https://www.ncwrestlingunited.com" className="flex items-center space-x-2">
            <Image src="/nc-united-main-logo.png" alt="NC Recruiting Portal" width={40} height={40} priority />
            <span className="text-xl font-bold text-gray-900">NC Recruiting Portal</span>
          </Link>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center">
          <div className="flex space-x-8 mr-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={
                  link.label === "Admin"
                    ? {
                        fontWeight: "bold",
                        color: "#2563eb",
                      }
                    : {}
                }
                className="text-gray-700 hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <AuthButtons />
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="p-2"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={
                  link.label === "Admin"
                    ? {
                        fontWeight: "bold",
                        color: "#2563eb",
                      }
                    : {}
                }
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-gray-200 px-4 py-3">
            <AuthButtons />
          </div>
        </div>
      )}
    </nav>
  )
}
