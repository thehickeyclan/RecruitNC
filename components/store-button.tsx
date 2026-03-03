"use client"

/** Store link: normal anchor to /store-app so it always works. */
export function StoreButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <a href="/store-app" className={className}>
      {children ?? "Store"}
    </a>
  )
}
