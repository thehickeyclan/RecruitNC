# Bulletproof internal links (global fix)

## Problem

Internal links (menu, tiles, articles, any new URL) did nothing when clicked for an extended period — no navigation, no error. Affected all new hyperlinks site-wide (navbar, admin tiles, article links, etc.).

## Solution

**`components/bulletproof-internal-links.tsx`** — a client component mounted in the root layout that:

1. Listens for **all** clicks on `document` in **capture phase** (runs before other handlers).
2. If the click target is (or is inside) an `<a>` with a **same-origin** `href`:
   - Calls `preventDefault()` and `stopPropagation()`.
   - Sets `window.location.href = anchor.href` so the browser does a **full page load**.

So every same-origin link click results in a real navigation, regardless of Next.js `<Link>`, client router, or any other script.

## What we skip

- **External links** (`href` to another origin): not touched.
- **New-tab intent**: `target="_blank"` or Ctrl/Cmd/Shift click: left to the browser.

## Tradeoff

Internal navigation no longer uses Next.js client-side routing; each click is a full document load. That restores reliability when client-side nav or other scripts were preventing navigation.

## Where it’s mounted

`app/layout.tsx` — inside `AuthProvider`, next to `LayoutOptionalClients`, so it runs on every page.

## Removing it later

If the root cause of broken navigation is fixed (e.g. Next.js or an iframe script), you can remove `<BulletproofInternalLinks />` from the root layout and optionally delete `components/bulletproof-internal-links.tsx`.
