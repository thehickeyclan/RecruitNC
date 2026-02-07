"use client"

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      ↑ Back to top
    </button>
  )
}
