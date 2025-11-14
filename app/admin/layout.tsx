"use client"

import type React from "react"
import { AuthGuard } from "@/components/auth-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAdmin={true}>
      <div className="admin-layout">
        <div className="min-h-screen bg-gray-50 p-4">{children}</div>
      </div>
    </AuthGuard>
  )
}
