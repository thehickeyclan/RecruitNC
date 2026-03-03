"use client"

import type { ReactNode } from "react"

/** Store link: normal anchor to /store-app. */
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
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => onNavigate?.()}
    >
      {children}
    </a>
  )
}
