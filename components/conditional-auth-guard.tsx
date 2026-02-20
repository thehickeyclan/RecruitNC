"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

/**
 * Wraps children in AuthGuard for all routes except:
 * - Homepage (/)
 * - Auth flow routes (/auth/*)
 * - NC United Blue program page (/blue, /blue/*)
 * - Public athlete profiles (/unified-profile/*)
 * - Prospects list and profile redirects (/prospects, /prospects/*)
 * - Athletes (commitments) list and profile redirects (/athletes, /athletes/*)
 * - Public rankings (/public-rankings, /public-rankings/*)
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
