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
    pathname.startsWith("/admin/toc/field/")

  return (
    <AuthGuard requireAdmin={!isScopedTocManagerPage}>
      <div className="admin-layout min-h-screen bg-transparent p-0">
        <Toaster position="top-center" />
        {children}
      </div>
    </AuthGuard>
  )
}
