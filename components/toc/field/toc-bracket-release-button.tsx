"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * Releasing the tournament's brackets to the iPhone app.
 *
 * One press, and it is Matt's alone — scoped seeders can read the board and seed it, but only an
 * admin can publish. Everything before this is invisible outside the three staff accounts: the web
 * bracket pages need TOC field access, and the app is served nothing until this is on.
 *
 * Only weights whose draw is locked go out, so the button says how many that is before it is
 * pressed. Releasing with three locked publishes three brackets and leaves the rest dark, which
 * is the point — 149 can wait on a replacement while 117 is live.
 */

type ReleaseState = {
  released: boolean
  releasedAt: string | null
  lockedWeights: number[]
  wouldPublish: number
}

export function TocBracketReleaseButton() {
  const [state, setState] = useState<ReleaseState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/toc/brackets/release", { cache: "no-store" })
      const body = await res.json()
      if (!res.ok) return setError(body.error ?? "Could not read the release state.")
      setError(null)
      setState(body as ReleaseState)
    } catch {
      setError("Could not read the release state.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const set = useCallback(
    async (released: boolean) => {
      setBusy(true)
      try {
        const res = await fetch("/api/admin/toc/brackets/release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ released }),
        })
        const body = await res.json()
        if (!res.ok) return setError(body.error ?? "That did not work.")
        setError(null)
        setState(body as ReleaseState)
        setConfirming(false)
      } catch {
        setError("That did not work.")
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  if (!state) return null

  return (
    <div
      className={`rounded-lg border p-3 ${
        state.released ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/15 bg-white/[0.03]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge className={state.released ? "bg-emerald-500 text-[#04150d] hover:bg-emerald-500" : "bg-slate-600 text-white hover:bg-slate-600"}>
            {state.released ? "Live in the app" : "Not released"}
          </Badge>
          <span className="text-xs text-white/65">
            {state.released
              ? `Released ${state.releasedAt ? new Date(state.releasedAt).toLocaleString() : ""} · ${state.wouldPublish} weight${state.wouldPublish === 1 ? "" : "s"} showing`
              : state.wouldPublish === 0
                ? "No weight has a locked draw yet — lock one below first."
                : `${state.wouldPublish} weight${state.wouldPublish === 1 ? "" : "s"} ready: ${state.lockedWeights.join(", ")}`}
          </span>
        </div>

        {state.released ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={() => void set(false)}
          >
            Pull back from the app
          </Button>
        ) : confirming ? (
          <div className="flex items-center gap-2">
            {/* Releasing is public and immediate, so it asks once rather than firing on a stray tap. */}
            <span className="text-xs text-white/70">
              Publish {state.wouldPublish} bracket{state.wouldPublish === 1 ? "" : "s"} to the app?
            </span>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              className="bg-emerald-500 font-bold text-[#04150d] hover:bg-emerald-400"
              onClick={() => void set(true)}
            >
              Yes, release
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={busy || state.wouldPublish === 0}
            className="bg-[#D7B95A] font-bold text-[#0B1D3A] hover:bg-[#c9ab4f]"
            onClick={() => setConfirming(true)}
          >
            Release brackets to the app
          </Button>
        )}
      </div>
      {error ? <p className="mt-2 text-xs text-red-200">{error}</p> : null}
    </div>
  )
}
