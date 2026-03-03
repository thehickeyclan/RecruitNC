"use client"

/**
 * Store link. Opens in new tab so layout/RSC never cancels the request.
 * When that’s fixed, this is just a normal link.
 */
export function StoreButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" className={className} style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }} onClick={() => { window.location.href = "/store"; }}>
      {children ?? "Store"}
    </button>
  )
}
