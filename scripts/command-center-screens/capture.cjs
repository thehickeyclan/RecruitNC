/**
 * Screenshots of the real Recruiting Command Center for its sales page, with an invented family
 * (Matt, 29 Oct 2026). Runs against a LOCAL dev server (the example family is dev-only:
 * lib/recruiting/demo-family.ts), signed in as the admin, on the recruitwrestlers.com address so
 * the pages wear RecruitWrestlers. Refuses a screenshot unless the example family is on it and
 * the admin's own family is not. Changes nothing.
 *
 *   node scripts/command-center-screens/capture.cjs <node_modules> [only,shots]
 */
const path = require("path")
const fs = require("fs")
const NM = process.argv[2] || "node_modules"
const ONLY = (process.argv[3] || "").split(",").filter(Boolean)
const { chromium } = require(path.join(NM, "playwright-core"))
const { createClient } = require(path.join(NM, "@supabase/supabase-js"))
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "") }
const LOCAL = "http://localhost:3013"
const RW = "http://www.recruitwrestlers.com:3013"
const BANNED = ["Gavin", "Hickey", "Cardinal Gibbons"]

const COMPARE = ["appalachian-state-university", "campbell-university", "north-carolina-state-university-nc-state"]
const SHOTS = {
  compare: { url: `/recruiting/compare?s=${COMPARE.join(",")}&step=results`, w: 1440, h: 1150, must: "Jordan" },
  college: { url: "/recruiting/schools/appalachian-state-university", w: 1440, h: 1150, must: "Jordan", full: true },
  // The rest are app/dev/screens: the real components with the example family.
  board: { url: "/dev/screens?shot=board", w: 1440, h: 900, must: "Coach called", dev: true },
  forms: { url: "/dev/screens?shot=forms", w: 1440, h: 900, must: "Jordan", dev: true },
  views: { url: "/dev/screens?shot=views", w: 900, h: 700, must: "Campbell", dev: true },
  "scout-email": { url: "/dev/screens?shot=scout-email", w: 1000, h: 900, must: "Jordan", dev: true },
}

;(async () => {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data } = await s.auth.admin.generateLink({ type: "magiclink", email: "thehickeyclan@gmail.com" })
  const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--host-resolver-rules=MAP www.recruitwrestlers.com 127.0.0.1"] })
  const ctx = await b.newContext({ deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  await p.goto(`${LOCAL}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/`, { waitUntil: "load", timeout: 400000 }).catch(() => {})
  for (let i = 0; i < 30; i++) { if ((await p.evaluate(() => fetch("/api/profile").then((r) => r.status)).catch(() => 0)) === 200) break; await p.waitForTimeout(4000) }
  // The session lands on localhost; the same cookies on the recruitwrestlers.com address, plus the example family.
  const local = await ctx.cookies(LOCAL)
  await ctx.addCookies([...local.map(({ name, value }) => ({ name, value, url: RW })), { name: "demo-family", value: "1", url: RW }])
  // Invented coach views for the example wrestler: real programs, made-up times.
  const now = Date.now(), H = 3600e3
  const D = 24
  const VIEWS = [["North Carolina State University", [5, 5.2, 9 * D, 30 * D, 44 * D]], ["Campbell University", [26, 12 * D, 12.1 * D, 33 * D]], ["Appalachian State University", [3 * D, 19 * D, 47 * D]], ["University of Mount Olive", [16 * D, 16.1 * D, 52 * D]], ["Davidson College", [23 * D, 38 * D]], ["Belmont Abbey College", [27 * D]]]
  // Their real logos, as the college list screen shows them.
  await p.goto(`${LOCAL}/dev/screens?shot=list`, { waitUntil: "load", timeout: 400000 }); await p.waitForTimeout(3000)
  const logos = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll("tr, li, div")].flatMap((row) => { const img = row.querySelector(":scope img"); const name = row.querySelector(":scope a, :scope p, :scope span")?.textContent?.trim(); return img && name ? [[name, img.src]] : [] })))
  const logoFor = (school) => Object.entries(logos).find(([n]) => n.startsWith(school.replace(/ \(.*\)/, "")))?.[1] ?? null
  const visits = VIEWS.flatMap(([school, hrs]) => hrs.map((h) => ({ school, at: new Date(now - h * H).toISOString() }))).sort((a, b) => b.at.localeCompare(a.at))
  const schools = VIEWS.map(([school, hrs]) => ({ school, logo: logoFor(school), views: hrs.length, lastViewedAt: new Date(now - Math.min(...hrs) * H).toISOString() }))
  await p.route("**/api/athletes/example/coach-views", (r) => r.fulfill({ json: { locked: false, schools, visits, totalViews: visits.length, distinctCoaches: 7, recentViews: 9 } }))
  await p.route("**/api/athletes/example/profile-views", (r) => r.fulfill({ json: { ok: true, stats: { totalViews: 64, uniqueViewers: 23, since: new Date(now - 90 * 24 * H).toISOString() } } }))
  for (const [shot, cfg] of Object.entries(SHOTS)) {
    if (ONLY.length && !ONLY.includes(shot)) continue
    await p.setViewportSize({ width: cfg.w, height: cfg.h })
    await p.goto(RW + cfg.url, { waitUntil: "load", timeout: 400000 }); await p.waitForTimeout(cfg.dev ? 3000 : 10000)
    await p.keyboard.press("Escape").catch(() => {})
    const text = await p.evaluate(() => document.body.innerText)
    const bad = BANNED.filter((x) => text.includes(x))
    if (bad.length || (cfg.must && !text.includes(cfg.must))) { console.log(`REFUSED ${shot}: ${bad.length ? `real family on page (${bad.join(", ")})` : `example family not on page`}`); await p.screenshot({ path: `/tmp/cc-refused-${shot}.png` }); continue }
    if (cfg.scrollTo) await p.evaluate((sel) => { const e = [...document.querySelectorAll("h1,h2,h3")].find((x) => x.textContent.includes(sel)); e && window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 20) }, cfg.scrollTo)
    await p.addStyleTag({ content: "nextjs-portal{display:none!important}" })
    await p.waitForTimeout(600)
    await p.screenshot({ path: cfg.full ? `/tmp/cc-full-${shot}.png` : `public/screens/cc-${shot}.jpg`, type: cfg.full ? "png" : "jpeg", quality: cfg.full ? undefined : 82, fullPage: !!cfg.full || !!cfg.dev })
    console.log("saved", shot)
  }
  await b.close()
})().catch((e) => { console.error(e.message); process.exit(1) })
