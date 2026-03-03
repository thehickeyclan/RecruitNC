"use client"

/**
 * Store link. Opens in new tab so layout/RSC never cancels the request.
 * When that’s fixed, this is just a normal link.
 */
export function StoreButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <a href="/store" className={className} onClick={(e) => { e.preventDefault(); window.location.href = "/store"; }}>
      {children ?? "Store"}
    </a>
  )
}
