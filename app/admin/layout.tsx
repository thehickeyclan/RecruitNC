"use client"

import type React from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Toaster } from "@/components/ui/sonner"
import { usePathname } from "next/navigation"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isScopedTocManagerPage =
    pathname === "/admin/toc/plan" ||
    pathname.startsWith("/admin/toc/plan/") ||
    pathname === "/admin/toc/field" ||
    pathname.startsWith("/admin/toc/field/") ||
    // Scale stations are staffed by people with TOC field access, not only full admins.
    pathname === "/admin/toc/weigh-ins" ||
    // Results are entered at the mat by people holding the scoped toc_results flag. The page only
    // needs a signed-in user; the result API is what refuses anyone without the flag.
    pathname === "/admin/toc/pool/results"

  return (
    <AuthGuard requireAdmin={!isScopedTocManagerPage}>
      <div className="admin-layout min-h-screen bg-transparent p-0">
        <Toaster position="top-center" />
        {children}
      </div>
    </AuthGuard>
  )
}
