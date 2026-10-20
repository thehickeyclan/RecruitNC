/**
 * Scout's rules library, sent by the piece (Matt, 20 Oct 2026: "do #2", halve Scout's cost).
 *
 * Every question used to carry the whole library: 52,000 of its 65,000 characters, about three
 * quarters of every bill, while a question about NIL needs none of the transfer portal or the
 * Division II calendar. Now each question carries the sections that match it, up to a budget,
 * plus an index of every guide; Scout reads any other guide with the read_guide tool.
 *
 * Matching is plain word overlap, worked out here: a section scores for each of the question's
 * words in its heading (more) or text (less), with recruiting synonyms folded in (D1 is Division I,
 * JUCO is NJCAA). Nothing is guessed; a miss costs one read_guide call, never a wrong rule.
 */

export type Guide = { key: string; title: string; summary: string; sections: Array<{ heading: string; text: string }> }

/** Split the library text (pages "## Title [link: learn:key]", sections "### Heading") into guides. */
export function parseGuides(library: string): Guide[] {
  const pages = library.split(/\n\n(?=## )/).filter((p) => p.startsWith("## "))
  return pages.map((page) => {
    const [first, ...rest] = page.split("\n")
    const key = first.match(/\[link: (learn:[a-z0-9-]+)\]/)?.[1] ?? first.replace(/^## /, "")
    const title = first.replace(/^## /, "").replace(/\s*\[link:[^\]]*\]/, "").trim()
    const body = rest.join("\n")
    const parts = body.split(/\n(?=### )/)
    const hasSections = parts.some((p) => p.startsWith("### "))
    const summary = hasSections && !parts[0].startsWith("### ") ? parts.shift()! : ""
    const sections = hasSections
      ? parts.map((p) => ({ heading: p.split("\n")[0].replace(/^### /, ""), text: p }))
      : chunk(body).map((text, i) => ({ heading: i === 0 ? title : `${title} (part ${i + 1})`, text }))
    return { key, title, summary, sections }
  })
}

/** A page without sections, cut into pieces of about 900 characters at line ends. */
function chunk(body: string): string[] {
  const out: string[] = []
  let cur = ""
  for (const line of body.split("\n")) {
    if (cur && cur.length + line.length > 900) {
      out.push(cur)
      cur = ""
    }
    cur += (cur ? "\n" : "") + line
  }
  if (cur.trim()) out.push(cur)
  return out
}

const SYNONYMS: Array<[RegExp, string]> = [
  [/\b(d1|d-1|di)\b|division (1|one)\b/, "division i"],
  [/\b(d2|d-2|dii)\b|division (2|two)\b/, "division ii"],
  [/\b(d3|d-3|diii)\b|division (3|three)\b/, "division iii"],
  [/\b(juco|jc|community college)\b/, "njcaa junior college"],
  [/\bclearinghouse\b/, "eligibility center"],
  [/\b(full ride|scholly|money|cost|afford|pay for)\b/, "scholarship aid"],
  [/\b(transfer|transfers|portal)\b/, "transfer portal"],
  [/\b(girls?|women'?s?|female)\b/, "women's"],
  [/\b(name image|endorse|sponsor)\w*/, "nil"],
  [/\bnil\b/, "name image likeness"],
]

const STOP = new Set(
  "the a an and or of to in on for with is are be can do does did my our his her he she we you your it at as by from what which how when who why should would could will about this that there their them get got any all more most than then has have had not no yes was were been into out up".split(" "),
)

const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "")

export function queryWords(text: string): string[] {
  let t = ` ${text.toLowerCase()} `
  for (const [re, add] of SYNONYMS) if (re.test(t)) t += ` ${add} `
  return [...new Set(t.split(/[^a-z0-9']+/).filter((w) => w.length >= 2 && !STOP.has(w)).map(stem))]
}

function score(words: string[], heading: string, text: string): number {
  const h = ` ${heading.toLowerCase().split(/[^a-z0-9']+/).map(stem).join(" ")} `
  const b = ` ${text.toLowerCase().split(/[^a-z0-9']+/).map(stem).join(" ")} `
  let n = 0
  for (const w of words) {
    if (h.includes(` ${w} `)) n += 3
    else if (b.includes(` ${w} `)) n += 1
  }
  return n
}

/** The library sections that best match the question, best first, within `budget` characters. */
export function pickSections(guides: Guide[], question: string, budget = 9000): string {
  const words = queryWords(question)
  if (!words.length) return ""
  const scored = guides
    .flatMap((g) => g.sections.map((s) => ({ g, s, n: score(words, `${g.title} ${s.heading}`, s.text) })))
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n)
  const out: string[] = []
  const perGuide = new Map<string, number>()
  let used = 0
  for (const { g, s } of scored) {
    // At most four sections from one guide, so a second guide that also answers gets room (NIL's
    // own guide once crowded out North Carolina's NIL rule).
    if ((perGuide.get(g.key) ?? 0) >= 4) continue
    if (used + s.text.length > budget) continue
    perGuide.set(g.key, (perGuide.get(g.key) ?? 0) + 1)
    out.push(`(${g.title}${g.key.startsWith("learn:") ? ` [link: ${g.key}]` : ""})\n${s.text}`)
    used += s.text.length
  }
  return out.join("\n\n")
}

/** One line per guide, so Scout knows what it can read. */
export function guideIndex(guides: Guide[]): string {
  return guides.map((g) => `- ${g.key}: ${g.title} (${g.sections.map((s) => s.heading).slice(0, 8).join("; ")})`).join("\n")
}

/** A whole guide, for the read_guide tool. */
export function readGuide(guides: Guide[], key: string): string {
  const g = guides.find((x) => x.key === key || x.key === `learn:${key}`)
  if (!g) return `No guide ${key}. Guides: ${guides.map((x) => x.key).join(", ")}`
  return [`## ${g.title}${g.key.startsWith("learn:") ? ` [link: ${g.key}]` : ""}`, g.summary, ...g.sections.map((s) => s.text)].filter(Boolean).join("\n")
}
