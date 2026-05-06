"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

/**
 * Public routes (no sign-in): `/`, `/news` (index only), `/spartan` and `/spartan/*`, `/fundraising` and
 * `/fundraising/*` (giving hub, athlete pages, leaderboard — playbook/members enforces sign-in in its page),
 * and `/auth/*`.
 * Individual `/news/[slug]` articles require login; other app routes require login.
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
  /** Spartan fundraising campaign — must stay public (links from article, email, social). */
  const isSpartan = path === "/spartan" || path.startsWith("/spartan/")
  /** NC United giving hub and athlete flows — public for donors; gated playbook routes redirect server-side. */
  const isFundraisingHub = path === "/fundraising" || path.startsWith("/fundraising/")
  const isAuthRoute = path.startsWith("/auth/")

  const isPublic = isHomepage || isNewsIndex || isSpartan || isFundraisingHub || isAuthRoute

  if (isPublic) {
    return <>{children}</>
  }

  return <AuthGuard>{children}</AuthGuard>
}
