# 🔒 LOCKED AUTHENTICATION CONFIGURATION

## ⚠️ CRITICAL: DO NOT MODIFY THESE SETTINGS

This configuration prevents Supabase rate limiting issues. Changing these settings will cause users to be locked out.

---

## Core Settings (DO NOT CHANGE)

### 1. Supabase Client Configuration (`lib/supabase/client.ts`)
```typescript
auth: {
  autoRefreshToken: false,  // ⚠️ MUST BE FALSE - prevents automatic refresh that causes rate limits
  persistSession: true,      // ✅ Keep true - stores session in cookies
  detectSessionInUrl: false, // ✅ Keep false - prevents URL-based auth detection
}
```

**Why:** `autoRefreshToken: false` is CRITICAL. When enabled, Supabase automatically refreshes tokens on every request, causing rate limits even when users aren't actively logging in.

### 2. Server Client Configuration (`lib/supabase/server.ts`)
```typescript
auth: {
  autoRefreshToken: false,  // ⚠️ MUST BE FALSE - same reason as client
  persistSession: false,     // ✅ Keep false - server doesn't persist
}
```

### 3. Auth Context (`contexts/auth-context.tsx`)
- **NO `onAuthStateChange` listener** - This was causing automatic auth calls
- **NO `getSession()` on mount** - Only called when cookies exist and cooldown is not active
- **Cooldown check removed from signIn** - Let Supabase handle rate limiting naturally

### 4. Middleware (`middleware.ts`)
- **NO `getUser()` or `getSession()` calls** - Middleware should NOT make auth calls
- Only checks for cooldown cookies, doesn't make API calls
- Skips auth entirely for public routes

---

## Admin Login Bypass

If rate limiting occurs, the sign-in page automatically tries `/api/auth/admin-login` which uses the service role key to bypass rate limits.

**Location:** `app/api/auth/admin-login/route.ts`

**How it works:**
1. Regular login fails with rate limit
2. Sign-in page detects rate limit error
3. Automatically calls admin login API
4. Admin API uses service role key (bypasses rate limits)
5. Sets session cookies via SSR client

---

## What Was Causing Rate Limits

1. **`autoRefreshToken: true`** - Supabase was automatically refreshing tokens on every request
2. **`onAuthStateChange` listener** - Triggered automatic auth calls even when user wasn't logging in
3. **Middleware calling `getUser()`** - Made auth calls on every request, including static assets
4. **`getSession()` on mount** - Called even when no cookies existed, triggering auth attempts

---

## Current Safe Configuration

✅ **Client-side:**
- `autoRefreshToken: false`
- No `onAuthStateChange` listener
- `getSession()` only called once on mount IF cookies exist
- No cooldown blocking - let Supabase handle rate limits

✅ **Server-side:**
- `autoRefreshToken: false`
- No auth calls in middleware
- Admin login API as fallback for rate limits

✅ **Sign-in flow:**
- Try regular login first
- If rate limited, automatically try admin login API
- Wait 1 second before redirect to ensure cookies are set
- Use `window.location.href` for full page reload

---

## Testing Checklist

Before deploying any auth changes, verify:

- [ ] `autoRefreshToken` is `false` in both client and server
- [ ] No `onAuthStateChange` listener in auth context
- [ ] Middleware does NOT call `getUser()` or `getSession()`
- [ ] Sign-in page has admin login fallback
- [ ] Session cookies are set after login
- [ ] User stays logged in after page refresh

---

## Emergency Recovery

If rate limiting occurs:

1. Visit `/auth/clear-cooldown` to clear any cooldown flags
2. Admin login API will automatically bypass rate limits
3. Check Supabase dashboard for actual rate limit status

---

## Last Updated

2025-01-XX - Locked down after resolving 2-day rate limiting issue

**DO NOT MODIFY WITHOUT UNDERSTANDING THE FULL IMPACT**

