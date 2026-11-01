"use client"

import { useState } from "react"
import { Loader2, Mail } from "lucide-react"

/**
 * One tap to get back in without the password: we email a sign-in link (app/api/auth/email-link).
 * Families who already had an account could not remember the password, and almost none got back
 * in on launch day (31 Oct 2026).
 */
export function EmailSignInLink({
  email: given = "",
  returnTo = null,
  withInput = true,
}: {
  email?: string
  returnTo?: string | null
  /** False where the page already has an email field: the address comes from there. */
  withInput?: boolean
}) {
  const [email, setEmail] = useState(given)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const address = (withInput ? email : given).trim()

  const send = async () => {
    setError(null)
    if (!address) return setError(withInput ? "Enter your email address first." : "Enter your email above first.")
    setBusy(true)
    try {
      const res = await fetch("/api/auth/email-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address, returnTo }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) setError(body.error || "We couldn't send the link. Try again in a minute.")
      else setSentTo(address)
    } catch {
      setError("We couldn't send the link. Try again in a minute.")
    }
    setBusy(false)
  }

  if (sentTo) {
    return (
      <p className="rounded-md border border-[#D3B574]/40 bg-[#D3B574]/10 px-3 py-3 text-sm text-foreground">
        <span className="font-semibold">Check your email.</span> We sent a sign-in link to <span className="font-semibold">{sentTo}</span>. Tap it on this
        device or any other and you&apos;re in.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {!withInput ? null : (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          autoComplete="email"
          className="h-11 w-full rounded-md border border-border bg-transparent px-3 text-base outline-none focus:border-[#D3B574]"
        />
      )}
      <button
        type="button"
        onClick={() => void send()}
        disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#D3B574] px-4 text-sm font-bold text-[#D3B574] hover:bg-[#D3B574]/10 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
        Email me a link to sign in
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
