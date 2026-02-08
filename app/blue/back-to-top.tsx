"use client"

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="text-sm font-medium text-[#03154C] hover:text-[#D3B574]"
    >
      ↑ Back to top
    </button>
  )
}
