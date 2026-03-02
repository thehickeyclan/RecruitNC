# Why nav/dropdown links fail and the fix (do not re‑invent)

**Root cause:** Radix UI (DropdownMenu, Sheet, Dialog) intercepts click events. When a menu item uses Next.js `<Link>` or `router.push()`, the click is handled by Radix and **navigation often never happens** — dropdown may close and the user stays on the same page. This has caused major outages and rework.

**Fix:** For **any** link that lives inside Radix (navbar dropdowns, mobile sheet menu, dialogs), use a **plain `<a href="...">`**. Do not use `<Link>` or `router.push()` as the only way to navigate.

**Pattern:**

- Desktop dropdown:  
  `<DropdownMenuItem asChild><a href={url} className="cursor-pointer">Label</a></DropdownMenuItem>`
- Mobile sheet:  
  `<a href={url} onClick={() => setIsOpen(false)}>Label</a>`
- Same href in both desktop and mobile for the same destination.

**Also:** Never use `target="_blank"` for same-site app routes (e.g. `/profile`, `/blue`). It has caused blank or stuck new tabs.

**Before adding or changing any menu/dropdown link:**

1. Use `<a href="...">` when the link is inside a Radix dropdown or sheet.
2. Copy the pattern from an existing working item in `components/navbar.tsx` (e.g. Athletes, Events, Programs, Store, Cart).
3. Confirm the route exists (e.g. `app/profile/page.tsx` for `/profile`).
4. Add the same href in both desktop and mobile if the item appears in both.

**Authority:** `.cursorrules` in the repo root has the same rule and must be followed. This doc exists so the *reason* (Radix intercepts) and the *fix* (<a href>) are written down in one place.
