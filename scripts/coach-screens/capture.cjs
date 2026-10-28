/**
 * Screenshots of the real coach portal for /for-coaches, with invented wrestlers (Matt, 28 Oct
 * 2026: "do the product images actually match our product?"). Runs against the live site as the
 * internal test coach and changes nothing: each page's data calls are answered from the fixtures
 * beside this file (anonymised - no real wrestler's name, school or contact), the few labels drawn
 * on the server are renamed in the page, and a screenshot is refused if a real name is still on it.
 *
 *   node scripts/coach-screens/capture.cjs <node_modules>      → public/screens/coach-*.jpg
 */
const path = require("path")
const fs = require("fs")
const NM = process.argv[2] || "node_modules"
const { chromium } = require(path.join(NM, "playwright-core"))
const { createClient } = require(path.join(NM, "@supabase/supabase-js"))
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "") }
const BASE = "https://www.recruitwrestlers.com"
const FX = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, `fixtures-${n}.json`), "utf8"))
const board = FX("board"), report = FX("report"), compare = FX("compare")

const now = "2026-10-28T15:00:00Z"
const threads = { threads: [
  { id: "demo-t1", athleteId: "demo-1", athleteName: "Cole Whitaker", coachName: "Coach Reyes", program: "Example University", programLogo: null, lastMessageAt: "2026-10-26T21:10:00Z", lastMessagePreview: "The 15th is best if you can do a Saturday. He'll bring his transcript.", lastSenderRole: "parent", unread: true, stopped: false, viewerRole: "coach", yourTurn: true, classYear: 2027, weight: "157", school: "Ridgeview", state: "NC", stage: "Recruiting" },
  { id: "demo-t2", athleteId: "demo-2", athleteName: "Mason Delgado", coachName: "Coach Reyes", program: "Example University", programLogo: null, lastMessageAt: "2026-10-25T16:00:00Z", lastMessagePreview: "Great win at Super 32. Can we talk Tuesday?", lastSenderRole: "coach", unread: false, stopped: false, viewerRole: "coach", yourTurn: false, classYear: 2027, weight: "144", school: "Harbor Point", state: "SC", stage: "Contacted" },
  { id: "demo-t3", athleteId: "demo-6", athleteName: "Ava Sinclair", coachName: "Coach Reyes", program: "Example University", programLogo: null, lastMessageAt: "2026-10-24T13:00:00Z", lastMessagePreview: "She's taking the SAT on Nov 8.", lastSenderRole: "parent", unread: true, stopped: false, viewerRole: "coach", yourTurn: true, classYear: 2027, weight: "130", school: "Northbrook", state: "NC", stage: "Recruiting" },
  { id: "demo-t4", athleteId: "demo-3", athleteName: "Tyler Brannon", coachName: "Coach Reyes", program: "Example University", programLogo: null, lastMessageAt: "2026-10-20T13:00:00Z", lastMessagePreview: "Sending the camp dates now.", lastSenderRole: "coach", unread: false, stopped: false, viewerRole: "coach", yourTurn: false, classYear: 2027, weight: "175", school: "Cedar Fork", state: "NC", stage: "Visited" },
] }
const msg = (id, body, senderRole, senderName, createdAt, mine) => ({ id, body, senderRole, senderName, createdAt, mine, editedAt: null, unsent: false, replyTo: null, reactions: [], attachment: null, seen: true })
const thread = { thread: { id: "demo-t1", athleteId: "demo-1", athleteName: "Cole Whitaker", coachName: "Coach Reyes", program: "Example University", programLogo: null, stopped: false, familyJoined: true, viewerRole: "coach", canReply: true, wrestler: { classYear: 2027, weight: "157", school: "Ridgeview", state: "NC", stage: "Recruiting" }, messages: [
  msg("m1", "Cole, great quarterfinal win at Super 32. We'd like to get you on campus this fall. What weekends work for your family?", "coach", "Coach Reyes", "2026-10-25T14:00:00Z", true),
  msg("m2", "Thanks Coach! We'd love to set up a visit. November 8th or 15th both work for us.", "athlete", "Cole Whitaker", "2026-10-26T01:00:00Z", false),
  msg("m3", "The 15th is best if you can do a Saturday. He'll bring his transcript.", "parent", "Dana Whitaker", "2026-10-26T21:10:00Z", false),
], college: null, firstMessageAt: "2026-10-25T14:00:00Z", extras: true, compliance: { status: "open" } } }
const notifications = { notifications: [], unread_count: 0 }
const navNew = { reports: [{ slug: "super32-2026-mens", date: "2026-10-25" }], rankingsPublishedAt: "2026-10-24T18:00:00Z", newsDate: "2026-10-26", events: [
  { id: "report:super32-2026-mens", kind: "report", title: "Your Super 32 2026 men's report is ready", link: "#", at: "2026-10-25", slug: "super32-2026-mens" },
  { id: "rankings:SC:2027", kind: "rankings", title: "South Carolina Class of 2027 men's rankings published", link: "#", at: "2026-10-24T18:00:00Z" },
  { id: "rankings:NC:2028", kind: "rankings", title: "North Carolina Class of 2028 men's rankings published", link: "#", at: "2026-10-22T18:00:00Z" },
  { id: "news:x", kind: "news", title: "Super 32 2026: South Carolina Boys Recap", link: "#", at: "2026-10-26" },
] }

/** What the server draws and nothing intercepts: renamed in the page before the picture. */
const RENAME = [["RecruitNC", "RecruitWrestlers"], ["Test Account", "Coach Reyes"], ["NC Wrestling United", "Example University"], ["Gavin Hickey", "Jordan Pierce"], ["QA Testwrestler", "Cole Whitaker"], ["QA test reply from the family. Thanks coach!", "Thanks Coach! The 15th works for a visit."], ["Cardinal Gibbons", "Lakewood"]]
const FIRST = ["Cole","Mason","Tyler","Evan","Jordan","Brody","Nate","Isaiah","Luke","Carter","Owen","Gavin","Ryan","Drew","Sam","Kyle","Eli","Wyatt","Caleb","Logan"]
const LAST = ["Whitaker","Delgado","Brannon","Holloway","Pierce","Kessler","Caldwell","Grant","Ashford","Lyons","Marsh","Ruiz","Patton","Ortega","Bennett","Hale","Mercer","Dunn","Sutter","Vance"]
const SCHOOLS = ["Ridgeview","Harbor Point","Cedar Fork","Pine Hollow","Lakewood","Northbrook","Summit Ridge","Riverside","Westfield","Oak Valley","Bay Creek","Hillcrest","Stone Creek","Maple Grove","Eastbrook","Granite Falls","Willow Bend","Fox Run","Red Oak","Silver Lake"]

async function rename(p, pairs) {
  await p.evaluate((pairs) => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = w.nextNode(); n; n = w.nextNode()) for (const [a, b] of pairs) if (n.nodeValue.includes(a)) n.nodeValue = n.nodeValue.split(a).join(b)
    for (const el of document.querySelectorAll("input[placeholder]")) el.value = ""
  }, pairs)
}
/** Table rows drawn on the server (Athletes, Commitments): each wrestler and high school replaced, photos hidden. Returns the real wrestler names it removed. */
async function anonymiseRows(p, { nameSel, schoolSel }) {
  return p.evaluate(({ nameSel, schoolSel, FIRST, LAST, SCHOOLS }) => {
    const removed = []
    const names = [...document.querySelectorAll(nameSel)]
    names.forEach((el, i) => { removed.push(el.textContent.trim()); el.textContent = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}` })
    // High schools are replaced too, but not banned afterwards: the same names are tournament venues ("Duals @ Union Pines").
    ;[...document.querySelectorAll(schoolSel)].forEach((el, i) => { el.textContent = SCHOOLS[i % SCHOOLS.length] })
    for (const img of document.querySelectorAll("table img, [data-athlete-photo] img")) if (!/college|logo/i.test(img.src + img.alt)) img.style.visibility = "hidden"
    return removed.filter(Boolean)
  }, { nameSel, schoolSel, FIRST, LAST, SCHOOLS })
}
async function assertClean(p, banned, shot) {
  const text = await p.evaluate(() => document.body.innerText)
  const left = banned.filter((n) => n && n.length > 3 && text.includes(n))
  if (left.length) throw new Error(`${shot}: real names still on the page: ${left.slice(0, 5).join(", ")}`)
}

;(async () => {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const pick = async (name) => (await s.from("athletes").select("id").eq("name", name).limit(1).single()).data.id
  const reportId = await pick("Keyshon Morrison"), rightId = await pick("Zack Knott")
  const { data } = await s.auth.admin.generateLink({ type: "magiclink", email: "testcoach.thehickeyclan@gmail.com" })
  const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })
  const json = (body) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
  await ctx.route("**/api/coaches/my-recruits*", (r) => r.fulfill(json(board)))
  await ctx.route("**/api/coach-messages", (r) => r.fulfill(json(threads)))
  await ctx.route("**/api/coach-messages/unread", (r) => r.fulfill(json({ unread: 2, show: true })))
  await ctx.route("**/api/coach-messages/demo-*", (r) => r.fulfill(json(thread)))
  await ctx.route("**/api/notifications", (r) => r.fulfill(json(notifications)))
  await ctx.route("**/api/nav/new", (r) => r.fulfill(json(navNew)))
  await ctx.route("**/api/college-interest/new", (r) => r.fulfill(json({ count: 3 })))
  await ctx.route("**/api/athletes/*/scouting-report*", (r) => r.fulfill(json({ report })))
  await ctx.route("**/api/compare?*", (r) => r.fulfill(json(compare)))
  await ctx.route("**/api/track-page-view", (r) => r.fulfill(json({ ok: true })))
  const p = await ctx.newPage()
  await p.goto(`${BASE}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/my-recruits`, { waitUntil: "domcontentloaded" }).catch(() => {})
  await p.waitForTimeout(5000)
  await p.evaluate(() => { try { localStorage.setItem("nav-new:seen", JSON.stringify({ since: "2026-10-01T00:00:00Z", reports: [], rankings: null, news: null })); localStorage.removeItem("nav-new:read") } catch {} })
  const ALWAYS = ["Test Account", "Gavin Hickey", "QA Testwrestler", "Keyshon Morrison", "Zack Knott", "Knott", "Morrison"]
  const SUBJECT_SCHOOLS = ["Lake Norman", "North Davidson", "Combat Athletics", "854-3078", "830-2438"]
  const go = async (url, wait = 9000) => { await p.goto(BASE + url, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(wait); await p.keyboard.press("Escape").catch(() => {}); const close = p.locator("[aria-labelledby=welcome-title] button").first(); if (await close.count()) await close.click().catch(() => {}); await p.waitForTimeout(500) }
  const save = async (shot, banned = []) => { await rename(p, RENAME); await assertClean(p, [...ALWAYS, ...banned], shot); await p.screenshot({ path: `public/screens/coach-${shot}.jpg`, type: "jpeg", quality: 82 }); console.log("saved", shot) }

  await go("/my-recruits")
  // Below the board: the class's top uncommitted and who competes next, real wrestlers from the server.
  await p.evaluate(() => document.querySelectorAll('section[aria-labelledby="ch-top"], section[aria-labelledby="ch-next"]').forEach((e) => e.remove()))
  await save("board")
  await p.locator('button[aria-label^="Notifications"]:visible').first().click(); await p.waitForTimeout(1500)
  await save("alerts")

  await go(`/athletes/${reportId}/scouting-report`, 12000)
  await save("report", SUBJECT_SCHOOLS)

  await go(`/compare?left=${reportId}&right=${rightId}`, 12000)
  // The pickers are drawn from the server's list: the two subjects take the fixture's names.
  await rename(p, [["Keyshon Morrison", "Isaiah Grant"], ["Zack Knott", "Jace Ford"], ["Lake Norman", "Harbor Point"], ["North Davidson", "Ridgeview"]])
  await p.evaluate(() => { const h = [...document.querySelectorAll("h2, h3")].find((e) => /compare wrestlers/i.test(e.textContent)); if (h) window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 40) }); await p.waitForTimeout(1200)
  await save("compare", SUBJECT_SCHOOLS)

  await go("/prospects/all", 12000)
  await p.evaluate(() => window.scrollTo(0, 330)); await p.waitForTimeout(3000)
  // Rewritten last, just before the picture: the table re-renders as its ranks arrive.
  const a = await anonymiseRows(p, { nameSel: "table tbody tr td:nth-child(3) a", schoolSel: "table tbody tr td:nth-child(6)" })
  await save("athletes", a)

  await go("/college-commitments", 10000)
  await p.evaluate(() => window.scrollTo(0, 360)); await p.waitForTimeout(3000)
  const c = await anonymiseRows(p, { nameSel: "table tbody tr td:first-child a", schoolSel: "table tbody tr td:first-child > div" })
  await save("commitments", c)

  await go("/inbox", 8000)
  await p.locator("text=Cole Whitaker").first().click().catch(() => {}); await p.waitForTimeout(5000)
  await save("messages")
  await b.close()
})().catch((e) => { console.error(e.message); process.exit(1) })
