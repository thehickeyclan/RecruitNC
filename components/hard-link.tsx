"use client"

import type { ReactNode } from "react"

/**
 * Internal link as a real <a href>. No JavaScript required — browser does a full
 * page load. Use for any critical or new link so navigation works even when
 * the app or deploy is broken.
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
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        onNavigate?.()
        window.location.href = href
      }}
    >
      {children}
    </a>
  )
}
