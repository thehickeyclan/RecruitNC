"use client"

import type { ReactNode } from "react"

/**
 * Internal link that forces a full page load (window.location.href).
 * Use for any NEW page or NEW link: existing client bundles may have a stale
 * route manifest, so client-side navigation can cancel or fail for new routes.
 * Full page load hits the server and works.
 */
export function HardLink({
  href,
  className,
  children,
  onNavigate,
}: {
  href: string
  className?: string
  children: ReactNode
  onNavigate?: () => void
}) {
  const go = () => {
    onNavigate?.()
    window.location.href = href
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
