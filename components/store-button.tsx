"use client"

/** Store: form GET so navigation cannot be canceled by the app. Full document load. */
export function StoreButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={() => { window.location.href = "/store-app" }} className={className ?? ""} style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}>
      {children ?? "Store"}
    </button>
  )
}
