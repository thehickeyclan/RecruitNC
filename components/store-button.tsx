"use client"

/** Store: form GET so navigation cannot be canceled by the app. Full document load. */
export function StoreButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <form method="get" action="/store-app" target="_top" className="inline" style={{ display: "inline" }}>
      <button type="submit" className={className ?? ""} style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}>
        {children ?? "Store"}
      </button>
    </form>
  )
}
