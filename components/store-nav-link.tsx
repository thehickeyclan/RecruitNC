"use client"

import type { ReactNode } from "react"

/**
 * Real <a href="/store">. No JavaScript required — browser does a full page load.
 * Use so Store link works even when the app or deploy is broken.
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
    <a
      href="/store"
      className={className}
      onClick={(e) => {
        e.preventDefault()
        onNavigate?.()
        window.location.href = "/store"
      }}
    >
      {children}
    </a>
  )
}
