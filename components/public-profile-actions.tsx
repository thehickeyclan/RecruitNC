"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, PencilLine } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * PublicProfileActions
 * - Pure UI change: two clear actions for public profiles.
 * - Removes any "claim" wording/UX.
 * - Always shows both buttons. After confirmation, the green button shows "Confirmed" and is disabled,
 *   while the red "Make edits" remains available.
 *
 * Expected server endpoints already in your repo:
 *   - GET  /api/athletes/[id]/confirmation-status    -> { confirmed: boolean }
 *   - POST /api/athletes/[id]/confirm                -> { success: boolean }
 *
 * If your confirmation status route returns a different shape, tweak mapStatus().
 */
export default function PublicProfileActions({
  athleteId = "demo-athlete-id", // default for Next.js preview; replace in real usage
  athleteName = "this athlete",
  className,
}: {
  athleteId?: string
  athleteName?: string
  className?: string
}) {
  const [confirmed, setConfirmed] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Read initial status from your existing endpoint
  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        setError(null)
        const res = await fetch(`/api/athletes/${encodeURIComponent(athleteId)}/confirmation-status`, {
          method: "GET",
          headers: { "content-type": "application/json" },
          cache: "no-store",
        })
        if (!res.ok) throw new Error("Failed to load confirmation status")
        const data = await res.json()
        if (!ignore) {
          setConfirmed(Boolean(mapStatus(data)))
        }
      } catch (e: any) {
        if (!ignore) setError(e?.message ?? "Could not load profile status")
      }
    }
    if (athleteId) load()
    return () => {
      ignore = true
    }
  }, [athleteId])

  const statusLabel = useMemo(() => (confirmed ? "Verified" : "Unverified"), [confirmed])

  async function handleConfirm() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/athletes/${encodeURIComponent(athleteId)}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data?.error || "Failed to confirm profile")
      }
      setConfirmed(true)
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong confirming this profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      className={cn(
        "border border-muted/50 shadow-sm",
        // soft background for readability against white page
        "bg-[rgb(249,250,251)] dark:bg-neutral-900",
        className,
      )}
      role="region"
      aria-label="Public profile actions"
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col gap-4">
          {/* Header: status on left for mobile, pill floats right on larger screens */}
          <div className="flex items-start md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base md:text-lg font-semibold leading-tight">{"Help keep this profile accurate"}</h3>
              <p className="text-sm text-muted-foreground">
                {"If everything looks right, mark it good to go. Need a change? Tap Make edits."}
              </p>
            </div>

            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                confirmed
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
              )}
              aria-live="polite"
            >
              {confirmed ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{statusLabel}</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 15h-2v-2h2Zm0-4h-2V7h2Z" />
                  </svg>
                  <span>{statusLabel}</span>
                </>
              )}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleConfirm}
              disabled={loading || confirmed}
              className={cn(
                "w-full sm:w-auto",
                // green primary
                "bg-emerald-600 hover:bg-emerald-700 text-white",
                "disabled:opacity-90 disabled:cursor-not-allowed",
              )}
              aria-disabled={loading || confirmed}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
              {confirmed ? "Confirmed" : loading ? "Confirming..." : "Good to go"}
            </Button>

            <Link
              href={`/athletes/${encodeURIComponent(athleteId)}/edit-request`}
              className="w-full sm:w-auto"
              aria-label={`Request an edit for ${athleteName}'s profile`}
            >
              <Button
                variant="outline"
                className={cn(
                  "w-full",
                  // red outline without using indigo/blue
                  "border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800",
                  "dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40",
                )}
              >
                <PencilLine className="h-4 w-4 mr-2" aria-hidden="true" />
                Make edits
              </Button>
            </Link>
          </div>

          {error && (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "text-sm rounded-md px-3 py-2",
                "bg-red-50 text-red-700 ring-1 ring-red-200",
                "dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900",
              )}
            >
              {error}
            </div>
          )}

          {/* Small, subtle footnote to communicate purpose without clutter */}
          <p className="text-xs text-muted-foreground">
            {"Your feedback helps validate profiles and improve accuracy."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function mapStatus(data: any): boolean {
  // Accept multiple common shapes; adjust if your API differs.
  if (!data) return false
  if (typeof data.confirmed === "boolean") return data.confirmed
  if (typeof data.isConfirmed === "boolean") return data.isConfirmed
  if (typeof data.status === "string") return data.status.toLowerCase() === "confirmed"
  return false
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}
