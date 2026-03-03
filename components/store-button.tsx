"use client"

/** Store: plain anchor so the browser does one document load. No form, no Next. */
export function StoreButton({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <a href="/store-app" className={className ?? ""}>
      {children ?? "Store"}
    </a>
  )
}
