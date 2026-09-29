"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { parseAppHandoff, safeNextPath } from "@/lib/app-handoff"

/**
 * Where the app lands a web page it opens, so the person arrives signed in.
 *
 * See /api/mobile/v1/web-handoff for why the sheet needs its own session. This page spends the
 * one-time token, then replaces itself with the page that was asked for — a full navigation, so
 * the auth context reads the new cookies from scratch.
 *
 * The sheet keeps its cookies between opens. When it is already signed in as the same person the
 * token is left unspent: exchanging one on every profile tap would mint a session each time, and
 * auth calls are the thing this site has been rate-limited on before.
 *
 * Whatever goes wrong, the person still reaches the page — signed out, which is what they would
 * have seen before this existed.
 */
export default function AppHandoffPage() {
  useEffect(() => {
    const handoff = parseAppHandoff(window.location.hash)
    // Out of the address bar and history before anything else happens.
    window.history.replaceState(null, "", window.location.pathname)

    if (!handoff) {
      window.location.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")))
      return
    }

    const go = () => window.location.replace(handoff.next)
    const supabase = createClient()

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session?.user && data.session.user.id === handoff.userId) return go()

        // Someone else's session in this sheet (a shared phone, a changed account) — the app's
        // account wins, since that is who tapped.
        if (data.session) await supabase.auth.signOut({ scope: "local" })

        const { error } = await supabase.auth.verifyOtp({ token_hash: handoff.tokenHash, type: "email" })
        if (error) console.warn("[app-handoff] sign-in failed:", error.message)
      } catch (error) {
        console.warn("[app-handoff] sign-in failed:", error instanceof Error ? error.message : error)
      }
      go()
    })()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A1628] text-sm text-white/70">
      Opening…
    </div>
  )
}
