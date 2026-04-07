"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

/**
 * Public routes (no sign-in): /, /auth/*, /blue*, /unified-profile*, /prospects*, /athletes*, /colleges* (except .../my-recruits), /high-schools, /nchsaa*, /nhsca*, /super32, /news (list only), /store, /cart, /checkout, /national-team*.
 * Rankings hub only: /public-rankings (class picker) is public. /public-rankings/2026|2027|2028 require sign-in; /api/public-rankings stays session-protected.
 * /national-team and /national-team/* are public so parents can open the hub and enter an access code without signing in.
 */
export function ConditionalAuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  // Never treat "unknown path" as public — the old `!pathname` check skipped AuthGuard for *all* routes when pathname was null/undefined (bad).
  // Use `??` for null/undefined, but also treat "" as "/" — `"" ?? "/"` is still "" (?? does not replace empty string), which made `/` look non-public and wrapped the homepage in AuthGuard.
  const path = pathname && pathname.length > 0 ? pathname : "/"
  const isHomepage = path === "/"
  const isAuthRoute = path.startsWith("/auth/")
  const isBluePage = path === "/blue" || path.startsWith("/blue/")
  const isUnifiedProfile = path.startsWith("/unified-profile")
  const isViewProfile = path === "/view-profile"
  const isProspects = path === "/prospects" || path.startsWith("/prospects/")
  const isAthletes = path === "/athletes" || path.startsWith("/athletes/")
  /** Commitments discovery: public; keep /colleges/[slug]/my-recruits behind AuthGuard (redirects to portal). */
  const isHighSchools = path === "/high-schools" || path === "/high-schools/"
  const isCollegesPublic =
    path === "/colleges" ||
    path === "/colleges/" ||
    (path.startsWith("/colleges/") && !path.includes("/my-recruits"))
  const isPublicRankingsHub = path === "/public-rankings" || path === "/public-rankings/"
  const isStore = path === "/store" || path.startsWith("/store/") || path === "/store-app" || path.startsWith("/store-app/")
  const isCart = path === "/cart"
  const isCheckout = path.startsWith("/checkout/")
  const isNchsaaArticle = /^\/nchsaa\/[^/]+\/news\/[^/]+$/.test(path)
  const isNchsaaListing = path === "/nchsaa" || path.startsWith("/nchsaa/")
  const isNchsaaPublic = isNchsaaListing && !isNchsaaArticle
  const isNhsca = path === "/nhsca" || path.startsWith("/nhsca/")
  const isSuper32 = path === "/super32" || path.startsWith("/super32/")
  const isNewsList = path === "/news"
  const isNationalTeam = path === "/national-team" || path.startsWith("/national-team/")
  const isSpartanCampaign = path === "/spartan" || path.startsWith("/spartan/")
  const isPublic =
    isHomepage ||
    isAuthRoute ||
    isBluePage ||
    isUnifiedProfile ||
    isViewProfile ||
    isProspects ||
    isAthletes ||
    isHighSchools ||
    isCollegesPublic ||
    isPublicRankingsHub ||
    isNewsList ||
    isStore ||
    isCart ||
    isCheckout ||
    isNchsaaPublic ||
    isNhsca ||
    isSuper32 ||
    isNationalTeam ||
    isSpartanCampaign

  if (isPublic) {
    return <>{children}</>
  }

  return <AuthGuard>{children}</AuthGuard>
}
