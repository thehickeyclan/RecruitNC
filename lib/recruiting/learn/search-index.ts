/**
 * Everything in the Learn library as one searchable list (Matt, 14 Oct 2026: "the learning portal
 * is critical"). Built from the library itself - the rules pages, the men's and women's
 * comparisons, the timeline and the tournaments - so search can only ever find what the library
 * says, and a rule added there is searchable the same day.
 */
import { LEARN_PAGES, MENS_AND_WOMENS, sectionId } from "./content"
import { GRADE_NAME, TIMELINE } from "./timeline"
import { TOURNAMENT_LISTS } from "./tournaments"
import { COACH_QUESTIONS, WORKING_STEPS } from "./working"
import { LOOK_POINTS } from "./coaches-look-for"

export type SearchEntry = { title: string; where: string; href: string; text: string }

export function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = []
  for (const page of LEARN_PAGES) {
    for (const section of page.sections) {
      entries.push({
        title: section.heading,
        where: page.title,
        href: `/recruiting/learn/${page.slug}#${sectionId(section.heading)}`,
        text: [section.intro, ...(section.bullets ?? []), ...(section.rows ?? []).map((r) => `${r.label}: ${r.value}`), section.advice].filter(Boolean).join(" "),
      })
    }
    const mw = MENS_AND_WOMENS[page.slug]
    if (mw?.differences.length) {
      entries.push({
        title: `Men's and women's: what differs at ${page.title}`,
        where: page.title,
        href: `/recruiting/learn/${page.slug}#mens-and-womens`,
        text: mw.differences.map((d) => `${d.topic}. Men: ${d.mens}. Women: ${d.womens}.`).join(" "),
      })
    }
  }
  for (const year of TIMELINE) {
    entries.push({
      title: `${GRADE_NAME[year.grade]}: what to do`,
      where: "Timeline",
      href: `/recruiting/learn/timeline#grade-${year.grade}`,
      text: [year.headline, ...year.steps.map((s) => s.text), ...year.facts.map((f) => f.text)].join(" "),
    })
  }
  for (const list of TOURNAMENT_LISTS) {
    for (const t of list.events) {
      entries.push({
        title: t.name,
        where: `Tournaments · ${list.title}`,
        href: `/recruiting/learn/tournaments#${list.key}`,
        text: [t.style, t.when, t.where, t.who, t.why].filter(Boolean).join(" "),
      })
    }
  }
  for (const step of WORKING_STEPS) {
    entries.push({ title: step.heading, where: "Working the process", href: "/recruiting/learn/working-the-process", text: step.points.join(" ") })
  }
  for (const p of LOOK_POINTS) {
    entries.push({ title: p.title, where: "What college coaches look at", href: "/recruiting/learn/what-coaches-look-for", text: p.text })
  }
  entries.push({ title: "Does my wrestler need to be a state champion?", where: "What college coaches look at", href: "/recruiting/learn/what-coaches-look-for", text: "state champion placer qualifier division level where NC wrestlers went" })
  entries.push({ title: "Questions to ask a college coach", where: "Working the process", href: "/recruiting/learn/working-the-process", text: COACH_QUESTIONS.join(" ") })
  return entries
}

/** Entries matching every word typed, best first: a word in the title counts most. */
export function searchLearn(entries: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1)
  if (!words.length) return []
  return entries
    .map((e) => {
      const title = e.title.toLowerCase()
      const body = `${e.where} ${e.text}`.toLowerCase()
      if (!words.every((w) => title.includes(w) || body.includes(w))) return null
      return { e, score: words.reduce((n, w) => n + (title.includes(w) ? 3 : 0) + (body.includes(w) ? 1 : 0), 0) }
    })
    .filter((x): x is { e: SearchEntry; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.e)
}
