/**
 * The printable check-in sheet: every wrestler by weight and seed, with his corner coaches and
 * whether each holds a credential. Writes HTML and PDF to ~/Downloads.
 *
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local scripts/print-toc-corner-coaches.ts
 *
 * Reprint after every GoFan import or coach change — the sheet is a snapshot.
 */
import { execFileSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { createClient } from "@supabase/supabase-js"
import { loadResolvedCoachRows } from "@/lib/toc/coach-identity"
import { toCheckInList } from "@/lib/toc/coach-designation"
import { loadCoachTickets } from "@/lib/toc/coach-purchase-view"
import { normaliseCoachName } from "@/lib/toc/coach-ticket-purchases"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
const OUT = `${homedir()}/Downloads/TOC-corner-coaches-by-wrestler`

void (async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const loaded = await loadResolvedCoachRows(admin)
  if (!loaded.ok) throw new Error(String(loaded.error))
  const coaches = toCheckInList(loaded.value.resolved as never) as any[]
  const tickets = await loadCoachTickets(admin, loaded.value, coaches)
  // One coach can appear under two keys (a phone from one family, an email from another); if either
  // holds the credential, the person does.
  const holders = new Set(coaches.filter((c) => tickets.byCoach.get(c.coachKey)).map((c) => normaliseCoachName(c.coachName)))

  const byAthlete = new Map<string, Map<string, { name: string; credential: boolean }>>()
  for (const c of coaches) {
    if (c.status === "declined") continue
    for (const a of c.athletes ?? []) {
      if (a.status === "declined") continue
      const key = norm(String(a.athleteName))
      const list = byAthlete.get(key) ?? new Map()
      const person = normaliseCoachName(c.coachName)
      const credential = Boolean(tickets.byCoach.get(c.coachKey)) || holders.has(person)
      list.set(person, { name: String(c.coachName).trim(), credential: credential || Boolean(list.get(person)?.credential) })
      byAthlete.set(key, list)
    }
  }

  const { data: draws } = await admin.from("toc_bracket_draws").select("weight_class,draw")
  const drawBy = new Map((draws ?? []).map((d: any) => [Number(d.weight_class), d.draw]))

  let total = 0, noCoach = 0, uncredentialed = 0, coachCount = 0
  const noCoachNames: string[] = []
  const sections: string[] = []
  for (const w of TOC_WEIGHT_CLASSES) {
    const parts = [...(drawBy.get(w)?.participants ?? [])].sort((a: any, b: any) => a.seed - b.seed)
    const rows = parts.map((p: any) => {
      total++
      const list = [...(byAthlete.get(norm(p.name))?.values() ?? [])]
      if (list.length === 0) { noCoach++; noCoachNames.push(`${p.name} (${w})`) }
      coachCount += list.length
      uncredentialed += list.filter((c) => !c.credential).length
      const cells = list.length
        ? list.map((c) => `<span class="coach ${c.credential ? "ok" : "no"}">${esc(c.name)}<b>${c.credential ? "✓" : "no credential"}</b></span>`).join("")
        : `<span class="none">No corner coach named</span>`
      return `<tr><td class="seed">${p.seed}</td><td class="name">${esc(p.name)}</td><td class="club">${esc(p.club ?? "")}</td><td>${cells}</td><td class="chk"></td></tr>`
    }).join("")
    sections.push(`<section><h2>${w} lbs</h2><table><thead><tr><th>Seed</th><th>Wrestler</th><th>Club</th><th>Corner coaches</th><th>Checked in</th></tr></thead><tbody>${rows}</tbody></table></section>`)
  }

  const stamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>TOC Corner Coaches</title><style>
@page { size: letter portrait; margin: 0.45in; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font: 10.5px/1.35 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #0b1d3a; margin: 0; }
header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #0b1d3a; padding-bottom: 6px; margin-bottom: 8px; }
h1 { font-size: 17px; margin: 0; letter-spacing: .02em; }
header p { margin: 0; color: #4a5b73; font-size: 10px; }
.rule { background: #f3efe3; border-left: 3px solid #b8964a; padding: 5px 8px; margin: 0 0 10px; font-size: 10px; }
section { break-inside: avoid; margin-bottom: 10px; }
h2 { font-size: 12.5px; margin: 0 0 3px; background: #0b1d3a; color: #fff; padding: 3px 8px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .06em; color: #4a5b73; border-bottom: 1px solid #c9d1dc; padding: 2px 5px; }
td { border-bottom: 1px solid #e3e7ee; padding: 4px 5px; vertical-align: top; }
.seed { width: 34px; font-weight: 700; text-align: center; }
.name { width: 150px; font-weight: 700; }
.club { width: 120px; color: #4a5b73; }
.chk { width: 62px; border-left: 1px solid #e3e7ee; }
.coach { display: inline-block; margin: 0 12px 2px 0; white-space: nowrap; }
.coach b { font-weight: 600; margin-left: 4px; font-size: 9px; }
.coach.ok b { color: #1f7a3d; }
.coach.no b { color: #b3261e; text-transform: uppercase; }
.none { color: #b3261e; font-style: italic; }
footer { margin-top: 6px; font-size: 9.5px; color: #4a5b73; }
</style></head><body>
<header><h1>Tournament of Champions · Corner Coaches</h1><p>As of ${esc(stamp)}</p></header>
<div class="rule">Up to two corner coaches per wrestler. A coach corners only the wrestlers listed beside his name. ✓ = coach credential purchased. Abdul-Jamil (133) and Ahmet Zaggout (157) share two coaches between them.</div>
${sections.join("\n")}
<footer>${total} wrestlers · ${coachCount} coach assignments · ${uncredentialed} without a credential · ${noCoach} wrestler(s) with no coach named</footer>
</body></html>`
  writeFileSync(`${OUT}.html`, html, "utf8")
  execFileSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${OUT}.pdf`, `file://${OUT}.html`,
  ], { stdio: "ignore" })
  console.log(JSON.stringify({ total, coachCount, uncredentialed, noCoach, noCoachNames }))
})()
