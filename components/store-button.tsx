"use client"

/** Store link: target="_top" so it works when app is embedded in iframe (ncwrestlingunited.com). Same as Sign In. */
export function StoreButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <a href="/store-app" target="_top" rel="noopener" className={className}>
      {children ?? "Store"}
    </a>
  )
}
