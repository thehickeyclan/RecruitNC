"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { LogOut } from "lucide-react"

export function AuthButtons() {
  const { user, signOut } = useAuth()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [user])

  // Don't render during SSR
  if (!isClient) return null

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-gray-800 font-medium px-3 py-1.5 rounded border border-gray-300"
          style={{ backgroundColor: "white", color: "#1f2937" }}
        >
          {user.email?.split("@")[0]}
        </span>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300"
          style={{
            backgroundColor: "white",
            color: "#1f2937",
            border: "1px solid #d1d5db",
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/auth/signin"
        target="_top"
        rel="noopener"
        className="px-3 py-1.5 rounded border border-gray-300"
        style={{
          backgroundColor: "white",
          color: "#1f2937",
          border: "1px solid #d1d5db",
        }}
      >
        Sign In
      </Link>
      <Link
        href="/auth/signup"
        target="_top"
        rel="noopener"
        className="px-3 py-1.5 rounded"
        style={{
          backgroundColor: "#2563eb",
          color: "white",
        }}
      >
        Sign Up
      </Link>
    </div>
  )
}
