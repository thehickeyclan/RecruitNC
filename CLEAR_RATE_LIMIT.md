# Clear Rate Limit Issue - Emergency Instructions

## Step 1: Clear Browser State (Do this NOW)

### In Chrome/Edge:
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Storage" in left sidebar
4. Click "Clear site data"
5. Check all boxes
6. Click "Clear site data"

### In Firefox:
1. Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
2. Select "Everything" for time range
3. Check "Cookies" and "Cache"
4. Click "Clear Now"

## Step 2: Wait 60 Seconds
Supabase enforces a 60-second cooldown after rate limiting.

## Step 3: Check Deployment Status
```bash
# Check if new code is deployed
curl -I https://recruitnorthcarolina.com | grep -i "x-vercel"
```

## Step 4: Try Login Again
The new code should:
- Clear cookies BEFORE attempting login
- Show clear error message if rate limited
- Not retry automatically

## If Still Having Issues:

### Use Incognito/Private Window
This guarantees fresh cookies and no cached code.

### Or Visit Clear Session Page
Go to: https://your-site.com/auth/clear-session

### Check IP Rate Limiting
If multiple people on same network are logging in, you might need to wait longer.









