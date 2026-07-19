"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

/**
 * Public routes (no sign-in): public record / discovery pages that should be shareable
 * and crawlable: athletes, profiles, rankings, schools, colleges, news, public results,
 * national-team info/results, fundraising, store, and auth routes.
 *
 * The rule: public wrestling history is distribution. Actions, personalization, admin,
 * payments, wallet, messaging, and private recruiting data stay gated elsewhere.
 *
 * Making /view-profile public gives up nothing that was protected: private fields are gated
 * separately by canSeePrivateInfo (owner/admin/verified coach), so a signed-in fan already saw
 * exactly what a signed-out visitor now sees — and signup is free and takes two minutes. What
 * the wall did reliably stop was the college coach opening a texted link mid-season. During the
 * season 15–31% of profile loads were signed-out; those all dead-ended at sign-in.
 * `middleware.ts` already listed /view-profile as public — this guard was the disagreement.
 *
 * Profiles are noindex (see app/view-profile/page.tsx) so minors stay out of search results:
 * reachable by link, not crawlable.
 */
export function ConditionalAuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const path = pathname && pathname.length > 0 ? pathname : "/"

  const isHomepage = path === "/"
  const publicRoutePrefixes = [
    "/athletes",
    "/athletes-public",
    "/view-profile",
    "/prospects",
    "/public-rankings",
    "/schools",
    "/colleges",
    "/news",
    "/nchsaa",
    "/nhsca",
    "/fargo",
    "/national-team",
    "/stats",
    "/stats-simple",
    "/about",
    "/store",
    "/store-app",
    "/cart",
    "/spartan",
    "/fundraising",
  ]
  const publicExactRoutes = new Set(["/blue"])
  const isAuthRoute = path.startsWith("/auth/")
  const isPublicPrefix = publicRoutePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  const isPublicExact = publicExactRoutes.has(path)

  const isPublic = isHomepage || isPublicPrefix || isPublicExact || isAuthRoute

  if (isPublic) {
    return <>{children}</>
  }

  return <AuthGuard>{children}</AuthGuard>
}
