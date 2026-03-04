"use client"

/** Store: plain anchor so the browser does one document load. No form, no Next. */
export function StoreButton({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  className?: string
  children?: React.ReactNode
  "aria-label"?: string
}) {
  return (
    <a href="/store-app" className={className ?? ""} aria-label={ariaLabel ?? "Store"}>
      {children ?? "Store"}
    </a>
  )
}
