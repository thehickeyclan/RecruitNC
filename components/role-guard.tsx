"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

interface RoleGuardProps {
  children: ReactNode
  allowedRoles?: ("user" | "coach" | "admin")[]
  requireVerifiedCoach?: boolean
  requireAdmin?: boolean
  fallbackPath?: string
  loadingComponent?: ReactNode
  unauthorizedComponent?: ReactNode
}

export function RoleGuard({
  children,
  allowedRoles = ["user", "coach", "admin"],
  requireVerifiedCoach = false,
  requireAdmin = false,
  fallbackPath = "/auth/signin",
  loadingComponent,
  unauthorizedComponent,
}: RoleGuardProps) {
  const { user, profile, isLoading, isAdmin, isVerifiedCoach } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      const url = `${fallbackPath}?redirect=${encodeURIComponent(window.location.pathname)}`
      if (typeof window !== "undefined" && window.self !== window.top) {
        window.top!.location.href = url
      } else {
        router.push(url)
      }
    }
  }, [user, isLoading, router, fallbackPath])

  // Show loading state
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      )
    )
  }

  // User not authenticated
  if (!user) {
    return null // Will redirect via useEffect
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return (
      unauthorizedComponent || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You need administrator privileges to access this page.</p>
          </div>
        </div>
      )
    )
  }

  // Check verified coach requirement (admins bypass this check)
  if (requireVerifiedCoach && !isVerifiedCoach && !isAdmin) {
    return (
      unauthorizedComponent || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Required</h1>
            <p className="text-gray-600">You need to be a verified coach to access this page.</p>
          </div>
        </div>
      )
    )
  }

  // Check role-based access (admins bypass this check)
  if (profile && !allowedRoles.includes(profile.role) && !isAdmin) {
    return (
      unauthorizedComponent || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
