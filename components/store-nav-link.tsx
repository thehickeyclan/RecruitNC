"use client"

import type { ReactNode } from "react"

/** Store link: target="_top" so it works when app is embedded in iframe. Same pattern as Sign In. */
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
      target="_top"
      rel="noopener"
      className={className}
      onClick={() => onNavigate?.()}
    >
      {children}
    </a>
  )
}
