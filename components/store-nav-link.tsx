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
    <form method="get" action="/store-app" target="_top" className={className} onSubmit={() => onNavigate?.()}>
      <button
        type="submit"
        className="w-full text-left"
        style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}
      >
        {children}
      </button>
    </form>
  )
}
