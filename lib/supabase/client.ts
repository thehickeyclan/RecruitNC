"use client"

import { createBrowserClient } from "@supabase/ssr"

/**
 * ⚠️ LOCKED CONFIGURATION - DO NOT MODIFY ⚠️
 * 
 * This configuration prevents Supabase rate limiting issues.
 * Changing autoRefreshToken to true will cause users to be locked out.
 * 
 * See AUTH_CONFIG_LOCKED.md for full documentation.
 */
export function createClient() {
  // ⚠️ CRITICAL: autoRefreshToken MUST be false
  // When true, Supabase automatically refreshes tokens on every request,
  // causing rate limits even when users aren't actively logging in.
  // This was the root cause of the 2-day lockout issue.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the dev server."
    )
  }

  const AUTO_REFRESH_TOKEN = false // ⚠️ DO NOT CHANGE - LOCKED CONFIG
  
  // Validate critical setting at runtime
  if (AUTO_REFRESH_TOKEN !== false) {
    console.error("🚨 CRITICAL ERROR: autoRefreshToken must be false to prevent rate limits!")
    throw new Error("Invalid auth configuration - autoRefreshToken must be false")
  }
  
  return createBrowserClient(
    url,
    key,
    {
      auth: {
        autoRefreshToken: AUTO_REFRESH_TOKEN, // ⚠️ LOCKED - DO NOT CHANGE
        persistSession: true,
        detectSessionInUrl: false,
      },
    cookies: {
      get(name: string) {
        if (typeof document === "undefined") return undefined
        const prefix = `${name}=`
        const row = document.cookie
          .split("; ")
          .find((r) => r.startsWith(prefix))
        const fromCookie = row ? row.slice(prefix.length) : undefined
        if (fromCookie) return fromCookie
        // Fallback: read from localStorage when cookies are blocked (e.g. Chrome desktop, iframe)
        try {
          return localStorage.getItem(name) ?? undefined
        } catch {
          return undefined
        }
      },
      set(name: string, value: string, options: any) {
        if (typeof document === "undefined") return
        // Chrome rejects cookies with Secure on HTTP; Safari is more permissive. Only set Secure on HTTPS.
        const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : ""
        const maxAge = options?.maxAge ? `; max-age=${options.maxAge}` : ""
        document.cookie = `${name}=${value}; path=/; SameSite=Lax${secure}${maxAge}`
        // Persist to localStorage so session survives when cookies are blocked
        try {
          localStorage.setItem(name, value)
        } catch (_) {}
      },
      remove(name: string) {
        if (typeof document === "undefined") return
        const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : ""
        document.cookie = `${name}=; path=/; SameSite=Lax${secure}; max-age=0`
        try {
          localStorage.removeItem(name)
        } catch (_) {}
      },
    },
    },
  )
}
