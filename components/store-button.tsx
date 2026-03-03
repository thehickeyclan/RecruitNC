"use client"

/**
 * Store nav via form GET so the browser does a full document request — nothing to cancel.
 * (window.location / <a> were getting "store (canceled)" from layout/RSC.)
 */
export function StoreButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <form action="/store" method="get" className="inline" onSubmit={(e) => e.stopPropagation()}>
      <button type="submit" className={className}>
        {children ?? "Store"}
      </button>
    </form>
  )
}
