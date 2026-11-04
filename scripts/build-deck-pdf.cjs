const { chromium } = require('/Users/matthickey/RecruitNC_MyRecruits/Recruit-NC-main/node_modules/playwright-core')
const fs = require('fs'), path = require('path')
const WT = process.cwd()
const ASSETS = null // assets are already at public/deck
const src = fs.readFileSync(path.join(WT, 'lib/business/deck/slides.ts'), 'utf8')
// Pull the twelve slides out of the generated module exactly as the app serves them.
const slides = [...src.matchAll(/html: `([\s\S]*?)`,\n    notes:/g)].map((m) => m[1].replace(/\\`/g, '`').replace(/\\\$\{/g, '${').replace(/\\\\/g, '\\'))
if (slides.length !== 12) { console.error('expected 12 slides, found', slides.length); process.exit(1) }
const mime = (p) => (p.endsWith('.png') ? 'image/png' : 'image/jpeg')
const inline = (html) => html.replace(/\/deck\/([0-9a-f]{32}\.(?:png|jpg))/g, (m, f) => {
  const p = path.join(WT, 'public/deck', f)
  return `data:${mime(f)};base64,${fs.readFileSync(p).toString('base64')}`
})
;(async () => {
  const b = await chromium.launch({ channel: 'chrome' })
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}html,body{background:#0B1426}
section{width:1920px;height:1080px;position:relative;overflow:hidden;page-break-after:always;break-after:page}
section:last-child{page-break-after:auto}</style></head><body>${slides.map(inline).join('\n')}</body></html>`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  const out = path.join(WT, 'public/deck/RecruitWrestlers-for-Families.pdf')
  await p.pdf({ path: out, width: '1920px', height: '1080px', printBackground: true, pageRanges: '1-12' })
  console.log(`12 slides -> ${(fs.statSync(out).size / 1e6).toFixed(1)}MB`)
  process.exit(0)
})()
