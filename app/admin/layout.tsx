"use client"

import type React from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Toaster } from "@/components/ui/sonner"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAdmin={true}>
      <div className="admin-layout min-h-screen bg-transparent p-0">
        <Toaster position="top-center" />
        {children}
      </div>
    </AuthGuard>
  )
}
