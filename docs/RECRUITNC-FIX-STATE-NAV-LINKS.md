# RecruitNC: Fix 2025 / 2026 State Page Links (once and for all)

**Problem:** STATES menu links to 2025 and 2026 state pages don't work (or don't behave as real links). Deploys keep happening without the actual fix.

**Rule:** Every STATES menu item **must** be a real hyperlink: either Next.js `<Link href="...">` or a plain `<a href="...">`. No buttons with `onClick` + `router.push`, no `href="#"`, no wrappers that block navigation.

---

## Exact URLs (copy these)

| Menu label          | Exact href             |
|---------------------|------------------------|
| Tournament Overview | `/nchsaa`              |
| 2026 Results        | `/nchsaa/2026`         |
| 2025 Results        | `/nchsaa/2025`         |
| Digital Archive     | `/nchsaa/archive`      |

---

## Correct markup (pick one pattern)

### Option A — Next.js Link (preferred)

Every sub-item under STATES must look like this. **Nothing else** (no Button, no div with onClick):

```tsx
<Link
  href="/nchsaa/2026"
  className="..."
  onClick={() => setMobileOpen?.(false)}
>
  <span>2026 Results</span>
</Link>
```

Repeat for each item with the correct `href`:

- Tournament Overview → `href="/nchsaa"`
- 2026 Results → `href="/nchsaa/2026"`
- 2025 Results → `href="/nchsaa/2025"`
- Digital Archive → `href="/nchsaa/archive"`

### Option B — Plain anchor (if Link is broken)

**With Radix `DropdownMenu`:** Use `DropdownMenuItem asChild` and pass a single child `<Link href={sub.href}>`. The Link must be the direct child so it becomes the actual DOM element. If in production the dropdown still doesn't navigate (e.g. Radix intercepts the click), switch those four items to **Option B** (plain `<a href={sub.href}>`).

If Next.js Link is misbehaving, use a normal anchor so the link works no matter what:

```tsx
<a
  href="/nchsaa/2026"
  className="..."
  onClick={(e) => {
    setMobileOpen?.(false);
    // optional: e.preventDefault(); router.push("/nchsaa/2026"); for SPA feel
  }}
>
  2026 Results
</a>
```

Same four `href` values as in the table above.

---

## What to remove / avoid

- **Do not** use `<Button onClick={() => router.push("/nchsaa/2026")}>` as the only way to reach the page. It's not a link (no href), so no right‑click "Open in new tab", no URL on hover, bad for accessibility and SEO.
- **Do not** use `href="#"` or `href=""` for these items.
- **Do not** wrap the link in a div that has `onClick` and doesn't delegate to the child link (that can block navigation).

---

## Checklist before deploy

In RecruitNC, confirm:

1. [ ] STATES → "Tournament Overview" uses `href="/nchsaa"` (Link or `<a>`).
2. [ ] STATES → "2026 Results" uses `href="/nchsaa/2026"`.
3. [ ] STATES → "2025 Results" uses `href="/nchsaa/2025"`.
4. [ ] STATES → "Digital Archive" uses `href="/nchsaa/archive"`.
5. [ ] Same four links exist in the **mobile** menu (Sheet/drawer) with the same hrefs.
6. [ ] In the browser: hover each item and check the status bar shows the correct URL (e.g. `.../nchsaa/2026`).
7. [ ] Right‑click → "Open in new tab" works for each item.
8. [ ] The routes exist: `app/nchsaa/page.tsx`, `app/nchsaa/[year]/page.tsx`, `app/nchsaa/archive/page.tsx` (so `/nchsaa`, `/nchsaa/2025`, `/nchsaa/2026`, `/nchsaa/archive` all resolve).

---

## Where to change it

Search the RecruitNC repo for:

- `nchsaa` or "2026 Results" or "2025 Results" or "STATES"
- The main nav component (e.g. `Navbar`, `Header`, `NavigationMenu`, `wrestling-navbar`)
- The mobile menu component that renders the same STATES items

In **every** place that renders "2025 Results" or "2026 Results", the clickable element must be a `<Link href="...">` or `<a href="...">` with the exact href from the table above.

---

## Reference (Legacy NC)

In this repo, `components/wrestling-navbar.tsx` defines the STATES items with `href` and renders them with `<Link href={subItem.href}>` (desktop and mobile). You can mirror that structure in RecruitNC: same hrefs, same use of Link (or `<a>`) for each item.
