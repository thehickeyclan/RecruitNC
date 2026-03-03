# Store link "canceled" – status

## What you see

- Network tab: **store (canceled)** document requests, initiator **layout-….js**
- Cart works (same pattern: handleNav / window.location.href); Store does not – the first request to /store is canceled
- Multiple cancels in the log are from the user clicking repeatedly because the first click never loads the page

## Root cause: unknown

**The first document request to /store is being canceled.** We don’t yet know what is aborting it. Same pattern (button + window.location.href) works for Cart but not for Store. Initiator is layout.js (the code runs in the layout bundle); that doesn’t by itself explain why this request is canceled and Cart’s isn’t.

## What we’ve tried (no fix yet)

- Form GET, button instead of link, handleNav like Cart, middleware exclude for /store, removing BulletproofInternalLinks, one-time guard on Store click. Store request still gets canceled.

## One-time guard (current code)

We keep a guard (`window.__storeNavigating`) so that if the user clicks Store multiple times, we only start one navigation. This doesn’t fix the cancel – it just avoids a pile of duplicate requests while we still need to find why the first one is canceled.

## Nuclear option (implemented)

**Stop requesting the path that gets canceled.** The client never requests `/store` (the React page) anymore.

1. **GET /store** is now **route-only**: `app/store/route.ts` returns **302 → /store-app**. No React, no RSC stream. So any request to `/store` is a single redirect response (nothing for the client to cancel in the same way).
2. **Real store UI** lives at **/store-app**: `app/store-app/page.tsx` and `app/store-app/product/[id]/page.tsx`. All store links (navbar, footer, product cards, admin, reviews) point to `/store-app` and `/store-app/product/x`.
3. **Store button** does `window.location.href = "/store-app"`. So the first (and only) document request is to **/store-app**, not `/store`. If the cancel was specific to the path `/store`, this works.
4. **/store/product/x** still works: `app/store/product/[id]/route.ts` redirects to `/store-app/product/[id]` (for old links or shared URLs).
5. **Middleware** excludes both `/store` and `/store-app` from the matcher so neither runs layout middleware.

So: we never ask the client to load the React page at `/store`. We only load `/store-app`. If cancels were tied to the pathname `/store`, Store will work now.
