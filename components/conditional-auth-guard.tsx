"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

/**
 * Public routes (no sign-in): /, /auth/*, /blue*, /unified-profile*, /prospects*, /athletes*, /public-rankings*.
 * Everything else (admin, profile, coach-portal) requires AuthGuard.
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
  const isUnifiedProfile = pathname?.startsWith("/unified-profile")
  const isProspects = pathname === "/prospects" || pathname?.startsWith("/prospects/")
  const isAthletes = pathname === "/athletes" || pathname?.startsWith("/athletes/")
  const isPublicRankings = pathname?.startsWith("/public-rankings")
  const isPublic =
    isHomepage ||
    isAuthRoute ||
    isBluePage ||
    isUnifiedProfile ||
    isProspects ||
    isAthletes ||
    isPublicRankings

  if (isPublic) {
    return <>{children}</>
  }

  return <AuthGuard>{children}</AuthGuard>
}
