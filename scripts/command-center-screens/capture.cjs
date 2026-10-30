/**
 * Screenshots of the real Recruiting Command Center for its sales page, one set per site (Matt,
 * 29 Oct 2026: "ensure our product actually matches"): RecruitWrestlers' in its own theme into
 * public/screens/rw/, NC United's into public/screens/ncu/. Runs against a LOCAL dev server signed in
 * as the admin, with an invented family (the example family is dev-only: lib/recruiting/demo-family.ts,
 * app/dev/screens) and invented coach views. Refuses a screenshot unless the example family is on it
 * and the admin's own family is not. Changes nothing.
 *
 * Re-run it whenever the Command Center's screens change, so the sales pages never show an old product:
 *
 *   node scripts/command-center-screens/capture.cjs <node_modules> [rw|ncu|both] [only,shots]
 */
const path = require("path")
const fs = require("fs")
const NM = process.argv[2] || "node_modules"
const BRANDS = (process.argv[3] || "both") === "both" ? ["rw", "ncu"] : [process.argv[3]]
const ONLY = (process.argv[4] || "").split(",").filter(Boolean)
// A relative folder is read from where the command runs; without one, the usual module lookup.
const need = (m) => { try { return require(path.resolve(NM, m)) } catch { return require(m) } }
const { chromium } = need("playwright-core")
const { createClient } = need("@supabase/supabase-js")
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "") }
const LOCAL = "http://localhost:3013"
const BASE = { rw: "http://www.recruitwrestlers.com:3013", ncu: LOCAL }
const BANNED = ["Gavin", "Hickey", "Cardinal Gibbons"]

const COMPARE = ["appalachian-state-university", "campbell-university", "north-carolina-state-university-nc-state"]
/** clip: the union of these sections' boxes, by heading text. */
const SHOTS = {
  compare: { url: `/recruiting/compare?s=${COMPARE.join(",")}&step=results`, w: 1440, h: 1150, must: "Jordan" },
  "college-analytics": { url: "/recruiting/schools/appalachian-state-university", w: 1440, h: 1150, must: "Jordan", clip: ["room by weight", "Academics", "Campus life grades"] },
  "college-fit": { url: "/recruiting/schools/appalachian-state-university", w: 1440, h: 1150, must: "Jordan", clip: ["A good fit for Jordan", "What families paid"] },
  // app/dev/screens: the real components with the example family.
  roadmap: { url: "/dev/screens?shot=roadmap", w: 1000, h: 900, must: "Jordan", dev: true },
  scout: { url: "/dev/screens?shot=scout", w: 860, h: 900, must: "Jordan", dev: true },
  "scout-email": { url: "/dev/screens?shot=scout-email", w: 1000, h: 900, must: "Jordan", dev: true },
  board: { url: "/dev/screens?shot=board", w: 1440, h: 825, must: "Coach called", dev: true, crop: 825 },
  forms: { url: "/dev/screens?shot=forms", w: 1440, h: 850, must: "Jordan", dev: true, crop: 850 },
  views: { url: "/dev/screens?shot=views", w: 900, h: 600, must: "Campbell", dev: true, element: "#college-views" },
}

;(async () => {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data } = await s.auth.admin.generateLink({ type: "magiclink", email: "thehickeyclan@gmail.com" })
  const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--host-resolver-rules=MAP www.recruitwrestlers.com 127.0.0.1"] })
  const ctx = await b.newContext({ deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  await p.goto(`${LOCAL}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/`, { waitUntil: "load", timeout: 400000 }).catch(() => {})
  for (let i = 0; i < 30; i++) { if ((await p.evaluate(() => fetch("/api/profile").then((r) => r.status)).catch(() => 0)) === 200) break; await p.waitForTimeout(4000) }
  const session = (await ctx.cookies(LOCAL)).map(({ name, value }) => ({ name, value }))
  await ctx.addCookies([...session.map((c) => ({ ...c, url: BASE.rw })), { name: "demo-family", value: "1", url: BASE.rw }, { name: "demo-family", value: "1", url: LOCAL }])

  // Invented coach views for the example wrestler: real programs and their logos, made-up times.
  const now = Date.now(), H = 3600e3, D = 24
  const VIEWS = [["North Carolina State University", [5, 5.2, 9 * D, 30 * D, 44 * D]], ["Campbell University", [26, 12 * D, 12.1 * D, 33 * D]], ["Appalachian State University", [3 * D, 19 * D, 47 * D]], ["University of Mount Olive", [16 * D, 16.1 * D, 52 * D]], ["Davidson College", [23 * D, 38 * D]], ["Belmont Abbey College", [27 * D]]]
  await p.goto(`${LOCAL}/dev/screens?shot=list`, { waitUntil: "load", timeout: 400000 }); await p.waitForTimeout(3000)
  const logos = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll("tr, li, div")].flatMap((row) => { const img = row.querySelector(":scope img"); const name = row.querySelector(":scope a, :scope p, :scope span")?.textContent?.trim(); return img && name ? [[name, img.src]] : [] })))
  const logoFor = (school) => Object.entries(logos).find(([n]) => n.startsWith(school))?.[1] ?? null
  const visits = VIEWS.flatMap(([school, hrs]) => hrs.map((h) => ({ school, at: new Date(now - h * H).toISOString() }))).sort((a, b) => b.at.localeCompare(a.at))
  const schools = VIEWS.map(([school, hrs]) => ({ school, logo: logoFor(school), views: hrs.length, lastViewedAt: new Date(now - Math.min(...hrs) * H).toISOString() }))
  await p.route("**/api/athletes/example/coach-views", (r) => r.fulfill({ json: { locked: false, schools, visits, totalViews: visits.length, distinctCoaches: 7, recentViews: 9 } }))
  await p.route("**/api/athletes/example/profile-views", (r) => r.fulfill({ json: { ok: true, stats: { totalViews: 64, uniqueViewers: 23, since: new Date(now - 90 * 24 * H).toISOString() } } }))

  for (const brand of BRANDS) {
    const dir = `public/screens/${brand}`
    fs.mkdirSync(dir, { recursive: true })
    for (const [shot, cfg] of Object.entries(SHOTS)) {
      if (ONLY.length && !ONLY.includes(shot)) continue
      await p.setViewportSize({ width: cfg.w, height: cfg.h })
      await p.goto(BASE[brand] + cfg.url, { waitUntil: "load", timeout: 400000 }); await p.waitForTimeout(cfg.dev ? 3000 : 10000)
      await p.keyboard.press("Escape").catch(() => {})
      let text = await p.evaluate(() => document.body.innerText)
      // A page still compiling on the dev server: one more look before refusing it.
      if (cfg.must && !text.includes(cfg.must)) { await p.waitForTimeout(8000); text = await p.evaluate(() => document.body.innerText) }
      const bad = BANNED.filter((x) => text.includes(x))
      if (bad.length || (cfg.must && !text.includes(cfg.must))) { console.log(`REFUSED ${brand}/${shot}: ${bad.length ? `real family on page (${bad.join(", ")})` : "example family not on page"}`); continue }
      // The theme must be the brand's own: RecruitWrestlers lime on its address, NC United's gold on its own.
      const host = await p.evaluate(() => document.documentElement.getAttribute("data-host"))
      if ((brand === "rw") !== (host === "national")) { console.log(`REFUSED ${brand}/${shot}: wrong theme (${host})`); continue }
      // The product only: no dev badge or floating assistant, and on the component screens no site header.
      await p.addStyleTag({ content: `nextjs-portal,[data-assistant-launcher]{display:none!important}${cfg.dev ? "header.sticky{display:none!important}" : ""}` })
      await p.waitForTimeout(600)
      const out = `${dir}/${shot}.jpg`
      if (cfg.clip) {
        const box = await p.evaluate((heads) => {
          const boxes = heads.map((h) => [...document.querySelectorAll("h2,h3,p")].find((e) => e.textContent.trim().toLowerCase().startsWith(h.toLowerCase()) || e.textContent.toLowerCase().includes(h.toLowerCase()) && e.textContent.length < 60))
            .filter(Boolean).map((e) => { let c = e; while (c.parentElement && c.getBoundingClientRect().width < 300) c = c.parentElement; for (let i = 0; i < 6 && c.parentElement; i++) { if (/rounded/.test(c.className)) break; c = c.parentElement } const r = c.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, r: r.right, b: r.bottom + scrollY } })
          if (!boxes.length) return null
          return { x: Math.min(...boxes.map((b) => b.x)), y: Math.min(...boxes.map((b) => b.y)), width: Math.max(...boxes.map((b) => b.r)) - Math.min(...boxes.map((b) => b.x)), height: Math.max(...boxes.map((b) => b.b)) - Math.min(...boxes.map((b) => b.y)) }
        }, cfg.clip)
        if (!box) { console.log(`REFUSED ${brand}/${shot}: sections not found`); continue }
        await p.screenshot({ path: out, type: "jpeg", quality: 84, fullPage: true, clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 } })
      } else if (cfg.element) {
        await p.locator(cfg.element).first().screenshot({ path: out, type: "jpeg", quality: 85 })
      } else {
        await p.screenshot({ path: out, type: "jpeg", quality: 82, fullPage: !!cfg.dev && !cfg.crop })
      }
      console.log("saved", out)
    }
  }
  await b.close()
})().catch((e) => { console.error(e.message); process.exit(1) })
