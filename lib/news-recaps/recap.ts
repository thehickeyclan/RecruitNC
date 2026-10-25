/**
 * Graded tournament recaps written as markdown (content/news/*.md): the public top, the grade
 * sections, and every graded wrestler pulled out so the page can gate them and the college-coach
 * report can quote them. The markdown is the single source; nothing here rewrites a word.
 *
 * Shape the parser expects (Super 32 2026 boys recap):
 *   ## A+ / ## A / ## A- / ## B+ / ## B / ## B-   one section per grade
 *   **Name (Weight) — W-L[, …].** paragraph       one graded wrestler per paragraph
 *   ## Honorable Mention                           Name (wt, W-L, note) · Name (…)
 */
import fs from "node:fs"
import path from "node:path"

export const GRADES = ["A+", "A", "A-", "B+", "B", "B-"] as const
export type Grade = (typeof GRADES)[number]

export type GradedWrestler = { name: string; weight: string; grade: Grade; heading: string; paragraph: string }

export type Recap = {
  title: string
  /** Everything before the first grade section: free to everyone. */
  intro: string
  graded: GradedWrestler[]
  honorableMention: Array<{ name: string; weight: string; note: string }>
  /** Sections after the grades (Rest of the Squad, Claim Your Profile). */
  outro: string
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim()
export const nameKey = norm

export function parseRecap(md: string): Recap {
  const text = md.replace(/<!--[\s\S]*?-->/g, "").trim()
  const title = (text.match(/^# (.+)$/m)?.[1] ?? "").trim()
  const body = text.replace(/^# .+$/m, "").trim()
  const sections = body.split(/^## /m)
  const intro: string[] = []
  const outro: string[] = []
  const graded: GradedWrestler[] = []
  const hm: Recap["honorableMention"] = []
  let seenGrades = false
  for (const raw of sections) {
    if (!raw.trim()) continue
    const nl = raw.indexOf("\n")
    const head = (nl < 0 ? raw : raw.slice(0, nl)).trim()
    const rest = nl < 0 ? "" : raw.slice(nl + 1).trim()
    if ((GRADES as readonly string[]).includes(head)) {
      seenGrades = true
      for (const para of rest.split(/\n\s*\n/)) {
        const m = para.trim().match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/)
        if (!m) continue
        const headLine = m[1]!.replace(/\.$/, "")
        const nm = headLine.match(/^(.+?)\s*\(([^)]*?)(\d{2,3})\)/)
        if (!nm) continue
        graded.push({ name: nm[1]!.trim(), weight: nm[3]!, grade: head as Grade, heading: headLine, paragraph: m[2]!.trim() })
      }
    } else if (/^honorable mention$/i.test(head)) {
      for (const item of rest.split(/\s·\s/)) {
        const m = item.trim().match(/^(.+?)\s*\((\d{2,3}),?\s*(.*)\)$/)
        if (m) hm.push({ name: m[1]!.trim(), weight: m[2]!, note: m[3]!.trim() })
      }
    } else if (!seenGrades) {
      intro.push(`## ${raw.trim()}`)
    } else {
      outro.push(`## ${raw.trim()}`)
    }
  }
  return { title, intro: intro.join("\n\n"), graded, honorableMention: hm, outro: outro.join("\n\n") }
}

const cache = new Map<string, Recap>()
export function loadRecap(slug: string): Recap {
  if (!cache.has(slug)) cache.set(slug, parseRecap(fs.readFileSync(path.join(process.cwd(), "content/news", `${slug}.md`), "utf8")))
  return cache.get(slug)!
}

export const SUPER32_2026_BOYS_RECAP = "super32-2026-nc-boys-recap"

/** Where each recap lives on the site and which report event it grades. */
export const RECAP_FOR_EVENT: Record<string, { slug: string; path: string }> = {
  "super32-2026": { slug: SUPER32_2026_BOYS_RECAP, path: "/news/super32-2026-nc-boys-recap" },
}

/**
 * Grade and paragraph for each named wrestler, for the college-coach report: a coach's starred
 * wrestler who is graded in the recap gets his grade and write-up flagged in the email.
 */
export function recapGradesFor(eventKey: string, baseUrl: string): Map<string, { grade: string; text: string; url: string }> {
  const ref = RECAP_FOR_EVENT[eventKey]
  const out = new Map<string, { grade: string; text: string; url: string }>()
  if (!ref) return out
  const recap = loadRecap(ref.slug)
  for (const w of recap.graded) out.set(nameKey(w.name), { grade: w.grade, text: w.paragraph.replace(/\*\*/g, ""), url: `${baseUrl}${ref.path}` })
  for (const h of recap.honorableMention) {
    if (!out.has(nameKey(h.name))) out.set(nameKey(h.name), { grade: "Honorable Mention", text: h.note, url: `${baseUrl}${ref.path}` })
  }
  return out
}
