"use client"

import Link, { type LinkProps } from "next/link"
import type { ReactNode } from "react"

/**
 * Next.js Link for store routes with prefetch disabled globally.
 * Use for any href under /store (e.g. /store, /store/product/123).
 * Prevents layout from issuing "store (canceled)" document requests.
 * (Next has no global prefetch config; this centralizes the opt-out.)
 */
export function StoreLink({
  href,
  prefetch,
  children,
  ...rest
}: LinkProps & { children: ReactNode }) {
  return (
    <Link href={href} prefetch={false} {...rest}>
      {children}
    </Link>
  )
}
