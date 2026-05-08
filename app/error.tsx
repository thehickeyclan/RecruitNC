"use client"

import { useEffect } from "react"
import { HardLink } from "@/components/hard-link"

/**
 * Catches render errors in the app segment tree (shows message instead of only “client-side exception”).
 * Errors outside React (bad chunk load, etc.) still appear only in the browser console.
 */
export default function RootAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[RecruitNC] app/error boundary:", error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold text-gray-900">Something broke</h1>
      <p className="text-sm text-gray-600">
        If this persists, copy the text below plus any red console lines (especially{" "}
        <code className="rounded bg-gray-100 px-1 text-xs">[RecruitNC]</code>
        ).
      </p>
      <pre className="max-h-48 overflow-auto rounded-md bg-gray-950 p-3 text-xs whitespace-pre-wrap text-gray-100">
        {error.message}
      </pre>
      {error.digest ? (
        <p className="text-xs text-gray-500">
          Digest: <code>{error.digest}</code>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-[#003366] px-4 py-2 text-sm font-medium text-white"
          onClick={() => reset()}
        >
          Try again
        </button>
        <HardLink
          href="/"
          className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800"
        >
          Home
        </HardLink>
      </div>
    </div>
  )
}
