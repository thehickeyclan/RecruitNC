# Public Admin Mode (Launch Kill Switch)

This flag lets you temporarily relax admin-only restrictions to avoid blockers while you finish auth fixes. Use with caution.

## How to enable

- Vercel Dashboard
  1. Project → Settings → Environment Variables
  2. Add:
     - Name: `IS_PUBLIC_ADMIN_MODE`
     - Value: `1`
     - Environments: `Preview` and/or `Production`
  3. Save and redeploy

- Vercel CLI
\`\`\`bash
vercel env add IS_PUBLIC_ADMIN_MODE production
vercel env add IS_PUBLIC_ADMIN_MODE preview
vercel env add IS_PUBLIC_ADMIN_MODE development
\`\`\`

- Local (real Next.js dev)
Add to `.env.local`:
\`\`\`
IS_PUBLIC_ADMIN_MODE=1
\`\`\`
Restart `next dev`.

## Verify status

Visit:
\`\`\`
/api/debug/public-admin-mode
\`\`\`
You’ll see:
\`\`\`json
{ "publicAdminMode": true }
\`\`\`
when enabled.

## Safety

- Do NOT prefix with `NEXT_PUBLIC_` (server-only).
- Turn off as soon as possible (unset, or set to `0`) after launch.
- This is a temporary kill switch while we finalize auth fixes.
