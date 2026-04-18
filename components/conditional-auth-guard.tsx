"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

/**
 * Public routes (no sign-in): `/`, the news index `/news` (article list to entice sign-up), and `/auth/*`.
 * Individual articles `/news/[slug]` require login; all other app routes require login too.
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
  const isAuthRoute = path.startsWith("/auth/")

  const isPublic = isHomepage || isNewsIndex || isAuthRoute

  if (isPublic) {
    return <>{children}</>
  }

  return <AuthGuard>{children}</AuthGuard>
}
