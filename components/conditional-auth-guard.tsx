"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

/**
 * Public routes (no sign-in): /, /auth/*, /blue*, /unified-profile*, /prospects*, /athletes*, /public-rankings*, /nchsaa (listings).
 * NCHSAA article pages (/nchsaa/:year/news/:slug) require login. Everything else (admin, profile, coach-portal) requires AuthGuard.
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
  const isViewProfile = pathname === "/view-profile"
  const isProspects = pathname === "/prospects" || pathname?.startsWith("/prospects/")
  const isAthletes = pathname === "/athletes" || pathname?.startsWith("/athletes/")
  const isPublicRankings = pathname?.startsWith("/public-rankings")
  const isNchsaaArticle = /^\/nchsaa\/[^/]+\/news\/[^/]+$/.test(pathname ?? "")
  const isNchsaaListing = pathname === "/nchsaa" || pathname?.startsWith("/nchsaa/")
  const isNchsaaPublic = isNchsaaListing && !isNchsaaArticle
  const isPublic =
    !pathname ||
    isHomepage ||
    isAuthRoute ||
    isBluePage ||
    isUnifiedProfile ||
    isViewProfile ||
    isProspects ||
    isAthletes ||
    isPublicRankings ||
    isNchsaaPublic

  if (isPublic) {
    return <>{children}</>
  }

  return <AuthGuard>{children}</AuthGuard>
}
