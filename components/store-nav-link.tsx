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
    <form action="/store" method="get" className="inline" style={{ margin: 0 }} onClick={() => onNavigate?.()}>
      <button type="submit" className={className ?? ""} style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}>
        {children}
      </button>
    </form>
  )
}
