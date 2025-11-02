# Fork and Deploy Checklist

This project is ready to fork. Use this checklist to get running locally and deploy, if desired.

## 1) Fork and clone
- Fork the repo on GitHub
- Clone your fork
- Install deps: `pnpm i` (or `npm i` / `yarn`)

## 2) Run locally
- Start dev server: `pnpm dev` (or `npm run dev`)
- Open http://localhost:3000

## 3) Environment variables (local)
Create `.env.local` and add:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_URL (if you use server functions against Supabase)
- SUPABASE_SERVICE_ROLE_KEY (server-only usage)
- Any existing POSTGRES_ variables your data tasks rely on

Tip: If you import this repo into Vercel, set these in Project Settings → Environment Variables.

## 4) Supabase Auth settings (no DB changes required)
- In the Supabase project, add your local dev URL (http://localhost:3000) and your Vercel domains (Preview + Production) to:
  - Authentication → URL Configuration → Redirect URLs
  - Authentication → Providers → each provider (if using OAuth)
- Test sign-in flow in a Private window to avoid stale cookies.

## 5) Auth middleware notes
- The middleware is configured to:
  - Allow public, admin, API, and debug routes through
  - Require auth for protected routes like `/athletes`
  - Redirect signed-in users away from `/auth/signin`/`/auth/signup` to `/athletes`
- If you need to temporarily open a route for testing, add it to `publicRoutes` in `middleware.ts` and remove it later.

## 6) Verify professional cards on Athletes page
- Navigate to `/athletes`
- You should see the professional cards (ProfessionalCommitmentCard)
- If you see an older/basic card:
  - Hard refresh (Cmd/Ctrl+Shift+R)
  - Confirm `components/athletes-grid.tsx` uses `ProfessionalCommitmentCard`

## 7) Deploy (optional)
- Push your fork to GitHub
- Import into Vercel
- Add the same environment variables in Vercel Project Settings
- Trigger a deploy
- Add the Vercel Preview and Production URLs to Supabase Auth redirect settings

## 8) Troubleshooting quick tips
- Login loop: test in a private window; ensure NEXT_PUBLIC_SUPABASE_* vars match the same Supabase project.
- Stale UI: hard refresh; clear site data; verify the grid import path.
- Protect/unprotect routes quickly by editing `publicRoutes` in `middleware.ts`.
