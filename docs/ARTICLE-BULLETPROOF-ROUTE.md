# Bulletproof article route (troubleshooting / always-works)

**Location:** `app/article/[slug]/route.ts`

**URL:** `/article/seven-divisions-98-brackets-784-qualifiers`

## What it is

A **route handler** that returns **plain HTML** for the main NCHSAA article. No React, no layout, no client bundle. One GET, one response — nothing can cancel it. This was the approach used when fixing article loading and profile links (e.g. Gavin Yow).

## When to use it

- **Home carousel:** Part 1 article link is set to this URL in `lib/home-news-highlights.ts` so the main article always loads even when the full app shell has issues.
- **Troubleshooting:** If `/nchsaa/2026/news/seven-divisions-98-brackets-784-qualifiers` hangs or fails, use `/article/seven-divisions-98-brackets-784-qualifiers` to confirm the content can be delivered.

## Flow

1. User clicks Part 1 from home → `/article/seven-divisions-98-brackets-784-qualifiers` → plain HTML, back link to `/nchsaa/2026`.
2. “Continue to Part 2” in that HTML → `/nchsaa/2026/news/article-2` (React page with ProfileLink buttons and by-name fallback for names like Gavin Yow).

## Troubleshooting article profile links (e.g. Gavin Yow)

**Debug page:** `/debug/article-2-profile-links`

Lists every name in Article 2 (Bracket Depth) with:
- **By-name** — tests the fallback URL (`/unified-profile/by-name?name=...&school=...&year=...`). Use this to verify &quot;Gavin Yow&quot; (and others) resolve when the ID map doesn’t have them.
- **View profile (ID)** — direct `/view-profile?id=...` when the server resolved an athlete ID.

Also linked from that page: Article 2, bulletproof Part 1, and the bulletproof flip card test.

## Adding more slugs

To add another article as plain HTML, add a key to `ARTICLE_HTML` in `app/article/[slug]/route.ts` and paste the full HTML string. Keep internal links to `/nchsaa/2026/news/...` for Part 2 and other NCHSAA pages.
