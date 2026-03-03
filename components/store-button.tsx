"use client"

/**
 * Store nav as a button so nothing can intercept (no <a>). Use in footer and anywhere else.
 */
export function StoreButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => { window.location.href = "/store"; }}
    >
      {children ?? "Store"}
    </button>
  )
}
