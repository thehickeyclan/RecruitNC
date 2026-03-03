"use client"

import type { ReactNode } from "react"

/**
 * Store link via /go/store (302 redirect). Avoids canceled RSC/document request; browser does full GET /store after redirect.
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
      href="/go/store"
      className={className}
      onClick={(e) => {
        e.preventDefault()
        onNavigate?.()
        window.location.href = "/go/store"
      }}
    >
      {children}
    </a>
  )
}
