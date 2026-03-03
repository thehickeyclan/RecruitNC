"use client"

import type { ReactNode } from "react"

/** Store: form GET so navigation cannot be canceled. Full document load. */
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
    <form method="get" action="/cart" target="_top" className="inline">
      <button
        type="submit"
        className={className}
        style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}
        onClick={() => onNavigate?.()}
      >
        {children}
      </button>
    </form>
  )
}
