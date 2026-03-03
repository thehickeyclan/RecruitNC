# Internal Navigation & Links: Issue and Fix (Full Documentation)

This document describes the internal navigation/link failures that affected the app (Store, admin, articles, etc.), the root causes, and the fixes applied. It also covers the login regression and its fix.

---

## 1. The Issue

### Symptoms

- **Store link:** Clicking "Store" in the navbar or footer did nothing, or the Network tab showed a document request to `store-app` as **(canceled)** or **(pending)**. The layout bundle (`layout-*.js`) was often the initiator.
- **Other internal links:** Admin, articles, Blue, and other "new" or critical routes sometimes did nothing on click, or showed canceled document requests.
- **Cart worked:** A plain `<a href="/cart">` reliably worked, which suggested the problem was specific to how Store and other links were implemented (forms, Next `<Link>`, or client-side navigation).
- **Login broke later:** After adding a "bulletproof" form handler to fix Store, **all users could not log in**. Entering credentials and submitting caused the page to "blink" briefly with no sign-in; no POST was sent.

---

## 2. Root Causes

### 2.1 Why Store and other links failed

- **Next.js client-side navigation:** `<Link href="/store-app">` and similar use the Next.js router (`preventDefault` + `router.push()`). The client has a route table built at build time. If the route isn’t in that table or the RSC request is started and then canceled (e.g. by another navigation or by layout code), the user sees no navigation or a canceled request.
- **Layout initiating/canceling requests:** The Network tab showed the **initiator** for the store-app document request as `layout-*.js`. So the layout bundle was starting (or interfering with) the navigation. Our React-based "bulletproof" handler ran in `useEffect` (after hydration), so Next/layout could already have registered its own behavior and won the race.
- **Forms and same-tab navigation:** Store was implemented as a **form GET** to `/store-app` with `target="_top"` to force a full document load. Even then, the request could be canceled because layout or other client code was also reacting to the submit.

### 2.2 Why login broke (regression)

- A global **form submit** handler was added (inline script in `<head>` + `BulletproofInternalLinks`) to force same-origin form submits to a single full-page navigation: `preventDefault`, then `window.location.href = url`.
- That handler did **not** distinguish GET vs POST. For **every** form (including login with `method="post"`), it:
  1. Prevented the default submit.
  2. Built a URL from the form’s `action` (and for GET, from `FormData`).
  3. Set `window.location.href = url`, which is a **GET** request with **no POST body**.
- So the login form never sent email/password to the server. The server received at most a GET to the sign-in URL; the page "blinked" because the browser simply loaded the sign-in page again. Effectively, all users were locked out of sign-in.

---

## 3. Fixes Applied

### 3.1 Store: plain anchor (no form, no Next)

- **StoreButton** and **StoreNavLink** were changed from a form (`<form method="get" action="/store-app">` + submit button) to a **plain anchor**: `<a href="/store-app">`. Mobile sheet close still uses `onClick={() => onNavigate?.()}` before navigation.
- One click = one browser GET to `/store-app`. No form submit, no Next.js router, no layout-initiated request. Store navigation is reliable.

**Files:** `components/store-button.tsx`, `components/store-nav-link.tsx`

### 3.2 Inline script: only intercept GET form submits

- An **inline script** in `app/layout.tsx` (in `<head>`) runs before React/Next. It attaches capture-phase listeners for:
  - **Clicks** on same-origin `<a>` → `preventDefault`, `stopPropagation`, `window.location.href = anchor.href`.
  - **Submits** of same-origin **GET** forms only → `preventDefault`, build URL from `FormData`, `window.location.href = url`.
- **POST forms are not intercepted:** the handler returns immediately when `method !== 'get'`, so login, signup, and all other POST forms submit normally with their body.

**File:** `app/layout.tsx` (inline script in `<head>`)

### 3.3 BulletproofInternalLinks: only intercept GET form submits

- The React component `BulletproofInternalLinks` (mounted in the root layout) does the same logic for links and forms. Its **form handler** was updated to only run when `method === 'get'`. POST forms are left alone.

**File:** `components/bulletproof-internal-links.tsx`

### 3.4 Other navigation hardening (already in place)

- **AuthGuard / RoleGuard:** Redirects use `window.location.href` instead of `router.push()` so they don’t start a competing client navigation.
- **Internal redirects:** Other critical redirects (e.g. admin, checkout, profile) use `window.location.href` where appropriate.
- **Links inside Radix (dropdowns, sheets, dialogs):** Use plain `<a href="...">` (not `<Link>` or `router.push()` alone) so Radix doesn’t intercept the click. No `target="_blank"` for same-site routes.
- **Colleges route:** Single dynamic segment `[slug]` under `app/colleges/`; removed `[college]` to avoid Next.js "different slug names" error. Clearing `.next` may be needed if that error reappears after route renames.

---

## 4. Current Behavior (Summary)

| Action | Behavior |
|--------|----------|
| Click same-origin `<a>` | Inline script + BulletproofInternalLinks: capture phase → `window.location.href`, full page load. |
| Submit same-origin **GET** form | Same: capture phase → build URL from FormData → `window.location.href`. |
| Submit same-origin **POST** form (login, signup, etc.) | **Not intercepted.** Form submits normally; server receives POST and body. |
| Store link | Plain `<a href="/store-app">`; one GET, no form, no Next. |
| New-tab / modifier key | `target="_blank"` or Ctrl/Cmd/Shift click: not intercepted. |
| External links | Not intercepted. |

---

## 5. Rules for Future Changes

- **Critical internal links (Store, admin, new pages):** Use plain `<a href="...">` or `HardLink` / `StoreNavLink` so navigation is a full page load with no dependency on client router.
- **Inside Radix (dropdown, sheet, dialog):** Use `<a href="...">` only; never `<Link>` or `router.push()` alone. Example: `<DropdownMenuItem asChild><a href={href}>...</a></DropdownMenuItem>`.
- **Do not use `target="_blank"`** for same-site routes (e.g. `/store-app`, `/blue`); it has caused blank or stuck tabs.
- **Do not add a global form handler** that intercepts POST. Any new global submit listener must **only** handle GET forms (e.g. `if (method !== 'get') return`).
- **New routes:** Create the route first, then add the link using the same pattern as existing working links. If links still fail, use full-page navigation (`<a href="...">` or HardLink).
- **Weird route/slug errors:** Try `rm -rf .next` then restart dev; stale cache can cause "different slug names" or odd nav behavior.

---

## 6. Related Docs

- **Store-specific:** `docs/STORE-NAV-ROOT-CAUSE.md` (iframe, `target="_top"`, form GET history).
- **If Store (canceled) reappears:** `docs/STORE-CANCELED-NEXT-STEPS.md` (debugging initiator, prefetch, layout).
- **Bulletproof links (concept):** `docs/BULLETPROOF-INTERNAL-LINKS.md` (link interception; now form handling is GET-only).
- **.cursorrules:** Link/navigation rules for Radix, HardLink, and same-site no–target="_blank".

---

## 7. Quick Reference: Key Files

| File | Role |
|------|------|
| `app/layout.tsx` | Inline script: same-origin link clicks + **GET-only** form submits → full page load. |
| `components/bulletproof-internal-links.tsx` | React capture-phase listeners: same-origin links + **GET-only** form submits. |
| `components/store-button.tsx` | Plain `<a href="/store-app">`. |
| `components/store-nav-link.tsx` | Plain `<a href="/store-app">` with optional `onNavigate` (e.g. close mobile sheet). |
| `lib/supabase/client.ts` | Browser Supabase client; requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| `middleware.ts` | No auth calls on every request; protected routes only; no Supabase in middleware for public routes. |

---

*Last updated: March 2025, after Store plain-anchor fix and login regression fix (GET-only form interception).*
