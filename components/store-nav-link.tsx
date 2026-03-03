"use client"

import type { ReactNode } from "react"

/**
 * Store: plain form GET to /store. No link, no JS — nothing can intercept.
 */
export function StoreNavLink({
  className,
  children,
  onNavigate,
}: {
  className?: string
  children: ReactNode
  onNavigate?: () => void
}) {
  const goStore = () => {
    if (typeof window !== "undefined" && (window as any).__storeNavigating) return
    if (typeof window !== "undefined") (window as any).__storeNavigating = true
    onNavigate?.()
    window.location.href = "/store-app"
  }
  return (
    <button type="button" className={className} style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }} onClick={goStore}>
      {children}
    </button>
  )
}
