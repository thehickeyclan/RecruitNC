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
  const isTocInvitations =
    pathname === "/admin/toc/invitations" || pathname.startsWith("/admin/toc/invitations/")

  return (
    <AuthGuard requireAdmin={!isTocInvitations}>
      <div className="admin-layout min-h-screen bg-transparent p-0">
        <Toaster position="top-center" />
        {children}
      </div>
    </AuthGuard>
  )
}
