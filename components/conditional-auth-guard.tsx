"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

/**
 * Public routes (no sign-in): public record / discovery pages that should be shareable
 * and crawlable: athletes, profiles, schools, colleges, news, public results,
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
    // Partners send this link to their own people; a login wall would waste it.
    "/supporters",
    // The printed QR code on lanyards and signage points here. A login wall would make every
    // one of them useless, and they cannot be reprinted.
    "/download",
    "/athletes",
    "/athletes-public",
    "/view-profile",
    "/prospects",
    "/schools",
    // A school's wrestling record is public history, same as /schools and /nchsaa — and Data
    // Dawg, which is open to everyone, links school names straight to /high-schools/[slug].
    // Gating it sent every signed-out reader who followed one of those links to a login wall.
    "/high-schools",
    "/colleges",
    // Public club directory — it carries public SEO metadata and an OG url of /clubs,
    // so gating it here made the page uncrawlable and dead-ended every shared link.
    // /clubs/submit stays safe: it resolves the session itself and prompts signed-out
    // visitors to sign in, and the submissions API returns 401 regardless.
    "/clubs",
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
    "/tournament-of-champions",
    "/fundraising",
    // The App Store listing points at /privacy and /support, and Apple opens both signed out
    // during review — a login wall there is a rejection, not a detail. /contact is the route
    // both of those pages send people to, so gating it broke the only way to reach a human.
    "/privacy",
    "/support",
    "/contact",
  ]
  const publicExactRoutes = new Set(["/blue"])
  const isAuthRoute = path.startsWith("/auth/")
  const isPublicPrefix = publicRoutePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  const isPublicExact = publicExactRoutes.has(path)
  const isProfileManagementRoute =
    path === "/create-profile" ||
    path === "/submit-profile" ||
    path.startsWith("/edit-profile/") ||
    /^\/athletes\/[^/]+\/edit(?:\/|$)/.test(path) ||
    /^\/athletes\/[^/]+\/edit-request(?:\/|$)/.test(path)

  const isPublic = !isProfileManagementRoute && (isHomepage || isPublicPrefix || isPublicExact || isAuthRoute)

  if (isPublic) {
    return <>{children}</>
  }

  return <AuthGuard>{children}</AuthGuard>
}
