"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

/**
 * Public routes (no sign-in): `/`, `/news` and `/news/*`, and `/auth/*` (sign-in, sign-up, callback, reset, etc.).
 * All other app routes require login — profiles, rankings, store, national team, Spartan, NCHSAA hubs, etc.
 */
export function ConditionalAuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const path = pathname && pathname.length > 0 ? pathname : "/"

  const isHomepage = path === "/"
  const isNews = path === "/news" || path.startsWith("/news/")
  const isAuthRoute = path.startsWith("/auth/")

  const isPublic = isHomepage || isNews || isAuthRoute

  if (isPublic) {
    return <>{children}</>
  }

  return <AuthGuard>{children}</AuthGuard>
}
