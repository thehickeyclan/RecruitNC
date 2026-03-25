"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

/**
 * Public routes (no sign-in): /, /auth/*, /blue*, /unified-profile*, /prospects*, /athletes*, /nchsaa (listings), /news (list only), /store, /cart, /checkout, /national-team*.
 * Rankings hub only: /public-rankings (class picker) is public. /public-rankings/2026|2027|2028 require sign-in; /api/public-rankings stays session-protected.
 * /national-team and /national-team/* are public so parents can open the hub and enter an access code without signing in.
 */
export function ConditionalAuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  // Never treat "unknown path" as public — `!pathname` skipped AuthGuard for all routes.
  const path = pathname ?? "/"
  const isHomepage = path === "/"
  const isAuthRoute = path.startsWith("/auth/")
  const isBluePage = path === "/blue" || path.startsWith("/blue/")
  const isUnifiedProfile = path.startsWith("/unified-profile")
  const isViewProfile = path === "/view-profile"
  const isProspects = path === "/prospects" || path.startsWith("/prospects/")
  const isAthletes = path === "/athletes" || path.startsWith("/athletes/")
  const isPublicRankingsHub = path === "/public-rankings" || path === "/public-rankings/"
  const isStore = path === "/store" || path.startsWith("/store/") || path === "/store-app" || path.startsWith("/store-app/")
  const isCart = path === "/cart"
  const isCheckout = path.startsWith("/checkout/")
  const isNchsaaArticle = /^\/nchsaa\/[^/]+\/news\/[^/]+$/.test(path)
  const isNchsaaListing = path === "/nchsaa" || path.startsWith("/nchsaa/")
  const isNchsaaPublic = isNchsaaListing && !isNchsaaArticle
  const isNewsList = path === "/news"
  const isNationalTeam = path === "/national-team" || path.startsWith("/national-team/")
  const isPublic =
    isHomepage ||
    isAuthRoute ||
    isBluePage ||
    isUnifiedProfile ||
    isViewProfile ||
    isProspects ||
    isAthletes ||
    isPublicRankingsHub ||
    isNewsList ||
    isStore ||
    isCart ||
    isCheckout ||
    isNchsaaPublic ||
    isNationalTeam

  if (isPublic) {
    return <>{children}</>
  }

  return <AuthGuard>{children}</AuthGuard>
}
