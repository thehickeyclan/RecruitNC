# NCHSAA article profile links: use &lt;button&gt;, never &lt;a&gt;

**Do not use `<a>` or Next.js `<Link>` for athlete profile links in NCHSAA (or any) article content.**

## Why

`<a href="...">` and `<Link>` get intercepted by the Next.js router and/or overlays (e.g. Data Dawg). Clicks then do nothing or fail silently. This has caused many repeated deploys and broken UX every time someone “fixes” it by changing the URL or adding `onClick` on the anchor—**the anchor itself is the problem**.

## Rule

- **Profile links (wrestler name → profile):** Use a **`<button type="button">`** styled to look like a link. In the click handler, do **only** `window.location.href = profileUrl`. No `href`, no `<a>`, no `Link`.
- **Other in-article links** (e.g. rankings, other articles): Either use the same button pattern, or keep `<a>` and use an article-level `onClick` that does `e.preventDefault(); window.location.href = href` for any `<a href="/...">` (see `understanding-bracket-depth-2026.tsx`).

## Reference

- **Implementation:** `app/nchsaa/[year]/news/content/understanding-bracket-depth-2026.tsx` — `ProfileLink` renders `<button type="button">` when there is a profile URL, and `<span>` when there is no resolved athlete id.
- **Same pattern elsewhere:** `components/bulletproof-flip-card.tsx` — “View Profile (Button)” with `window.location.href` works; “View Profile (Link)” does not.
- **Back-to link:** `app/nchsaa/[year]/news/back-to-year-link.tsx` — plain `<a>` with `onClick` + `window.location.href`; that works for a single nav link but is fragile; for many links in content, prefer button.

## Adding new article content with profile links

1. Resolve (name, school, year) → athlete id server-side (e.g. `getArticle2ProfileIdMap`).
2. For each wrestler name that should link to a profile, use the same `ProfileLink` pattern: **button when you have an id, span when you don’t.**
3. Do **not** introduce new `<a href="/view-profile?id=...">` or `<Link href="...">` for those names.
