# 🚨 LegacyNC Quick Fix - Copy & Paste

## 30-Second Fix

Find your Supabase client creation and change this:

```typescript
// ❌ BEFORE (causes rate limits)
auth: {
  autoRefreshToken: true,
}

// ✅ AFTER (fixes rate limits)
auth: {
  autoRefreshToken: false,  // Change this one line
}
```

Do this in:
- Client-side Supabase client
- Server-side Supabase client
- Any middleware that creates Supabase clients

---

## 2-Minute Fix

### Step 1: Disable Auto-Refresh
Find all places where you create Supabase clients and set:
```typescript
autoRefreshToken: false
```

### Step 2: Remove onAuthStateChange
Find and remove/comment out:
```typescript
supabase.auth.onAuthStateChange(...)
```

### Step 3: Remove Auth Calls from Middleware
Find middleware and remove:
```typescript
await supabase.auth.getUser()
await supabase.auth.getSession()
```

---

## Files to Check

1. `lib/supabase/client.ts` (or similar)
2. `lib/supabase/server.ts` (or similar)
3. `middleware.ts` (or `middleware.js`)
4. Auth context/provider component
5. Any other files that create Supabase clients

---

## Test

After changes:
1. Clear browser cookies
2. Try logging in
3. Should work without rate limiting

---

---

## ⚠️ Server-Side Rate Limiting

Even after fixing client-side issues, **Supabase's servers may still rate limit**. This requires retry logic with exponential backoff.

### Quick Retry Fix

Add this to your admin login API:

```typescript
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const isRateLimit = 
        error?.message?.includes("rate limit") ||
        error?.status === 429
      
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
}

// Use it:
const authData = await retryWithBackoff(async () => {
  const { data, error } = await adminClient.auth.signInWithPassword({ email, password })
  if (error && (error.message?.includes("rate limit") || error.status === 429)) {
    const rateLimitError = new Error(error.message)
    rateLimitError.status = 429
    throw rateLimitError
  }
  if (error) throw error
  return data
}, 3, 1000)
```

**See `LEGACYNC_FIX_GUIDE.md` for complete details and full code examples.**

