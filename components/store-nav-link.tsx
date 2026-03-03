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
  return (
    <a href="/store" className={className} onClick={(e) => { e.preventDefault(); onNavigate?.(); window.location.href = "/store"; }}>
      {children}
    </a>
  )
}
