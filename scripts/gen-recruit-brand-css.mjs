/**
 * Brand colours for the recruiting product on its pre-launch brand addresses, generated:
 * app/recruit-brand.css.
 *
 * The same pages are served on app.ncwrestlingunited.com (NC United gold and navy, unchanged) and
 * on brand addresses, each marked before first paint by the script in app/layout.tsx:
 *
 *   html[data-host="guild"]     recruit.wrestlingguild.com - Guild Recruiting: Guild gold on black
 *                               (Matt approved Phase 1, 16 October 2026)
 *   html[data-host="national"]  recruitwrestlers.com - the earlier blue RecruitWrestlers look
 *
 * Gold and navy are written into thousands of class names on pages both sides share, so colour
 * cannot be changed in the pages. This stylesheet re-colours every gold utility, and for Guild
 * every navy surface, inside the brand scope only.
 *
 * Run it after adding a gold or navy class anywhere: `node scripts/gen-recruit-brand-css.mjs`.
 * lib/recruiting/brand-css.test.ts fails while the stylesheet is out of date.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..")
export const OUT = join(ROOT, "app", "recruit-brand.css")

/**
 * One theme per brand address. `fill` colours buttons, borders and bars; `line` is text and thin
 * lines on a dark page, a step lighter so it reads; `onAccent` is lettering on a solid accent.
 * `surfaces` re-colours NC United's navy panels (Guild is black, not navy).
 */
const THEMES = [
  {
    scope: 'html[data-host="national"]',
    fill: [31, 107, 255], // #1F6BFF
    line: [75, 139, 255], // #4B8BFF
    lightFill: [75, 139, 255],
    onAccent: "#fff",
    surfaces: null,
  },
  {
    scope: 'html[data-host="guild"]',
    fill: [184, 157, 96], // #B89D60 - The Wrestling Guild's gold
    line: [212, 188, 130], // #D4BC82
    lightFill: [201, 176, 120], // #C9B078 - Guild's hover gold
    onAccent: "#0A0A0B",
    surfaces: {
      // darkest page backgrounds
      "0a1628": "#0A0A0B",
      "061224": "#08080A",
      "060f1f": "#08080A",
      "020b18": "#050506",
      "071427": "#09090B",
      "061427": "#09090B",
      "061426": "#09090B",
      "07182e": "#0B0B0D",
      // panels and cards
      "0b1d3a": "#111113",
      "0f1c2e": "#131316",
      "0f1e32": "#131316",
      "0d1d36": "#121215",
      "0a1d37": "#121215",
      "0c1a2c": "#101012",
      "0a2040": "#16161A",
      "0b2545": "#18181C",
      "13294b": "#1A1A1E",
      "1a3a5f": "#2A2A2F",
    },
  },
]

/** The golds in use: the brand gold, its older twin, and the two lighter hover golds. */
const GOLDS = { d3b574: "base", d7b968: "base", e2c98d: "light", f5d985: "light" }
/** NC United's navy theme tokens (tailwind.config.ts rnc.*), mapped the same way. */
const RNC_TOKENS = { ink: "0a1628", surface: "0f1c2e", raised: "13294b", line: "1a3a5f" }

const GOLD_TOKEN = /(?<![\w-])((?:[a-z-]+:)*)([a-z-]+)-\[#(d3b574|d7b968|e2c98d|f5d985)\](?:\/(\d+))?/gi
const SURFACE_HEXES = Object.keys(THEMES.find((t) => t.surfaces).surfaces)
const SURFACE_TOKEN = new RegExp(`(?<![\\w-])((?:[a-z-]+:)*)(bg|from|via|to|border|border-t|border-b|border-l|border-r|divide|ring)-\\[#(${SURFACE_HEXES.join("|")})\\](?:\\/(\\d+))?`, "gi")
const RNC_TOKEN = /(?<![\w-])((?:[a-z-]+:)*)(bg|from|via|to|border|border-t|border-b|ring|text)-rnc-(ink|surface|raised|line|gold)(?:-hover)?(?:\/(\d+))?/gi

const hex3 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
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
function declarations(utility, fillColor, lineColor, alpha, onAccent) {
  const fill = rgb(fillColor, alpha)
  const line = rgb(lineColor, alpha)
  switch (utility) {
    case "text":
      return `color: ${line};`
    case "bg":
      // Accent buttons: the lettering changes with the accent so it still reads.
      return `background-color: ${fill};${alpha == null && onAccent ? ` color: ${onAccent};` : ""}`
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
      return `--tw-gradient-from: ${fill} var(--tw-gradient-from-position); --tw-gradient-to: ${rgb(fillColor, 0)} var(--tw-gradient-to-position); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);`
    case "via":
      return `--tw-gradient-to: ${rgb(fillColor, 0)} var(--tw-gradient-to-position); --tw-gradient-stops: var(--tw-gradient-from), ${fill} var(--tw-gradient-via-position), var(--tw-gradient-to);`
    case "to":
      return `--tw-gradient-to: ${fill} var(--tw-gradient-to-position);`
    case "divide":
      return `border-color: ${fill};`
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

function classesMatching(pattern) {
  const found = new Set()
  for (const dir of ["app", "components", "lib"]) {
    for (const file of sourceFiles(join(ROOT, dir))) {
      const text = readFileSync(file, "utf8")
      for (const m of text.matchAll(pattern)) found.add(m[0])
    }
  }
  return [...found].sort()
}

/** Every gold utility class written anywhere in the app. */
export function goldClasses() {
  return classesMatching(GOLD_TOKEN)
}

/** Selector pieces for a class's variant chain, or null when a variant is not one we handle. */
function variantParts(chain) {
  let prefix = ""
  let suffix = ""
  let marker = false
  for (const v of chain) {
    const spec = VARIANTS[v]
    if (!spec) return null
    prefix += spec.prefix ?? ""
    suffix += spec.suffix ?? ""
    if (spec.marker) marker = true
  }
  return { prefix, suffix, marker }
}

function targetsFor(cls, utility, parts) {
  const self = `${parts.prefix}.${esc(cls)}${parts.suffix}`
  if (utility === "divide") return [`${self} > :not([hidden]) ~ :not([hidden])`]
  if (parts.marker) return [`${self} *::marker`, `${self}::marker`]
  return [self]
}

export function buildCss() {
  const rules = []
  const skipped = []

  // Gold, for every theme.
  for (const cls of goldClasses()) {
    GOLD_TOKEN.lastIndex = 0
    const m = GOLD_TOKEN.exec(cls)
    const parts = variantParts((m[1] ?? "").split(":").filter(Boolean))
    const utility = m[2].toLowerCase()
    const tone = GOLDS[m[3].toLowerCase()]
    const alpha = m[4] != null ? Number(m[4]) : null
    if (!parts || !declarations(utility, [0, 0, 0], [0, 0, 0], alpha, null)) {
      skipped.push(cls)
      continue
    }
    for (const theme of THEMES) {
      const fill = tone === "light" ? theme.lightFill : theme.fill
      const body = declarations(utility, fill, theme.line, alpha, theme.onAccent)
      rules.push(`${targetsFor(cls, utility, parts).map((t) => `${theme.scope} ${t}`).join(",\n")} {\n  ${body}\n}`)
    }
  }

  // Navy surfaces, for themes that replace them (Guild is black).
  for (const theme of THEMES.filter((t) => t.surfaces)) {
    for (const cls of classesMatching(SURFACE_TOKEN)) {
      SURFACE_TOKEN.lastIndex = 0
      const m = SURFACE_TOKEN.exec(cls)
      const parts = variantParts((m[1] ?? "").split(":").filter(Boolean))
      if (!parts) continue
      const color = hex3(theme.surfaces[m[3].toLowerCase()])
      const alpha = m[4] != null ? Number(m[4]) : null
      const body = declarations(m[2].toLowerCase(), color, color, alpha, null)
      if (body) rules.push(`${targetsFor(cls, m[2].toLowerCase(), parts).map((t) => `${theme.scope} ${t}`).join(",\n")} {\n  ${body}\n}`)
    }
    for (const cls of classesMatching(RNC_TOKEN)) {
      RNC_TOKEN.lastIndex = 0
      const m = RNC_TOKEN.exec(cls)
      const parts = variantParts((m[1] ?? "").split(":").filter(Boolean))
      if (!parts) continue
      const token = m[3].toLowerCase()
      const alpha = m[4] != null ? Number(m[4]) : null
      const color = token === "gold" ? theme.fill : hex3(theme.surfaces[RNC_TOKENS[token]])
      const body = declarations(m[2].toLowerCase(), color, token === "gold" ? theme.line : color, alpha, token === "gold" ? theme.onAccent : null)
      if (body) rules.push(`${targetsFor(cls, m[2].toLowerCase(), parts).map((t) => `${theme.scope} ${t}`).join(",\n")} {\n  ${body}\n}`)
    }
  }

  const header = `/* Generated by scripts/gen-recruit-brand-css.mjs - do not edit. Brand colours on the pre-launch brand addresses only; app.ncwrestlingunited.com is unchanged. */\n`
  // Frames rendered side by side; the address decides which one shows (components/app-chrome.tsx).
  const frames = [
    `.national-only,\n.guild-only {\n  display: none !important;\n}`,
    `html[data-host="national"] .national-only,\nhtml[data-host="guild"] .guild-only {\n  display: contents !important;\n}`,
    `html[data-host="national"] .ncu-only,\nhtml[data-host="guild"] .ncu-only {\n  display: none !important;\n}`,
    `html[data-host="guild"] body,\nhtml[data-host="guild"] .auth-surface {\n  background: #0A0A0B !important;\n}`,
  ].join("\n\n")
  // For colours written as inline styles: var(--recruit-accent) is gold on NC United, the brand accent on a brand address.
  const vars = [
    `:root {\n  --recruit-accent: #D3B574;\n  --recruit-on-accent: #0A1628;\n  --recruit-fill-rgb: 211, 181, 116;\n}`,
    ...THEMES.map((t) => `${t.scope} {\n  --recruit-accent: ${rgb(t.line)};\n  --recruit-on-accent: ${t.onAccent};\n  --recruit-fill-rgb: ${t.fill.join(", ")};\n}`),
  ].join("\n\n")
  const note = skipped.length ? `/* Not mapped (variant or utility unknown): ${skipped.join(" ")} */\n` : ""
  return { css: `${header}${note}\n${frames}\n\n${vars}\n\n${rules.join("\n\n")}\n`, skipped }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { css, skipped } = buildCss()
  writeFileSync(OUT, css)
  console.log(`wrote ${OUT}: ${css.split("\n").length} lines${skipped.length ? `; not mapped: ${skipped.join(" ")}` : ""}`)
}
