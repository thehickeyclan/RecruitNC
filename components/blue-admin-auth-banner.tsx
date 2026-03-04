"use client"

/**
 * Shown when Blue admin API returns 401/403 so users know empty data is due to sign-in, not missing data.
 * Use when loadError or error message indicates auth (e.g. "Not signed in.", "Admin access required.", "Unauthorized", "Admin required").
 */
export function BlueAdminAuthBanner({ returnTo }: { returnTo?: string }) {
  const href = returnTo
    ? `/auth/signin?returnTo=${encodeURIComponent(returnTo)}`
    : "/auth/signin"
  return (
    <div className="mb-6 py-4 px-4 rounded-lg bg-amber-50 border-2 border-amber-300">
      <p className="font-semibold text-amber-900">Blue data requires admin sign-in</p>
      <p className="mt-1 text-sm text-amber-800">
        You’re not signed in as an admin in this browser, so Blue pages show no data. Sign in again to see cockpit, interest forms, reports, and payments.
      </p>
      <a
        href={href}
        className="mt-3 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
      >
        Sign in again
      </a>
    </div>
  )
}

export function isBlueAuthError(message: string | null | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes("not signed in") ||
    m.includes("admin access required") ||
    m.includes("admin required") ||
    m.includes("unauthorized") ||
    m === "401" ||
    m.includes("403")
  )
}
