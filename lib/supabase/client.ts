"use client"

import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
  })
}
