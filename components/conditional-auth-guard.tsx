"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

/**
 * Public routes (no sign-in): `/`, `/news` (index only), `/view-profile`, `/spartan` and `/spartan/*`,
 * `/fundraising` and `/fundraising/*` (giving hub, athlete pages, leaderboard — playbook/members
 * enforces sign-in in its page), and `/auth/*`.
 * Individual `/news/[slug]` articles require login; other app routes require login.
 *
 * The rule: an athlete profile is a business card the athlete hands to a coach, so it has to
 * work in a stranger's hands. The rankings/prospect database is the product and stays gated.
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
  /** News listing only — not `/news/some-article` */
  const isNewsIndex = path === "/news" || path === "/news/"
  /** Athlete profile — the one page whose job is to be shared outward to a coach. */
  const isViewProfile = path === "/view-profile" || path.startsWith("/view-profile/")
  /** Spartan fundraising campaign — must stay public (links from article, email, social). */
  const isSpartan = path === "/spartan" || path.startsWith("/spartan/")
  /** NC United giving hub and athlete flows — public for donors; gated playbook routes redirect server-side. */
  const isFundraisingHub = path === "/fundraising" || path.startsWith("/fundraising/")
  const isAuthRoute = path.startsWith("/auth/")

  const isPublic = isHomepage || isNewsIndex || isViewProfile || isSpartan || isFundraisingHub || isAuthRoute

  if (isPublic) {
    return <>{children}</>
  }

  return <AuthGuard>{children}</AuthGuard>
}
