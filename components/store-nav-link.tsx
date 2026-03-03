"use client"

import type { ReactNode } from "react"

/** Store: plain anchor so the browser does one document load. onNavigate runs before nav (e.g. close mobile sheet). */
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
      href="/store-app"
      className={className}
      onClick={() => onNavigate?.()}
    >
      {children}
    </a>
  )
}
