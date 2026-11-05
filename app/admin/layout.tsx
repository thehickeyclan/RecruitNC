"use client"

import type React from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Toaster } from "@/components/ui/sonner"
import { usePathname } from "next/navigation"
import { businessCanOpen } from "@/lib/business/access"

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
    pathname === "/admin/toc/pool/results" ||
    // Scoped rankers (lib/rankings/ranking-board-access.ts) open the board without being admins.
    // The page only needs a signed-in user; the board API is what refuses anyone without a grant.
    pathname === "/admin/rankings/board"

  // The Business pages (lib/business/access.ts) open to an account holding the business grant as
  // well as to admins. Like the scoped pages above, this only lets the page render for a signed-in
  // user: each Business page calls requireBusinessViewer itself, and that is what refuses anyone
  // without the grant. Nothing else in admin changes.
  const isBusinessPage = businessCanOpen(pathname)

  return (
    <AuthGuard requireAdmin={!isScopedTocManagerPage && !isBusinessPage}>
      <div className="admin-layout min-h-screen bg-transparent p-0">
        <Toaster position="top-center" />
        {children}
      </div>
    </AuthGuard>
  )
}
