/**
 * Brand colours for the recruiting product on its pre-launch brand addresses, generated:
 * app/recruit-brand.css.
 *
 * The same pages are served on app.ncwrestlingunited.com (NC United gold and navy, unchanged) and
 * on brand addresses, each marked before first paint by the script in app/layout.tsx:
 *
 *   html[data-host="guild"]     recruit.wrestlingguild.com - Guild Recruiting: Guild gold on black
 *                               (Matt approved Phase 1, 16 October 2026)
 *   html[data-host="national"]  recruitwrestlers.com - RecruitWrestlers, navy and lime (Matt, 20 October
 *                               2026: owned by Guild Ventures; lime, not gold, to stay clear of RankWrestlers)
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
 * `surfaces` re-colours NC United's navy panels: Guild's black, RecruitWrestlers' own navies.
 */
const THEMES = [
  {
    scope: 'html[data-host="national"]',
    fill: [163, 230, 53], // #A3E635 - RecruitWrestlers lime
    line: [163, 230, 53], // the palette's lime for text and highlights too (Matt, 20 Oct 2026)
    lightFill: [190, 242, 100],
    onAccent: "#0B1426",
    // Matt's RecruitWrestlers palette (20 Oct 2026): Midnight Navy page, Secondary Navy cards.
    surfaces: {
      "0a1628": "#0B1426",
      "061224": "#0B1426",
      "060f1f": "#0B1426",
      "020b18": "#0B1426",
      "071427": "#0B1426",
      "061427": "#0B1426",
      "061426": "#0B1426",
      "07182e": "#0B1426",
      "0b1d3a": "#15243B",
      "0f1c2e": "#15243B",
      "0f1e32": "#15243B",
      "0d1d36": "#15243B",
      "0a1d37": "#15243B",
      "0c1a2c": "#15243B",
      "0a2040": "#15243B",
      "0b2545": "#1A2B45",
      "13294b": "#15243B",
      "1a3a5f": "#22324D",
    },
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
const SURFACE_HEXES = [...new Set(THEMES.flatMap((t) => Object.keys(t.surfaces ?? {})))]
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

  /*
   * RecruitWrestlers only (Matt's brand review, 20 Oct 2026): every other accent the shared pages
   * hard-code becomes lime, and the remaining old navies become the palette's navies. Found by a
   * colour census of every page served on recruitwrestlers.com. The college map's division colours
   * and the green "good" marks are data, not brand, and are left alone.
   */
  const national = THEMES.find((t) => t.scope.includes('"national"'))
  const EXTRA_ACCENTS = ["d7b95a", "d6b75d", "c5a84d", "cbaf5d", "d3b573", "c4a665", "c8a94a", "9c7a2e", "cc0000", "bc0b03", "b31b1b", "38bdf8", "7dd3fc", "bae6fd", "1f5fbf"]
  const EXTRA_NAVIES = { "003366": "#15243B", "03154c": "#0B1426", "1e3a5f": "#22324D", "031a3f": "#0B1426", "0d1a4d": "#15243B", "0b1a33": "#15243B", "002147": "#0B1426" }
  const EXTRA_TOKEN = new RegExp(`(?<![\\w-])((?:[a-z-]+:)*)([a-z-]+)-\\[#(${EXTRA_ACCENTS.join("|")})\\](?:\\/(\\d+))?`, "gi")
  const SKY_TOKEN = /(?<![\w-])((?:[a-z-]+:)*)(text|bg|border|from|to|via|ring|fill|stroke)-sky-(\d{2,3})(?:\/(\d+))?/gi
  for (const pattern of [EXTRA_TOKEN, SKY_TOKEN]) {
    for (const cls of classesMatching(pattern)) {
      pattern.lastIndex = 0
      const m = pattern.exec(cls)
      const parts = variantParts((m[1] ?? "").split(":").filter(Boolean))
      if (!parts) continue
      const alpha = m[4] != null ? Number(m[4]) : null
      const body = declarations(m[2].toLowerCase(), national.fill, national.line, alpha, national.onAccent)
      if (body) rules.push(`${targetsFor(cls, m[2].toLowerCase(), parts).map((x) => `${national.scope} ${x}`).join(",\n")} {\n  ${body}\n}`)
    }
  }
  const NAVY_TOKEN = new RegExp(`(?<![\\w-])((?:[a-z-]+:)*)(bg|from|via|to|border|border-t|border-b|divide|ring|text)-\\[#(${Object.keys(EXTRA_NAVIES).join("|")})\\](?:\\/(\\d+))?`, "gi")
  for (const cls of classesMatching(NAVY_TOKEN)) {
    NAVY_TOKEN.lastIndex = 0
    const m = NAVY_TOKEN.exec(cls)
    const parts = variantParts((m[1] ?? "").split(":").filter(Boolean))
    if (!parts || m[2].toLowerCase() === "text") continue
    const color = hex3(EXTRA_NAVIES[m[3].toLowerCase()])
    const alpha = m[4] != null ? Number(m[4]) : null
    const body = declarations(m[2].toLowerCase(), color, color, alpha, null)
    if (body) rules.push(`${targetsFor(cls, m[2].toLowerCase(), parts).map((x) => `${national.scope} ${x}`).join(",\n")} {\n  ${body}\n}`)
  }
  /*
   * Inline styles: about 165 places set an accent with style={{ color: GOLD }} rather than a class,
   * which no class rule reaches. The style attribute is matched as text in both forms a browser
   * holds it: the server's "color:#D3B574" and the client's "color: rgb(211, 181, 116)". A tint
   * (an alpha hex or rgba) stays a tint of lime; a solid stays solid.
   */
  const LIME = national.fill
  const limeA = (a) => `rgb(${LIME.join(" ")} / ${a})`
  const inline = []
  for (const hex of ["d3b574", "d7b968", "e2c98d", "f5d985", ...EXTRA_ACCENTS]) {
    const c = hex3("#" + hex)
    const r = `rgb(${c.join(", ")})`
    const ra = `rgba(${c.join(", ")},`
    const sel = (frags) => frags.map((f) => `${national.scope} [style*="${f}" i]`).join(",\n")
    inline.push(`${sel([`;color:#${hex}`, `; color: ${r}`])},\n${national.scope} [style^="color:#${hex}" i],\n${national.scope} [style^="color: ${r}"] {\n  color: ${rgb(national.line)} !important;\n}`)
    inline.push(`${sel([`background-color:#${hex}`, `background:#${hex}`, `background-color: ${ra}`, `background: ${ra}`])} {\n  background-color: ${limeA(0.15)} !important;\n}`)
    inline.push(`${sel([`background-color:#${hex};`, `background:#${hex};`, `background-color: ${r}`, `background: ${r}`])},\n${national.scope} [style$="background-color:#${hex}" i],\n${national.scope} [style$="background:#${hex}" i] {\n  background-color: ${rgb(LIME)} !important;\n}`)
    inline.push(`${sel([`border-color:#${hex}`, `border-color: ${r}`, `border-color: ${ra}`])} {\n  border-color: ${rgb(LIME)} !important;\n}`)
    inline.push(`${national.scope} [fill="#${hex}" i] {\n  fill: ${rgb(LIME)};\n}\n${national.scope} [stroke="#${hex}" i] {\n  stroke: ${rgb(LIME)};\n}`)
  }
  rules.push(...inline)

  const header = `/* Generated by scripts/gen-recruit-brand-css.mjs - do not edit. Brand colours on the pre-launch brand addresses only; app.ncwrestlingunited.com is unchanged. */\n`
  // Frames rendered side by side; the address decides which one shows (components/app-chrome.tsx).
  const frames = [
    `.national-only,\n.guild-only {\n  display: none !important;\n}`,
    `html[data-host="national"] .national-only,\nhtml[data-host="guild"] .guild-only {\n  display: contents !important;\n}`,
    `html[data-host="national"] .ncu-only,\nhtml[data-host="guild"] .ncu-only {\n  display: none !important;\n}`,
    `html[data-host="guild"] body,\nhtml[data-host="guild"] .auth-surface {\n  background: #0A0A0B !important;\n}`,
    // RecruitWrestlers: Midnight Navy page, Muted Gray for secondary text (Matt's palette, 20 Oct 2026).
    `html[data-host="national"] body,\nhtml[data-host="national"] .auth-surface {\n  background: #0B1426 !important;\n}`,
    `html[data-host="national"] .text-white\\/50,\nhtml[data-host="national"] .text-white\\/55,\nhtml[data-host="national"] .text-white\\/60,\nhtml[data-host="national"] .text-white\\/65,\nhtml[data-host="national"] .text-white\\/70 {\n  color: #A8B3C5 !important;\n}`,
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
