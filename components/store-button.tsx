"use client"

/**
 * Store link. Opens in new tab so layout/RSC never cancels the request.
 * When that’s fixed, this is just a normal link.
 */
export function StoreButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const goStore = () => {
    if ((typeof window !== "undefined" && (window as any).__storeNavigating)) return
    if (typeof window !== "undefined") (window as any).__storeNavigating = true
    window.location.href = "/store-app"
  }
  return (
    <button type="button" className={className} style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }} onClick={goStore}>
      {children ?? "Store"}
    </button>
  )
}
