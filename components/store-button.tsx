"use client"

/**
 * Store link. Same-tab nav to /store is currently broken (request gets canceled by layout/RSC).
 * When that’s fixed, this is just a normal link.
 */
export function StoreButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <a href="/store" className={className}>
      {children ?? "Store"}
    </a>
  )
}
