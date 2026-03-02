# Why nav/dropdown links fail and the fix (do not re‑invent)

**Root cause:** Radix UI (DropdownMenu, Sheet, Dialog) intercepts click events. When a menu item uses Next.js `<Link>` or is wrapped in `DropdownMenuItem`, the click is handled by Radix and **navigation often never happens**. This has caused major outages and rework.

**Fix (applied in navbar):** Do **not** wrap nav links in `DropdownMenuItem`. Use a **plain `<div>` + `<a href="...">`** so Radix never wraps the link and cannot intercept. Use `onClick` with `e.preventDefault()` and `window.location.href = url` so navigation always runs.

**Pattern (desktop dropdown):**
```tsx
<div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
  <a href={url} className="block w-full" onClick={(e) => { e.preventDefault(); window.location.href = url; }}>Label</a>
</div>
```
**Pattern (mobile):** Same `<a>` with `onClick` that also calls `setIsOpen(false)` then `window.location.href = url`. Same href in both desktop and mobile for the same destination.

**Also:** Never use `target="_blank"` for same-site app routes (e.g. `/profile`, `/blue`). It has caused blank or stuck new tabs.

**Before adding or changing any menu/dropdown link:**

1. Use `<a href="...">` when the link is inside a Radix dropdown or sheet.
2. Copy the pattern from an existing working item in `components/navbar.tsx` (e.g. Athletes, Events, Programs, Store, Cart).
3. Confirm the route exists (e.g. `app/profile/page.tsx` for `/profile`).
4. Add the same href in both desktop and mobile if the item appears in both.

**Authority:** `.cursorrules` in the repo root has the same rule and must be followed. This doc exists so the *reason* (Radix intercepts) and the *fix* (<a href>) are written down in one place.
