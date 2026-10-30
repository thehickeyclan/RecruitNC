/**
 * "What's allowed right now" for one wrestler (step 3 of the recruiting path, 28 Oct 2026).
 *
 * Nothing here is a rule of its own. The dated contact and visit rows come from the rules library
 * (lib/recruiting/learn/content.ts, through timeline.ts allDatedRules), and the school-year date
 * is turned into a calendar date for the wrestler's class by Scout's resolveRuleDate, so the
 * Command Center, Learn and Scout can never disagree. A rule with no date we can place for this
 * class ("after you have finished sophomore year") is left out rather than guessed.
 */
import { d1TrackFor } from "@/lib/recruiting/learn/content"
import { allDatedRules } from "@/lib/recruiting/learn/timeline"
import { resolveRuleDate } from "@/lib/recruiting/scout/dates"

export type Opening = { level: string; date: string }
export type AllowedNow = {
  /** Levels whose coaches may call and write now, in level order. */
  contactOpen: string[]
  /** Levels where it opens later, soonest first. */
  contactLater: Opening[]
  visitOpen: string[]
  visitLater: Opening[]
  /** One line for the card: who may call now and when the rest open. */
  line: string
  /** The official-visit line, for the visit guide and the step's detail. */
  visitLine: string
}

const ORDER = ["Division I", "Division II", "Division III", "Junior college"]
const LEVEL_ORDER = ["Division I", "Division II", "Division III", "NAIA", "Junior college"]
const isContact = (label: string) => /call|recruiting materials/i.test(label)
const isOfficialVisit = (label: string) => /^official/i.test(label)

function join(levels: string[]): string {
  if (levels.length <= 1) return levels[0] ?? ""
  return `${levels.slice(0, -1).join(", ")} and ${levels[levels.length - 1]}`
}

function split(rows: Array<{ level: string; when: string }>, classYear: number, now: Date) {
  const open = new Set<string>()
  const later = new Map<string, { date: Date; label: string }>()
  for (const r of rows) {
    if (/any time|^unlimited/i.test(r.when)) {
      open.add(r.level)
      continue
    }
    const d = resolveRuleDate(r.when, classYear, now)
    if (!d) continue
    if (d.open) open.add(r.level)
    else {
      const cur = later.get(r.level)
      // Two rows for one level (Division I calls and materials): the earlier date is when it opens.
      if (!cur || d.date < cur.date) later.set(r.level, { date: d.date, label: d.label })
    }
  }
  for (const l of open) later.delete(l)
  return {
    open: ORDER.filter((l) => open.has(l)),
    later: [...later.entries()].sort((a, b) => a[1].date.getTime() - b[1].date.getTime()).map(([level, v]) => ({ level, date: v.label })),
  }
}

export function allowedNow(input: { gender: string | null; classYear: number | null; now?: Date }): AllowedNow | null {
  if (!input.classYear) return null
  const now = input.now ?? new Date()
  const rules = allDatedRules(d1TrackFor(input.gender, input.classYear))
  const contact = split(rules.filter((r) => isContact(r.what)), input.classYear, now)
  const visit = split(rules.filter((r) => isOfficialVisit(r.what)), input.classYear, now)

  // The NAIA sets no date at all (content.ts: "no recruiting calendar restrictions of any kind"), so it is always open.
  const contactOpen = [...contact.open, "NAIA"].sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b))
  const laterWho = contact.later.map((o) => `${short(o.level)} from ${o.date}`).join("; ")
  const line = laterWho
    ? `${join(contactOpen.map(short))} coaches may call and write now. ${laterWho}.`
    : "Coaches at every level may call and write now."

  const visitNow = visit.open.length ? `Official visits are open now at ${join(visit.open.map(short))}.` : ""
  const visitLater = visit.later.map((o) => `${short(o.level)} from ${o.date}`).join("; ")
  const visitLine = [visitNow, visitLater ? `${visitNow ? "" : "Official visits open: "}${visitLater}.` : ""].filter(Boolean).join(" ")

  return { contactOpen, contactLater: contact.later, visitOpen: visit.open, visitLater: visit.later, line, visitLine }
}

/** "Division II" -> "D2", the way the rest of the portal labels levels. */
function short(level: string): string {
  return ({ "Division I": "D1", "Division II": "D2", "Division III": "D3", "Junior college": "junior college" } as Record<string, string>)[level] ?? level
}
