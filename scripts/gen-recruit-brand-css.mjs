/**
 * Recruiting blue, generated: app/recruit-brand.css.
 *
 * RecruitWrestlers is blue; NC United stays gold, and the blue is for recruitwrestlers.com only
 * (Matt, 15 October 2026). The same pages are served on both addresses, with gold written into
 * ~1,800 class names, so the colour cannot be changed in the pages. This stylesheet re-colours
 * every gold utility when the page is on the national address:
 *
 *   html[data-host="national"]  set before first paint by the script in app/layout.tsx
 *
 * Run it after adding a gold class anywhere: `node scripts/gen-recruit-brand-css.mjs`.
 * lib/recruiting/brand-css.test.ts fails while the stylesheet is out of date.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..")
export const OUT = join(ROOT, "app", "recruit-brand.css")

const SCOPES = ['html[data-host="national"]']
const BLUE = [31, 107, 255] // #1F6BFF - fills, borders, rings
const BLUE_TEXT = [75, 139, 255] // #4B8BFF - text and lines on navy, a step lighter to read
/** The golds in use: the brand gold, its older twin, and the two lighter hover golds. */
const GOLDS = { d3b574: "base", d7b968: "base", e2c98d: "light", f5d985: "light" }

const TOKEN = /(?<![\w-])((?:[a-z-]+:)*)([a-z-]+)-\[#(d3b574|d7b968|e2c98d|f5d985)\](?:\/(\d+))?/gi

const rgb = (c, alpha) => (alpha == null ? `rgb(${c.join(" ")})` : `rgb(${c.join(" ")} / ${alpha / 100})`)

/** Escape a class name for a selector the way Tailwind does. */
const esc = (cls) => cls.replace(/([^a-zA-Z0-9_-])/g, "\\$1")

const VARIANTS = {
  hover: { suffix: ":hover" },
  focus: { suffix: ":focus" },
  "focus-visible": { suffix: ":focus-visible" },
  "focus-within": { suffix: ":focus-within" },
  active: { suffix: ":active" },
  "group-hover": { prefix: ".group:hover " },
  before: { suffix: "::before" },
  after: { suffix: "::after" },
  marker: { marker: true },
  placeholder: { suffix: "::placeholder" },
}

/** CSS declarations for one utility in one colour, or null for a utility we do not map. */
function declarations(utility, tone, alpha) {
  const fill = rgb(tone === "light" ? BLUE_TEXT : BLUE, alpha)
  const line = rgb(BLUE_TEXT, alpha)
  switch (utility) {
    case "text":
      return `color: ${line};`
    case "bg":
      // Gold buttons carry navy lettering; on blue it has to be white to read.
      return `background-color: ${fill};${alpha == null ? " color: #fff;" : ""}`
    case "border":
      return `border-color: ${fill};`
    case "border-t":
      return `border-top-color: ${fill};`
    case "border-b":
      return `border-bottom-color: ${fill};`
    case "border-l":
      return `border-left-color: ${fill};`
    case "border-r":
      return `border-right-color: ${fill};`
    case "ring":
      return `--tw-ring-color: ${fill};`
    case "outline":
      return `outline-color: ${fill};`
    case "fill":
      return `fill: ${fill};`
    case "stroke":
      return `stroke: ${fill};`
    case "decoration":
      return `text-decoration-color: ${line};`
    case "accent":
      return `accent-color: ${fill};`
    case "caret":
      return `caret-color: ${line};`
    case "shadow":
      return `--tw-shadow-color: ${fill}; --tw-shadow: var(--tw-shadow-colored);`
    case "from":
      return `--tw-gradient-from: ${fill} var(--tw-gradient-from-position); --tw-gradient-to: ${rgb(BLUE, 0)} var(--tw-gradient-to-position); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);`
    case "via":
      return `--tw-gradient-to: ${rgb(BLUE, 0)} var(--tw-gradient-to-position); --tw-gradient-stops: var(--tw-gradient-from), ${fill} var(--tw-gradient-via-position), var(--tw-gradient-to);`
    case "to":
      return `--tw-gradient-to: ${fill} var(--tw-gradient-to-position);`
    case "divide":
      return null // handled by selector below
    default:
      return null
  }
}

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) sourceFiles(path, out)
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) out.push(path)
  }
  return out
}

/** Every gold utility class written anywhere in the app. */
export function goldClasses() {
  const found = new Set()
  for (const dir of ["app", "components", "lib"]) {
    for (const file of sourceFiles(join(ROOT, dir))) {
      const text = readFileSync(file, "utf8")
      for (const m of text.matchAll(TOKEN)) found.add(m[0])
    }
  }
  return [...found].sort()
}

export function buildCss() {
  const rules = []
  const skipped = []
  for (const cls of goldClasses()) {
    TOKEN.lastIndex = 0
    const m = TOKEN.exec(cls)
    const variantChain = (m[1] ?? "").split(":").filter(Boolean)
    const utility = m[2].toLowerCase()
    const tone = GOLDS[m[3].toLowerCase()]
    const alpha = m[4] != null ? Number(m[4]) : null

    let prefix = ""
    let suffix = ""
    let marker = false
    let known = true
    for (const v of variantChain) {
      const spec = VARIANTS[v]
      if (!spec) {
        known = false
        break
      }
      prefix += spec.prefix ?? ""
      suffix += spec.suffix ?? ""
      if (spec.marker) marker = true
    }
    if (!known) {
      skipped.push(cls)
      continue
    }

    const self = `.${esc(cls)}`
    let body = declarations(utility, tone, alpha)
    let targets
    if (utility === "divide") {
      body = `border-color: ${rgb(tone === "light" ? BLUE_TEXT : BLUE, alpha)};`
      targets = [`${prefix}${self}${suffix} > :not([hidden]) ~ :not([hidden])`]
    } else if (marker) {
      targets = [`${prefix}${self}${suffix} *::marker`, `${prefix}${self}${suffix}::marker`]
    } else {
      targets = [`${prefix}${self}${suffix}`]
    }
    if (!body) {
      skipped.push(cls)
      continue
    }
    const selector = SCOPES.flatMap((scope) => targets.map((t) => `${scope} ${t}`)).join(",\n")
    rules.push(`${selector} {\n  ${body}\n}`)
  }
  const header = `/* Generated by scripts/gen-recruit-brand-css.mjs - do not edit. Recruiting areas are blue; NC United stays gold. */\n`
  // For colours written as inline styles: var(--recruit-accent) is gold outside recruiting areas, blue inside.
  // Two frames rendered side by side; the address decides which one shows (components/app-chrome.tsx).
  const frames = `.national-only {\n  display: none !important;\n}\n\nhtml[data-host="national"] .national-only {\n  display: contents !important;\n}\n\nhtml[data-host="national"] .ncu-only {\n  display: none !important;\n}\n\n`
  const vars = `:root {\n  --recruit-accent: #D3B574;\n  --recruit-on-accent: #0A1628;\n  --recruit-fill-rgb: 211, 181, 116;\n}\n\n${SCOPES.join(",\n")} {\n  --recruit-accent: ${rgb(BLUE_TEXT)};\n  --recruit-on-accent: #fff;\n  --recruit-fill-rgb: 31, 107, 255;\n}\n`
  const note = skipped.length ? `/* Not mapped (variant or utility unknown): ${skipped.join(" ")} */\n` : ""
  return { css: `${header}${note}\n${frames}${vars}\n${rules.join("\n\n")}\n`, skipped }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { css, skipped } = buildCss()
  writeFileSync(OUT, css)
  console.log(`wrote ${OUT}: ${css.split("\n").length} lines${skipped.length ? `; not mapped: ${skipped.join(" ")}` : ""}`)
}
