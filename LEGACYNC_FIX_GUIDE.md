# 🔧 LegacyNC Supabase Auth Rate Limiting Fix Guide

## ⚠️ URGENT: Apply These Fixes Immediately

If LegacyNC is experiencing timeouts, rate limiting, or "too many login attempts" errors, these are the exact fixes that resolved the issue in the main app.

---

## Root Cause

The rate limiting was caused by:
1. **`autoRefreshToken: true`** - Supabase automatically refreshing tokens on every request
2. **`onAuthStateChange` listener** - Triggering automatic auth calls even when users aren't logging in
3. **Middleware calling `getUser()` or `getSession()`** - Making auth calls on every request, including static assets
4. **Automatic `getSession()` calls on mount** - Calling auth APIs even when no cookies exist

---

## Required Fixes

### 1. Disable Auto-Refresh Token (CRITICAL)

**File:** Wherever you create your Supabase client (usually `lib/supabase/client.ts` or similar)

**Before:**
```typescript
const supabase = createBrowserClient(url, key, {
  auth: {
    autoRefreshToken: true,  // ❌ THIS CAUSES RATE LIMITS
    persistSession: true,
  }
})
```

**After:**
```typescript
const supabase = createBrowserClient(url, key, {
  auth: {
    autoRefreshToken: false,  // ✅ MUST BE FALSE
    persistSession: true,
    detectSessionInUrl: false,
  }
})
```

**Why:** When `autoRefreshToken` is `true`, Supabase automatically tries to refresh tokens on every request, causing rate limits even when users aren't actively logging in.

---

### 2. Disable onAuthStateChange Listener (CRITICAL)

**File:** Your auth context/provider component

**Before:**
```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      // This triggers automatic auth calls
      setSession(session)
      setUser(session?.user ?? null)
    }
  )
  return () => subscription.unsubscribe()
}, [])
```

**After:**
```typescript
// ⚠️ DO NOT USE onAuthStateChange - it causes automatic auth calls
// Only check session when user explicitly logs in
// Remove or comment out the entire onAuthStateChange listener
```

**Why:** The `onAuthStateChange` listener triggers automatic auth API calls even when users aren't logging in, causing rate limits.

---

### 3. Remove Auth Calls from Middleware (CRITICAL)

**File:** `middleware.ts` or similar middleware file

**Before:**
```typescript
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)
  
  // ❌ THIS CAUSES RATE LIMITS ON EVERY REQUEST
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.redirect('/login')
  }
  
  return NextResponse.next()
}
```

**After:**
```typescript
export async function middleware(request: NextRequest) {
  // ⚠️ DO NOT CALL getUser() or getSession() in middleware
  // This causes rate limits on every request, including static assets
  
  // Only check for cookies, don't make auth API calls
  const hasCookies = request.cookies.getAll().some(c => c.name.startsWith('sb-'))
  
  // Let client-side handle auth checks
  return NextResponse.next()
}
```

**Why:** Calling `getUser()` or `getSession()` in middleware makes auth API calls on EVERY request (including static assets), causing massive rate limiting.

---

### 4. Only Call getSession() When Cookies Exist

**File:** Your auth context/provider component

**Before:**
```typescript
useEffect(() => {
  // ❌ This calls auth API even when no cookies exist
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
  }
  checkSession()
}, [])
```

**After:**
```typescript
useEffect(() => {
  const initializeAuth = async () => {
    // Only check session if cookies exist
    if (typeof document !== "undefined") {
      const hasCookies = document.cookie.includes("sb-")
      if (!hasCookies) {
        // No cookies = no session, don't make API call
        setSession(null)
        setUser(null)
        setIsLoading(false)
        return
      }
    }
    
    // Only call getSession() if cookies exist
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setSession(session)
      setUser(session.user)
    }
    setIsLoading(false)
  }
  
  initializeAuth()
}, [])
```

**Why:** Calling `getSession()` when no cookies exist triggers unnecessary auth API calls that contribute to rate limits.

---

### 5. Server-Side Client Configuration

**File:** Server-side Supabase client creation

**Before:**
```typescript
const supabase = createServerClient(url, key, {
  auth: {
    autoRefreshToken: true,  // ❌ CAUSES RATE LIMITS
  }
})
```

**After:**
```typescript
const supabase = createServerClient(url, key, {
  auth: {
    autoRefreshToken: false,  // ✅ MUST BE FALSE
    persistSession: false,
  }
})
```

---

## Quick Implementation Checklist

- [ ] Find all Supabase client creation locations
- [ ] Set `autoRefreshToken: false` in ALL clients (client and server)
- [ ] Remove or disable `onAuthStateChange` listeners
- [ ] Remove `getUser()` and `getSession()` calls from middleware
- [ ] Only call `getSession()` when cookies exist
- [ ] Test login flow
- [ ] Verify no rate limiting occurs

---

## Complete Example: Fixed Auth Context

```typescript
"use client"

import { createBrowserClient } from "@supabase/ssr"
import { useEffect, useState } from "react"

export function AuthProvider({ children }) {
  const [supabase] = useState(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,  // ✅ CRITICAL
          persistSession: true,
          detectSessionInUrl: false,
        }
      }
    )
  )
  
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      // Only check if cookies exist
      if (typeof document !== "undefined") {
        const hasCookies = document.cookie.includes("sb-")
        if (!hasCookies) {
          setSession(null)
          setUser(null)
          setIsLoading(false)
          return
        }
      }
      
      // Only call getSession() if cookies exist
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSession(session)
        setUser(session.user)
      }
      setIsLoading(false)
    }
    
    initializeAuth()
    
    // ⚠️ DO NOT USE onAuthStateChange - it causes automatic auth calls
    // Remove any onAuthStateChange listeners
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    // Clear stale cookies before login
    const cookies = document.cookie.split("; ")
    cookies.forEach(cookie => {
      const [name] = cookie.split("=")
      if (name.trim().startsWith("sb-")) {
        document.cookie = `${name.trim()}=; path=/; max-age=0`
      }
    })
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (!error && data?.session) {
      setSession(data.session)
      setUser(data.user)
    }
    
    return { data, error }
  }

  return (
    <AuthContext.Provider value={{ user, session, signIn, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

---

## Complete Example: Fixed Middleware

```typescript
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for public routes
  const publicRoutes = ['/auth/signin', '/auth/signup', '/api/auth']
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // ⚠️ DO NOT CALL getUser() or getSession() HERE
  // This causes rate limits on every request
  
  // Just pass through - let client-side handle auth
  return NextResponse.next()
}
```

---

## Verification Steps

After applying fixes:

1. **Clear all cookies and storage:**
   - Open browser dev tools
   - Application tab → Clear all cookies and localStorage
   - Or visit a clear-session page if you have one

2. **Test login:**
   - Try logging in
   - Should work without rate limiting
   - Should stay logged in after page refresh

3. **Monitor for rate limits:**
   - Check browser console for 429 errors
   - Should not see "too many login attempts" errors
   - Should not see automatic auth API calls in network tab

4. **Check network tab:**
   - After login, should NOT see repeated calls to `/auth/v1/token`
   - Should only see auth calls when explicitly logging in

---

## Emergency Recovery

If rate limiting is already active:

1. **Wait 10-15 minutes** for Supabase rate limit to reset
2. **Clear all cookies** (including `rate_limit_cooldown` if it exists)
3. **Apply all fixes above**
4. **Try logging in again**

---

## Key Takeaways

✅ **DO:**
- Set `autoRefreshToken: false` everywhere
- Only call `getSession()` when cookies exist
- Let client-side handle auth checks
- Only make auth calls when user explicitly logs in

❌ **DON'T:**
- Enable `autoRefreshToken`
- Use `onAuthStateChange` listener
- Call `getUser()` or `getSession()` in middleware
- Call `getSession()` when no cookies exist

---

## Need Help?

If you're still experiencing issues after applying these fixes:

1. Check browser console for errors
2. Check network tab for failed auth requests
3. Verify all Supabase clients have `autoRefreshToken: false`
4. Verify middleware doesn't make auth calls
5. Verify `onAuthStateChange` is disabled

---

---

## ⚠️ IMPORTANT: Server-Side Rate Limiting

Even after applying all fixes above, **Supabase itself may still rate limit at the server level**. This is different from client-side rate limiting.

### The Problem

- **Client-side fixes** prevent unnecessary auth calls
- **Server-side rate limits** are enforced by Supabase's infrastructure
- Even the service role key can hit rate limits if Supabase's servers are overloaded

### The Solution: Retry with Exponential Backoff

Add retry logic to your admin login API:

```typescript
/**
 * Retry helper with exponential backoff for handling Supabase rate limits
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Check if it's a rate limit error
      const isRateLimit = 
        error?.message?.includes("rate limit") ||
        error?.message?.includes("429") ||
        error?.message?.includes("Too many") ||
        error?.status === 429 ||
        error?.code === "429"
      
      // Only retry on rate limit errors
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) // 1s, 2s, 4s
        console.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw error
    }
  }
  
  throw lastError
}

// Use it in your admin login:
const authData = await retryWithBackoff(async () => {
  const { data, error } = await adminClient.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    const isRateLimit = 
      error.message?.includes("rate limit") ||
      error.message?.includes("429") ||
      error.message?.includes("Too many")
    
    if (isRateLimit) {
      const rateLimitError: any = new Error(error.message)
      rateLimitError.status = 429
      throw rateLimitError
    }
    throw error
  }
  
  return data
}, 3, 1000) // 3 retries, 1 second base delay
```

### How It Works

1. **First attempt:** Immediate
2. **If rate limited:** Wait 1 second, retry
3. **If still rate limited:** Wait 2 seconds, retry
4. **If still rate limited:** Wait 4 seconds, retry
5. **If still fails:** Return error

This gives Supabase's rate limit time to reset while automatically retrying.

---

## Complete Admin Login with Retry

```typescript
import { createAdminClient } from "@/lib/supabase/admin"

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      const isRateLimit = 
        error?.message?.includes("rate limit") ||
        error?.message?.includes("429") ||
        error?.status === 429
      
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
  throw lastError
}

export async function POST(request: Request) {
  const { email, password } = await request.json()
  const adminClient = createAdminClient()
  
  try {
    // Retry login with exponential backoff
    const authData = await retryWithBackoff(async () => {
      const { data, error } = await adminClient.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        const isRateLimit = error.message?.includes("rate limit") || error.status === 429
        if (isRateLimit) {
          const rateLimitError: any = new Error(error.message)
          rateLimitError.status = 429
          throw rateLimitError
        }
        throw error
      }
      
      if (!data?.user || !data?.session) {
        throw new Error("Invalid response")
      }
      
      return data
    }, 3, 1000)
    
    // Verify admin status
    const profile = await retryWithBackoff(async () => {
      const { data, error } = await adminClient
        .from("user_profiles")
        .select("is_admin")
        .eq("user_id", authData.user.id)
        .single()
      
      if (error) {
        if (error.message?.includes("rate limit") || error.status === 429) {
          const rateLimitError: any = new Error(error.message)
          rateLimitError.status = 429
          throw rateLimitError
        }
        throw error
      }
      return data
    }, 2, 500)
    
    if (!profile?.is_admin) {
      return Response.json({ error: "Admin access required" }, { status: 403 })
    }
    
    // Set session cookies and return success
    return Response.json({ success: true, user: authData.user })
    
  } catch (error: any) {
    const isRateLimit = 
      error?.message?.includes("rate limit") ||
      error?.status === 429
    
    if (isRateLimit) {
      return Response.json(
        { 
          error: "Supabase is currently rate limiting. Please wait a few minutes.",
          rateLimited: true
        },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }
    
    return Response.json(
      { error: error.message || "Login failed" },
      { status: error.status || 500 }
    )
  }
}
```

---

**Last Updated:** 2025-01-XX  
**Status:** ✅ Tested and verified in production  
**Note:** Added retry logic for server-side rate limiting

