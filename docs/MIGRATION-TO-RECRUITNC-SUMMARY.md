# LegacyNC → RecruitNC migration summary

**Same Supabase project.** LegacyNC (`legacy-nc`) and RecruitNC share the database; the gap is **two deployables** and **Data Dawg** on Legacy while RecruitNC **proxies** `POST /api/ai/chat` to Legacy via **`LEGACY_NC_API_URL`**.

**RecruitNC repo (canonical local path):** `/Users/matthickey/RecruitNC_MyRecruits/Recruit-NC-main`  
Use this tree for inventory and porting. A copy under `Downloads/Recruit-NC-main` (or other paths) may be stale—prefer the path above.

**Where the proxy lives (source of truth in RecruitNC):** `app/api/ai/chat/route.ts` — forwards to Legacy, ensures `project: "recruit-nc"`, injects `recruitNcContext` (e.g. four-time state champions via `@/lib/four-time-state-champions`), then post-processes the JSON (`stripImpossibleNchsaaYears`, `lbs` cleanup, `/view-profile` URL rewrites).  
On the **LegacyNC** repo, `docs/recruitnc-proxy-endpoint.ts` (if present) is an **example** of the same pattern—not the deployed RecruitNC file.

**Gate:** Finish the **API inventory** (checklist below) with RecruitNC open beside LegacyNC—mark each route **before** copying large surface areas. **Half day–day** for a first pass.

**Blocker for the main payload:** Have **both** trees available locally. You cannot port `app/api/ai/chat` + `handlers/` + `lib/ai-chat.ts` (and the dependency tree) without LegacyNC **and** the RecruitNC repo you will merge into (canonical path above).

**Cursor / automation:** Open **`/Users/matthickey/RecruitNC_MyRecruits/Recruit-NC-main`** as the workspace when applying large patches into RecruitNC; agents need that folder as the project root (or broad permissions) to write under `app/` and `lib/`.

---

## 1. Roles

| Piece | Role |
|--------|------|
| **LegacyNC (legacy-nc repo)** | Full Data Dawg: `POST /api/ai/chat`, handlers, prompts, optional semantic routing, RecruitNC NHSCA enrichment (`lib/recruitnc-wrestling-achievements.ts`), many public + admin APIs. |
| **RecruitNC** | Primary product; hosts most migrated UI; **forwards** chat to Legacy until cutover. |

---

## 2. What “retire LegacyNC” means

1. Port **`POST /api/ai/chat`** and **`app/api/ai/chat/**`** (plus `lib` deps: `ai-chat.ts`, data-dawg helpers, `recruitnc-wrestling-achievements.ts`, etc.) into RecruitNC **same path** so the widget stays `POST /api/ai/chat`.
2. Set **OPENAI_API_KEY** / **ANTHROPIC_API_KEY**, **Supabase service role** (and any Voyage/semantic flags) on RecruitNC.
3. **Keep** RecruitNC-only **response post-processing** in RecruitNC’s `route.ts` (e.g. `stripImpossibleNchsaaYears`, link fixes, profile URL rewrites)—wrap the in-process handler the same way you wrap the proxy today.
4. Point the **Data Dawg widget** at RecruitNC only (it likely already posts to same-origin `/api/ai/chat`).
5. **Staging:** compare answers vs Legacy proxy; then **remove `LEGACY_NC_API_URL`**.
6. **Redirects** from old Legacy domains; **decommission** Legacy Vercel.

---

## 3. Port order (practical)

1. **Inventory** (this doc, §5) — **gate**.
2. **Port chat first** — `app/api/ai/chat/route.ts` + `app/api/ai/chat/**` + dependency `lib/**` files.
3. **Per inventory** — other `app/api/**` routes marked **must port** (only if RecruitNC still calls Legacy or users hit those URLs on Legacy).
4. Redirects + decommission.

---

## 4. Env (RecruitNC deployment)

- `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` (`lib/ai-chat.ts` on Legacy; same after port)
- Supabase: URL, anon, **service** role for server routes
- Optional: `VOYAGE_API_KEY`, `ENABLE_SEMANTIC_ROUTING`, `AI_CHAT_TOOLS_PILOT`, `RECRUITNC_APP_URL` (profile/API links)
- Remove: `LEGACY_NC_API_URL` after cutover

---

## 5. API inventory — LegacyNC `app/api/**/route.ts`

**How to use:** With RecruitNC repo open, search for the same path (e.g. `app/api/ai/chat`) or consumer references. Set **Disposition** to one of:

| Code | Meaning |
|------|--------|
| **RN** | Already exists in RecruitNC (same behavior) — no port |
| **Skip** | Not needed for cutover (UI gone, replaced, or unused) |
| **Port** | Must exist on RecruitNC before Legacy off |
| **TBD** | Not verified yet — **default until reviewed** |
| **Ops** | Admin/diagnostics—decide if RecruitNC admin replaces or Legacy stays temporarily |

### §5a RecruitNC same-path scan (this repo)

Check: does `app/api/<path>` exist **in RecruitNC** with the **same route path** as Legacy? This is **not** proof of behavioral parity—only that the URL may already exist. Rows marked **Partial** need human review.

Where §5a says **Yes**, the big table below may still show **TBD** or **Ops**—reconcile after a quick read of both `route.ts` files; use **RN** only when behavior matches (otherwise keep **Port** or **Ops**).

| §5 # | RecruitNC | Note |
|------|-----------|------|
| 1 | **Partial** | `app/api/ai/chat/route.ts` exists as **Legacy proxy** — full Data Dawg still **Port** |
| 2 | No | No `ai/chat/init-semantic-routing` |
| 3 | No | No `ai/chat-rag` |
| 4 | No | No public `calendar/events`; RN has `app/api/admin/calendar/events` (different path) |
| 5 | **Yes** | `app/api/calendar/feed/route.ts` |
| 6–8 | No | No `data-accuracy-reports` API |
| 9–11 | No | No `embeddings/*` routes |
| 12 | No | No `export/[table]` |
| 13–16 | No | No `learning/*` routes |
| 17 | **Yes** | `app/api/national-team/interest-form/route.ts` |
| 18 | No | No `nchsaa/wrestling-calendar` (RN has other `nchsaa/*` e.g. articles) |
| 19–23 | **Yes** | `nc-united/tournaments`, `.../[id]/duals`, `.../gallery`, `.../results`, `nc-united/wrestlers` |
| 24–28 | No | No Legacy-style `nhsca/schools|wrestlers|years|...` routes |
| 29 | **Yes** | `app/api/store/featured-products/route.ts` |
| 30 | No | No `super32/champions` |
| 31–32 | No | No `tournament-survey`, no `unc/wrestling-schedule` |
| 33–35 | No | No matching upload routes at those paths |
| 36 | No | No `usaw/fargo-junior-nationals` |
| 37 | **Yes** | `app/api/user/profile/route.ts` |
| 38 | No | No `admin/ai-analytics` |
| 39 | No | No `admin/migrate-super32-2024-2025` |
| 40 | **Yes** | `app/api/admin/national-team-submissions/route.ts` |
| 41–43 | No | No matching paths for those admin routes |
| 44–49 | No | No `diagnostics/*` tree |

**Route list (LegacyNC = legacy-nc repo, 49 handlers):**

| # | Legacy path | Disposition | Notes |
|---|-------------|-------------|--------|
| 1 | `app/api/ai/chat/route.ts` | **Port** | **P0.** Full Data Dawg; depends on `handlers/`, `system-prompts.ts`, etc. |
| 2 | `app/api/ai/chat/init-semantic-routing/route.ts` | **Port** | Ship with chat if semantic routing enabled. |
| 3 | `app/api/ai/chat-rag/route.ts` | **TBD** | Separate RAG path; port if widget or RN uses it. |
| 4 | `app/api/calendar/events/route.ts` | **TBD** | Calendar consumers. |
| 5 | `app/api/calendar/feed/route.ts` | **TBD** | |
| 6 | `app/api/data-accuracy-reports/route.ts` | **TBD** | |
| 7 | `app/api/data-accuracy-reports/[id]/route.ts` | **TBD** | |
| 8 | `app/api/data-accuracy-reports/stats/route.ts` | **TBD** | |
| 9 | `app/api/embeddings/batch-generate/route.ts` | **TBD** | Admin/ops embeddings pipeline. |
| 10 | `app/api/embeddings/generate/route.ts` | **TBD** | |
| 11 | `app/api/embeddings/search/route.ts` | **TBD** | |
| 12 | `app/api/export/[table]/route.ts` | **Ops** | Dangerous export—usually admin-only. |
| 13 | `app/api/learning/analyze/route.ts` | **TBD** | Learning system. |
| 14 | `app/api/learning/cron/route.ts` | **TBD** | Cron—wire on RN or keep Legacy cron URL until moved. |
| 15 | `app/api/learning/insights/route.ts` | **TBD** | |
| 16 | `app/api/learning/suggestions/route.ts` | **TBD** | |
| 17 | `app/api/national-team/interest-form/route.ts` | **TBD** | Docs: National Team UI moved to RN—**verify** duplicate API. |
| 18 | `app/api/nchsaa/wrestling-calendar/route.ts` | **TBD** | |
| 19 | `app/api/nc-united/tournaments/route.ts` | **TBD** | National Team / tournament hub. |
| 20 | `app/api/nc-united/tournaments/[id]/duals/route.ts` | **TBD** | |
| 21 | `app/api/nc-united/tournaments/[id]/gallery/route.ts` | **TBD** | |
| 22 | `app/api/nc-united/tournaments/[id]/results/route.ts` | **TBD** | |
| 23 | `app/api/nc-united/wrestlers/route.ts` | **TBD** | |
| 24 | `app/api/nhsca/high-school-nationals/route.ts` | **TBD** | |
| 25 | `app/api/nhsca/schools/summary/route.ts` | **TBD** | |
| 26 | `app/api/nhsca/wrestlers/route.ts` | **TBD** | |
| 27 | `app/api/nhsca/years/summary/route.ts` | **TBD** | |
| 28 | `app/api/nhsca/years/[year]/all-americans/route.ts` | **TBD** | |
| 29 | `app/api/store/featured-products/route.ts` | **TBD** | Store integration. |
| 30 | `app/api/super32/champions/route.ts` | **TBD** | Referenced from `/super32` page (see `docs/LEGACY-NC-FULL-MENU-MIGRATION.md`). |
| 31 | `app/api/tournament-survey/route.ts` | **TBD** | |
| 32 | `app/api/unc/wrestling-schedule/route.ts` | **TBD** | |
| 33 | `app/api/upload-career-wrestlers/route.ts` | **Ops** | Upload utilities. |
| 34 | `app/api/upload-most-outstanding-wrestlers/route.ts` | **Ops** | |
| 35 | `app/api/uploads/nchsaa/route.ts` | **Ops** | |
| 36 | `app/api/usaw/fargo-junior-nationals/route.ts` | **TBD** | |
| 37 | `app/api/user/profile/route.ts` | **TBD** | Auth profile—likely RN already. |
| 38 | `app/api/admin/ai-analytics/route.ts` | **Ops** | |
| 39 | `app/api/admin/migrate-super32-2024-2025/route.ts` | **Ops** | One-off migration. |
| 40 | `app/api/admin/national-team-submissions/route.ts` | **Ops** | |
| 41 | `app/api/admin/nchsaa-school-data-quality/route.ts` | **Ops** | |
| 42 | `app/api/admin/super32-school-updates/route.ts` | **Ops** | |
| 43 | `app/api/admin/tournament-survey/route.ts` | **Ops** | |
| 44 | `app/api/diagnostics/counts/route.ts` | **Ops** | Dev/staging sanity. |
| 45 | `app/api/diagnostics/nchsaa-matrix/route.ts` | **Ops** | |
| 46 | `app/api/diagnostics/nchsaa-sanity/route.ts` | **Ops** | |
| 47 | `app/api/diagnostics/openai/route.ts` | **Ops** | |
| 48 | `app/api/diagnostics/proof/route.ts` | **Ops** | |
| 49 | `app/api/diagnostics/voyage/route.ts` | **Ops** | |

**Subfolders under `app/api/ai/chat/` (not separate route files in the 49 count):** `handlers/*.ts`, `tools/`, `semantic-router.ts`, `handler-registry.ts`, `system-prompts.ts`, `format-results.ts`, `ai-agent.ts` — all **Port** with `route.ts`.

---

## 6. Dependency tree hint (chat port — non-exhaustive)

When porting **chat**, trace imports from `app/api/ai/chat/route.ts` and `handlers/` into:

- `lib/ai-chat.ts`
- `lib/recruitnc-wrestling-achievements.ts`
- `lib/data-dawg-suggested-prompts.ts`, `lib/data-dawg-render-links.ts`
- `lib/server-supabase.ts`, `lib/supabase/server.ts`, `lib/calendar-supabase.ts`, `lib/super32-supabase.ts` (as dynamically imported)
- `lib/athlete-profile-links.ts` (RecruitNC URLs)

Adjust import paths to RecruitNC’s `@/` layout.

---

## 7. Related docs

**In RecruitNC (`Recruit-NC-main`):**

- `docs/LEGACY-NC-FULL-MENU-MIGRATION.md` — menu / pages
- `docs/NATIONAL-TEAM-MOVE-FROM-LEGACY.md` — National Team (also see Legacy `docs/NATIONAL-TEAM-MOVE-TO-RECRUITNC.md` if that name exists there)
- `scripts/data-dawg-integration-guide.md` — proxy / widget notes
- `components/ai-chat-widget-recruitnc.tsx` — Data Dawg widget (posts to `/api/ai/chat`)

**In LegacyNC only (examples / parallel docs):** `docs/recruitnc-proxy-endpoint.ts` — compare to RecruitNC `app/api/ai/chat/route.ts`. `docs/recruitnc-data-dawg-image-update.md` — image/link behavior (if present).

---

## 8. Immediate action checklist

- [ ] Open **LegacyNC** and **RecruitNC** side by side locally — RecruitNC at `/Users/matthickey/RecruitNC_MyRecruits/Recruit-NC-main`.
- [ ] Fill **Disposition** in §5 (replace **TBD** with RN / Skip / Port / Ops). Use **§5a** for same-path hints; confirm behavior by hand.
- [ ] **Port** `app/api/ai/chat` + dependency `lib` files; wire env on RecruitNC staging.
- [ ] Keep RecruitNC post-processing on the chat response.
- [ ] Widget → RecruitNC `/api/ai/chat` only; validate staging.
- [ ] Remove `LEGACY_NC_API_URL`; domain redirects; decommission Legacy Vercel.

---

*Last updated: canonical path `/Users/matthickey/RecruitNC_MyRecruits/Recruit-NC-main`, proxy notes, LegacyNC inventory + §5a RecruitNC path scan (2026-04). Disposition column still needs manual review where marked TBD.*
