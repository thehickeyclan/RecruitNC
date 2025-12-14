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

**See `LEGACYNC_FIX_GUIDE.md` for complete details.**

