"use client"

import type { CSSProperties, ReactNode } from "react"

/**
 * Internal link as a real <a href>. No JavaScript required — browser does a full
 * page load. Use for any critical or new link so navigation works even when
 * the app or deploy is broken.
 */
export function HardLink({
  href,
  className,
  style,
  children,
  onNavigate,
}: {
  href: string
  className?: string
  style?: CSSProperties
  children: ReactNode
  onNavigate?: () => void
}) {
  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={(e) => {
        onNavigate?.()
        // Preserve native hash navigation so /path#section lands on the anchor.
        if (href.includes("#")) return
        e.preventDefault()
        window.location.href = href
      }}
    >
      {children}
    </a>
  )
}
