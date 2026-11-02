"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The upgrade, said the way a family hears it (Matt, 31 Oct 2026): Insider shows which colleges
 * view your profile and the rankings college coaches recruit from. Under the blurred colleges on a
 * claimed profile and straight after the profile is updated: register, claim, update, upgrade.
 *
 * Renders nothing for an account that already has Insider. The button goes straight to checkout;
 * signed out, it goes to sign in and comes back.
 */
const STATE_NAMES: Record<string, string> = { NC: "North Carolina", SC: "South Carolina" }

export function insiderPitch(firstName: string, state?: string | null): { title: string; body: string; plus: string } {
  const stateName = state ? STATE_NAMES[state.toUpperCase()] : undefined
  return {
    title: `See which colleges view ${firstName}'s profile`,
    plus: `Plus the ${stateName ? `${stateName} ` : ""}rankings college coaches use to recruit.`,
    body: stateName
      ? `Insider names every college program looking at ${firstName}, and opens the ${stateName} rankings college coaches use to recruit.`
      : `Insider names every college program looking at ${firstName}, and opens the rankings college coaches use to recruit.`,
  }
}

export function InsiderUpsell({
  firstName,
  state,
  returnTo,
  compact = false,
  className,
}: {
  firstName: string
  state?: string | null
  returnTo: string
  /** Under the blurred colleges: one line and the button. */
  compact?: boolean
  className?: string
}) {
  const [hidden, setHidden] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/membership/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { insider?: boolean } | null) => !cancelled && setHidden(s?.insider === true))
      .catch(() => !cancelled && setHidden(false))
    return () => {
      cancelled = true
    }
  }, [])

  if (hidden) return null

  const start = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/scouting-report/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "subscription", returnTo }),
      })
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string; reason?: string }
      if (res.status === 401) {
        window.location.href = `/auth/signin?returnTo=${encodeURIComponent(returnTo)}`
        return
      }
      if (res.ok && body.url) {
        window.location.href = body.url
        return
      }
      if (body.reason === "already_entitled" || body.reason === "already_entitled_portal") {
        setHidden(true)
        return
      }
      setMessage(body.error || "Could not start checkout. Try again.")
    } catch {
      setMessage("Could not start checkout. Try again.")
    }
    setBusy(false)
  }

  const pitch = insiderPitch(firstName, state)
  const button = (
    <button
      type="button"
      onClick={() => void start()}
      disabled={busy}
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-extrabold text-[#0A1628] hover:brightness-110 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      Get Insider · $9.99/mo
    </button>
  )

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
        <p className="max-w-[46ch] text-sm text-white/80">
          <span className="font-bold text-white">{pitch.title}.</span> {pitch.plus}
        </p>
        {button}
        {message ? <p className="w-full text-xs text-red-300">{message}</p> : null}
      </div>
    )
  }

  return (
    <div className={cn("rounded-xl border border-[#D3B574]/60 bg-[#D3B574]/10 p-5", className)}>
      <p className="text-lg font-black text-white">{pitch.title}</p>
      <p className="mt-1 text-sm text-white/75">{pitch.body}</p>
      <div className="mt-4">{button}</div>
      {message ? <p className="mt-2 text-xs text-red-300">{message}</p> : null}
    </div>
  )
}
