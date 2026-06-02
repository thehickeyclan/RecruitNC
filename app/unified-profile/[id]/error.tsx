"use client"

import { useEffect } from "react"

export default function UnifiedProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[unified-profile] error boundary:", error.message, error.digest)
  }, [error])

  return (
    <main className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-white/10 bg-[#0f1c2e] p-6 text-center">
        <h1 className="text-xl font-bold text-white mb-2">Profile unavailable</h1>
        <p className="text-white/60 mb-4">
          This profile could not be loaded. It may be temporarily unavailable.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-[#D3B574] text-[#0A1628] rounded-lg font-semibold hover:bg-[#D3B574]/90"
          >
            Try again
          </button>
          <a
            href="/prospects/all"
            className="px-4 py-2 border border-white/20 rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
          >
            View all prospects
          </a>
        </div>
      </div>
    </main>
  )
}
