/**
 * Screenshots of the coach product for /for-coaches (app/dev/coach-screens). Run against a local
 * dev server: node scripts/coach-screens.cjs <node_modules> [base]. Signs in as the admin (/dev is
 * staff-only) with a magic link from .env.local. Writes public/screens/coach-*.jpg.
 */
const fs = require("fs")
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "") }
const { chromium } = require(require("path").join(process.argv[2] || "node_modules", "playwright-core"))
const BASE = process.argv[3] || "http://www.recruitwrestlers.com:3013"
const SHOTS = { board: [1440, 1050], compare: [1300, 900], report: [1200, 870], athletes: [1300, 820], commitments: [1300, 760], messages: [1300, 720], alerts: [1300, 780] }
;(async () => {
  const { createClient } = require(require("path").join(process.argv[2] || "node_modules", "@supabase/supabase-js"))
  const { data } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY).auth.admin.generateLink({ type: "magiclink", email: "thehickeyclan@gmail.com" })
  const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--host-resolver-rules=MAP www.recruitwrestlers.com 127.0.0.1"] })
  const ctx = await b.newContext({ deviceScaleFactor: 2 })
  const login = await ctx.newPage()
  await login.goto(`${BASE}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/`, { waitUntil: "load", timeout: 400000 }).catch(() => {})
  for (let i = 0; i < 30; i++) { if ((await login.evaluate(() => fetch("/api/profile").then((r) => r.status)).catch(() => 0)) === 200) break; await login.waitForTimeout(4000) }
  for (const [shot, [w, h]] of Object.entries(SHOTS)) {
    const p = await ctx.newPage()
    await p.setViewportSize({ width: w, height: h })
    await p.goto(`${BASE}/dev/coach-screens?shot=${shot}`, { waitUntil: "load", timeout: 400000 })
    await p.evaluate(() => document.documentElement.setAttribute("data-host", "national"))
    await p.waitForTimeout(shot === "board" ? 6000 : 2500)
    await p.screenshot({ path: `public/screens/coach-${shot}.jpg`, type: "jpeg", quality: 82, clip: { x: 0, y: 0, width: w, height: h } })
    console.log("saved", shot)
    await p.close()
  }
  await b.close()
})()
