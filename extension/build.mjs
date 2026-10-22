// Builds the helper into extension/dist. Load extension/ as an unpacked extension in Chrome
// (chrome://extensions, Developer mode, "Load unpacked"). `node extension/build.mjs`
//
// The sites the helper opens on by itself are written into manifest.json here, from the college
// links we hold (lib/college-programs/questionnaires-2026-27.json): the questionnaire platforms,
// plus each college's own site exactly. Never a catch-all pattern - the Chrome Web Store flags
// those for an in-depth review (22 Oct 2026). A college site not listed still works through the
// toolbar's "Fill this page" (activeTab).
import { readFileSync, writeFileSync } from "node:fs"
import { build } from "esbuild"

const PLATFORMS = ["armssoftware.com", "frontrush.com", "jumpforward.com", "arirecruiting.com"]
const OUR_SITES = ["https://www.recruitwrestlers.com/my-recruiting/*", "https://app.ncwrestlingunited.com/my-recruiting/*"]

const links = JSON.parse(readFileSync("lib/college-programs/questionnaires-2026-27.json", "utf8")).questionnaires
const hosts = new Set()
for (const list of Object.values(links)) for (const q of list) for (const u of [q.mens, q.womens]) if (u) hosts.add(new URL(u).hostname.toLowerCase())
const colleges = [...hosts].filter((h) => !PLATFORMS.some((p) => h === p || h.endsWith(`.${p}`)))
const collegeMatches = [...new Set(colleges.flatMap((h) => (h.split(".").length === 2 ? [h, `www.${h}`] : [h])))].sort().map((h) => `https://${h}/*`)

const manifestPath = "extension/manifest.json"
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
manifest.content_scripts[0].matches = [...PLATFORMS.map((p) => `https://*.${p}/*`), ...collegeMatches, ...OUR_SITES]
// page.js sets Front Rush's date picker; only Front Rush pages need to load it.
manifest.web_accessible_resources = [{ resources: ["dist/page.js"], matches: ["https://*.frontrush.com/*"] }]
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`manifest: ${manifest.content_scripts[0].matches.length} sites`)

await build({
  entryPoints: { content: "extension/src/content.ts", background: "extension/src/background.ts", popup: "extension/src/popup.ts", page: "extension/src/page.ts" },
  outdir: "extension/dist",
  bundle: true,
  format: "iife",
  target: "chrome110",
  minify: false,
  logLevel: "info",
})
