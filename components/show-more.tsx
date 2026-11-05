"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Draw a long list a page at a time (Matt, 2 Nov 2026: the athletes directory drew all 3,165 rows,
 * 87,000 elements, before anyone could scroll). The next page comes in as the end nears; the
 * button is there for whoever gets there first. Without a page size every row is drawn, as before.
 */
export function useShowMore(total: number, pageSize: number | undefined, resetKey: unknown) {
  const [shown, setShown] = useState(pageSize ?? total)
  useEffect(() => setShown(pageSize ?? Number.POSITIVE_INFINITY), [resetKey, pageSize])
  const limit = pageSize ? Math.min(shown, total) : total
  const more = useCallback(() => setShown((n) => n + (pageSize ?? 0)), [pageSize])
  return { limit, more, remaining: total - limit }
}

export function ShowMore({ remaining, pageSize, onMore, dark = false }: { remaining: number; pageSize: number; onMore: () => void; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || remaining <= 0 || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onMore(), { rootMargin: "800px 0px" })
    io.observe(el)
    return () => io.disconnect()
  }, [remaining, onMore])
  if (remaining <= 0) return null
  return (
    <div ref={ref} className="flex justify-center py-6">
      <button
        type="button"
        onClick={onMore}
        className={`rounded-xl px-5 py-2.5 text-sm font-semibold ${dark ? "bg-white/10 text-white hover:bg-white/15" : "bg-gray-100 text-gray-900 hover:bg-gray-200"}`}
      >
        Show {Math.min(pageSize, remaining)} more · {remaining.toLocaleString()} left
      </button>
    </div>
  )
}
