# If "store (canceled)" Still Appears – Next Steps

We’ve already:
- Removed `<a href="/store">` from layout (StoreNavLink = span + click).
- Disabled prefetch for all store links (StoreLink = Link with `prefetch={false}`).
- Documented in next.config that there is no global prefetch config.

If the layout still requests the store document and it gets canceled, use this playbook.

---

## 1. Pin down what’s actually requesting it

In DevTools → Network:

- Click the **"store"** request (canceled or pending).
- Check **Request URL**: is it the page URL (e.g. `https://yoursite.com/store`) or an RSC payload URL (e.g. with `_rsc`, `__rsc__`, or similar)?
- Check **Initiator**: which script/line (e.g. `layout-xxxxx.js` and line number).
- If your browser supports it, open **Initiator** → “Call stack” or “Async stack” to see which function triggered the fetch.

That tells us:
- Whether it’s an RSC prefetch vs a full document navigation.
- Which bundle (layout vs page) and possibly which React/Next path is responsible.

---

## 2. Try forcing the store route to be non-prefetchable

In `app/store/page.tsx` (or the layout under `app/store/` if you have one):

- Add **dynamic rendering** so Next doesn’t treat the route as fully static and prefetch it:
  - e.g. `export const dynamic = 'force-dynamic'`, or
  - use a dynamic API (e.g. `cookies()`, `headers()`, or `unstable_noStore()`) in the server component.

Then redeploy and see if “store (canceled)” still appears. If it stops, the cause is likely prefetch of a static store route.

---

## 3. Confirm it’s not from any remaining Link

Temporarily:

- Search the repo for every `Link` and every `href=.*store` (and `router.push`/`replace` to `/store`).
- Ensure **every** store link is either:
  - `StoreNavLink` (for “/store” only), or
  - `StoreLink` (for “/store” and “/store/…”).
- If anything still uses raw `<Link href="/store">` or `<a href="/store">` in layout or above-the-fold content, replace with StoreNavLink/StoreLink.

---

## 4. Nuclear: no store link in root layout

To prove the request is tied to “layout sees a store link”:

- **Temporarily** remove Store from navbar and footer (comment out or feature-flag).
- Leave store reachable only via a direct URL or a link that’s not in the root layout (e.g. a CTA on the homepage that’s below the fold or in page content only).
- Deploy and check if “store (canceled)” disappears.

If it disappears, the trigger is something in the layout tree (even if it’s framework behavior when *any* store link exists). If it still appears, the trigger is elsewhere (e.g. router/prefetch logic that doesn’t depend on our links).

---

## 5. Check Next.js version and issues

- Note your Next.js version (e.g. in `package.json`).
- Search GitHub: `next.js` + “prefetch” + “canceled” or “layout” + “rsc” + “cancel”.
- Check [Next.js App Router prefetch docs](https://nextjs.org/docs/app/guides/prefetching) for any new options or breaking changes in your version.

If you find a matching issue, apply the suggested workaround or upgrade and retest.

---

## 6. Accept and ignore (last resort)

If the request is:

- Always canceled and never used, and
- Not causing real navigation or loading bugs,

then it may be acceptable to document it as “known framework behavior” and leave it, and re-check after upgrading Next.js.

---

**Summary:** Next step is **1** (inspect the request and initiator). Then **2** (force-dynamic store route). Then **3** (audit links) and **4** (remove store from layout) to isolate cause. **5** and **6** are for understanding the framework or living with it.
