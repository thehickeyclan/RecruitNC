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
      <div className="admin-layout">
        <Toaster position="top-center" />
        <div className="min-h-screen bg-gray-50 p-4">{children}</div>
      </div>
    </AuthGuard>
  )
}
