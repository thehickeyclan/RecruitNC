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
  const AUTO_REFRESH_TOKEN = false // ⚠️ DO NOT CHANGE - LOCKED CONFIG
  
  // Validate critical setting at runtime
  if (AUTO_REFRESH_TOKEN !== false) {
    console.error("🚨 CRITICAL ERROR: autoRefreshToken must be false to prevent rate limits!")
    throw new Error("Invalid auth configuration - autoRefreshToken must be false")
  }
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: AUTO_REFRESH_TOKEN, // ⚠️ LOCKED - DO NOT CHANGE
        persistSession: true,
        detectSessionInUrl: false,
      },
      cookies: {
        get(name: string) {
          if (typeof document === "undefined") return undefined
          return document.cookie
            .split("; ")
            .find((row) => row.startsWith(`${name}=`))
            ?.split("=")[1]
        },
        set(name: string, value: string, options: any) {
          if (typeof document === "undefined") return
          document.cookie = `${name}=${value}; path=/; SameSite=None; Secure; ${
            options?.maxAge ? `max-age=${options.maxAge}` : ""
          }`
        },
        remove(name: string, options: any) {
          if (typeof document === "undefined") return
          document.cookie = `${name}=; path=/; SameSite=None; Secure; max-age=0`
        },
      },
    },
  )
}
