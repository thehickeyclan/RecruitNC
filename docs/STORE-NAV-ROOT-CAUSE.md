# Store link – root cause and prevention

## Root cause (confirmed)

**The app is embedded in an iframe on ncwrestlingunited.com.** Sign In and Sign Up already use `target="_top"` for this reason (see `app/auth/signin/page.tsx`, auth-guard, iframe-signin-banner).

- **Same-tab link to /store-app from inside the iframe:** The iframe would navigate to the store, but the parent page stays the same. Users often don’t see it or it’s canceled by layout/React.
- **target="_blank" (what we tried):** From inside an iframe, the browser opens a new tab but for security/sandbox reasons the new tab can end up as **about:blank** (green screen). So Store “opened a new tab” but the tab was empty.
- **Fix:** Use **target="_top"** for the Store link (navbar, StoreButton, StoreNavLink). That loads the store in the **top-level browsing context** (the full window), breaking out of the iframe. When not embedded, `_top` is just the same tab. Same pattern as Sign In.

## What is implemented

1. **GET /store** → 302 to /store-app (route only; no React at /store).
2. **Store UI** at /store-app (page + product/[id]).
3. **All Store entry points** use `<a href="/store-app" target="_top" rel="noopener">`:
   - Navbar (desktop and mobile)
   - StoreButton
   - StoreNavLink
4. **Do not use target="_blank"** for Store when the app can be embedded. It causes about:blank in the new tab.

## Prevention

- **Any new link that must work when the app is embedded** (e.g. in ncwrestlingunited.com iframe): use **target="_top"** so the link loads in the top window. Examples: Sign In, Sign Up, Store.
- **Do not use target="_blank"** for critical same-origin links if the app is ever embedded; use `_top` or a plain same-tab link.
- Cart uses a plain `<a href="/cart">` (no target); in an iframe that loads cart inside the iframe. If you want cart to break out too, add `target="_top"` to the Cart link.
