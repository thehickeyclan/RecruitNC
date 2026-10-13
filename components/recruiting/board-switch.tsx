"use client"

import { VIEW_GENDER_COOKIE, type ViewGender } from "@/lib/recruiting/coach-program"

/**
 * Men's | Women's: which wrestlers this coach is looking at (Matt, 13 October 2026).
 *
 * The coach's program picks the side they start on; this is the one tap that changes it, for the
 * staff that recruits both and for anyone who was put on the wrong side. It is a cookie, read by
 * the server, so the page that comes back is built for the other side rather than filtered in the
 * browser after the wrong one has loaded.
 */
export function BoardSwitch({ value, className = "" }: { value: ViewGender; className?: string }) {
  const choose = (next: ViewGender) => {
    if (next === value) return
    document.cookie = `${VIEW_GENDER_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    window.location.reload()
  }
  return (
    <div role="group" aria-label="Men's or women's wrestlers" className={`inline-flex overflow-hidden rounded-lg border border-white/20 ${className}`}>
      {(["Male", "Female"] as const).map((g) => (
        <button
          key={g}
          type="button"
          aria-pressed={value === g}
          onClick={() => choose(g)}
          className={`min-h-9 px-3.5 text-xs font-bold transition-colors ${
            value === g ? "bg-[#D3B574] text-[#0A1628]" : "text-white/70 hover:text-white"
          }`}
        >
          {g === "Female" ? "Women's" : "Men's"}
        </button>
      ))}
    </div>
  )
}
