"use client"

/**
 * Store link. Same-tab nav to /store is currently broken (request gets canceled by layout/RSC).
 * When that’s fixed, this is just a normal link.
 */
export function StoreButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <a href="/go/store" className={className} onClick={(e) => { e.preventDefault(); window.location.href = "/go/store"; }}>
      {children ?? "Store"}
    </a>
  )
}
