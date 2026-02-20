"use client"

import { useEffect } from "react"
import Link from "next/link"

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Profile unavailable</h1>
        <p className="text-gray-600 mb-4">
          This profile could not be loaded. It may be temporarily unavailable.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-[#002147] text-white rounded hover:bg-[#003366]"
          >
            Try again
          </button>
          <Link
            href="/prospects/all"
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            View all prospects
          </Link>
        </div>
      </div>
    </div>
  )
}
