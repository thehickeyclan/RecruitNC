"use client"

import type { ReactNode } from "react"

/**
 * Navigate to /store without using <a href="/store"> so Next.js layout
 * never sees an internal link to prefetch or intercept (avoids "store (canceled)"
 * document requests from layout-*.js).
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
  const go = () => {
    onNavigate?.()
    window.location.href = "/store"
  }
  return (
    <span
      role="link"
      tabIndex={0}
      className={className}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          go()
        }
      }}
    >
      {children}
    </span>
  )
}
