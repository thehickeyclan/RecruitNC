"use client"

import { useEffect } from "react"

/**
 * If the user landed on ANY page with password-recovery params in the URL
 * (Supabase sent them to Site URL or wrong path), send them to the reset flow.
 * Runs once on mount so reset links work no matter which page they hit.
 */
export function RecoveryRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return
    const pathname = window.location.pathname
    if (pathname === "/auth/callback" || pathname === "/auth/reset-password") return

    const url = new URL(window.location.href)
    const hash = window.location.hash?.slice(1)
    const code = url.searchParams.get("code")
    const tokenHash = url.searchParams.get("token_hash")
    const type = url.searchParams.get("type")

    if (hash && (hash.includes("access_token=") || hash.includes("refresh_token="))) {
      window.location.replace(`/auth/reset-password${window.location.hash}`)
      return
    }
    // Send code/token_hash to reset page so it can exchange client-side (server callback often fails redirect_uri)
    if (code || (tokenHash && type === "recovery")) {
      const params = new URLSearchParams(url.searchParams)
      params.delete("next")
      const qs = params.toString()
      window.location.replace(`/auth/reset-password${qs ? `?${qs}` : ""}`)
    }
  }, [])
  return null
}
