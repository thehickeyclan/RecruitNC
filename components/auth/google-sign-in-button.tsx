"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * "Continue with Google" — one button, both auth pages.
 *
 * About one real sign-up in ten never confirms their email — 101 of the 1,012 accounts made
 * before September. They sit in the table looking like users, having never once signed in,
 * because the only door we offered them needed a link they never clicked. This is the door with
 * no link to click.
 *
 * (Do not read September's rate as a human number: 103 of that month's 207 sign-ups are a bot
 * wave hitting the password form, scraped business domains and dotted Gmail aliases. Those
 * inflate every "never confirmed" count that includes them.)
 *
 * Sign-in and sign-up share it deliberately. With Google there is no difference between the two —
 * the same tap either finds the account or makes one — and two buttons that drift apart is how
 * you end up with one of them sending people somewhere they cannot get back from.
 */
export function GoogleSignInButton({
  returnTo,
  label = "Continue with Google",
}: {
  /** Where to land afterwards. Same-origin paths only — an open redirect here is a phishing tool. */
  returnTo?: string | null
  label?: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      const safeNext = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/"
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // The existing callback route exchanges the code and upserts the profile row; `next`
          // is the same parameter the email flow already uses.
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      })
      if (oauthError) throw oauthError
      // On success the browser is already navigating to Google; leave the button disabled.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start Google sign-in.")
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 sm:h-12"
      >
        {/* Google's mark, inline so it cannot fail to load on a sign-in page. */}
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
          />
          <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
          />
        </svg>
        {busy ? "Opening Google…" : label}
      </button>
      {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
