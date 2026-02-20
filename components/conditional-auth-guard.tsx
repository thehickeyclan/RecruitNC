"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

/**
 * Wraps children in AuthGuard for all routes except:
 * - Homepage (/)
 * - Auth flow routes (/auth/*) so signin, signup, forgot-password, reset-password, callback, etc. work without a session
 * - NC United Blue program page (/blue) - public-facing flagship page
 */
export function ConditionalAuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isHomepage = pathname === "/"
  const isAuthRoute = pathname?.startsWith("/auth/") ?? false
  const isBluePage = pathname === "/blue" || pathname?.startsWith("/blue/")
  const isPublic = isHomepage || isAuthRoute || isBluePage

  if (isPublic) {
    return <>{children}</>
  }

  return <AuthGuard>{children}</AuthGuard>
}
