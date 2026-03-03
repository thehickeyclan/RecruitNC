# Bulletproof internal links (global fix)

## Problem

Internal links (menu, tiles, articles, any new URL) did nothing when clicked — no navigation, no error. Often **only new links** (or new routes) fail while older links work.

**Why only new links?** Next.js client-side router has a route table built at build time. `<Link href="/x">` does `preventDefault` + `router.push("/x")`. If `/x` isn’t in the client’s route table, the router no-ops and nothing happens. Old routes are in the table; new ones may not be. So the fix is to stop relying on the client router and force a full page load for internal links.

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

## If it still doesn’t fix clicks

1. **Confirm the handler runs:** Open the site with `?bulletproof_debug=1` in the URL (e.g. `https://app.ncwrestlingunited.com/?bulletproof_debug=1`). Click a link that usually does nothing. Open DevTools → Console. If you see `[BulletproofInternalLinks] intercepting internal link → ...`, the handler ran and the element was an `<a href>`. If you see nothing, the click either didn’t hit an `<a>` (e.g. a button or div with onClick) or the handler isn’t mounted.
2. **If handler runs but page doesn’t navigate:** Something else is wrong (e.g. navigation is blocked after we set `window.location.href`).
3. **If handler never runs:** The “new” links may not be real `<a href>` tags (e.g. they’re Next `<Link>` that render differently, or custom components that use `router.push` on a div/button). Fix: change those to plain `<a href="...">` or use a component that renders `<a>` and, if needed, `onClick` that does `window.location.href = href`.

## Removing it later

If the root cause of broken navigation is fixed (e.g. Next.js or an iframe script), you can remove `<BulletproofInternalLinks />` from the root layout and optionally delete `components/bulletproof-internal-links.tsx`.
