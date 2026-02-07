"use client"

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="text-sm font-medium text-[#03154C] hover:text-[#B31B1B]"
    >
      ↑ Back to top
    </button>
  )
}
