/**
 * The emails a wrestler sends a college coach from My List (decided with Matt, 12 Oct 2026).
 *
 * Coaches want the same facts in the same place - class, weight, school, the results that
 * matter - and they bin anything that reads like a recruiting-service mail merge. So the two
 * halves are treated differently:
 *
 * - **The facts are fixed and computed.** Subject line, results, academics and the profile link
 *   are assembled here from verified data. Nothing is written by a model, and a fact we do not
 *   hold is left out, never left blank.
 * - **The pitch is the wrestler's.** "Why this school" is his own sentence; the introduction will
 *   not render without it. We give prompts, not wording.
 *
 * Openings and sign-offs rotate (stable per wrestler and school) so two emails in one coach's
 * inbox do not match word for word. There is deliberately no way to send to a whole list.
 *
 * Everything is in the wrestler's voice, first person: coaches want to hear from the kid.
 */

export const OUTREACH_KINDS = ["intro", "competing", "update", "visit", "reply"] as const
export type OutreachKind = (typeof OUTREACH_KINDS)[number]

export const OUTREACH_KIND_LABEL: Record<OutreachKind, string> = {
  intro: "Introduction",
  competing: "Where I'm competing",
  update: "Results update",
  visit: "Camp or visit follow-up",
  reply: "Reply to a coach",
}

/** What each email is for, shown under the picker. */
export const OUTREACH_KIND_HINT: Record<OutreachKind, string> = {
  intro: "Your first email to this program.",
  competing: "A short note a week or two before an event, so the coach can watch you wrestle.",
  update: "After a tournament: how it went, in two lines.",
  visit: "A thank-you after a camp, clinic or campus visit.",
  reply: "The coach wrote back. Answer within a day.",
}

export type OutreachEvent = { title: string; dates: string; location?: string | null }

export type OutreachFacts = {
  athleteId: string
  firstName: string
  lastName: string
  graduationYear: number | null
  /** "sophomore", or null once the class has graduated or is not yet in high school. */
  grade: string | null
  highSchool: string | null
  /** Free text as the family wrote it, e.g. "Raleigh, NC". */
  hometown: string | null
  /** The weight last competed at - never the listed one, which goes stale. */
  weight: string | null
  /** Finished first-person clauses, best first: "placed 3rd at the 2026 NCHSAA 4A state tournament". */
  results: string[]
  gpa: string | null
  intendedMajor: string | null
  profileUrl: string
  phone: string | null
  email: string | null
  /** The college as a wrestler would say it: "Campbell", not "Campbell University (Buies Creek)". */
  schoolName: string
  /** Surname for the greeting; null when we hold no head coach for this team. */
  coachLastName: string | null
}

export type OutreachInput = {
  kind: OutreachKind
  /** The wrestler's own sentence about this school. Required for an introduction. */
  why: string
  questionnaireDone: boolean
  events: OutreachEvent[]
  /** What happened, for an update / what you did, for a visit follow-up. The wrestler's words. */
  detail: string
}

export type OutreachEmail = { subject: string; body: string }

/** Prompts beside the "why this school" box. Questions, never sentences to paste. */
export const WHY_PROMPTS = [
  "Have you been to their camp or a match on campus?",
  "Do you know someone on the team or from your club who wrestled there?",
  "What do you want to study, and do they have it?",
  "What about how they wrestle fits you?",
]

/** Small stable hash, so one wrestler writing to one school always gets the same variant. */
function variant(seed: string, count: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % count
}

function joinClauses(parts: string[]): string {
  if (parts.length <= 1) return parts.join("")
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
}

function sentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ")
  if (!trimmed) return ""
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

export function outreachSubject(facts: OutreachFacts, kind: OutreachKind): string {
  const who = [
    `${facts.firstName} ${facts.lastName}`.trim(),
    facts.graduationYear ? `Class of ${facts.graduationYear}` : null,
    facts.weight ? `${facts.weight} lbs` : null,
    facts.highSchool,
  ]
    .filter(Boolean)
    .join(" - ")
  if (kind === "competing") return `${who} - where I'm wrestling next`
  if (kind === "update") return `${who} - results update`
  if (kind === "visit") return `${who} - thank you`
  if (kind === "reply") return `Re: ${who}`
  return who
}

function greeting(facts: OutreachFacts): string {
  return facts.coachLastName ? `Coach ${facts.coachLastName},` : "Coach,"
}

function whoIAm(facts: OutreachFacts, seed: string): string {
  const name = `${facts.firstName} ${facts.lastName}`.trim()
  const school = facts.highSchool
    ? `${facts.grade ? `a ${facts.grade} at` : "a wrestler at"} ${facts.highSchool}${facts.hometown ? ` in ${facts.hometown}` : ""}`
    : facts.grade
      ? `a high school ${facts.grade}${facts.hometown ? ` from ${facts.hometown}` : ""}`
      : "a high school wrestler"
  const weight = facts.weight ? `, and I wrestle ${facts.weight}` : ""
  const openers = [
    `My name is ${name}. I'm ${school}${weight}.`,
    `I'm ${name}, ${school}${weight}.`,
    `My name is ${name} and I'm ${school}${weight}.`,
  ]
  return openers[variant(`open:${seed}`, openers.length)]
}

function resultsParagraph(facts: OutreachFacts): string | null {
  const top = facts.results.slice(0, 3)
  if (top.length === 0) return null
  return `I ${joinClauses(top)}.`
}

function academicsParagraph(facts: OutreachFacts): string | null {
  if (facts.gpa && facts.intendedMajor) {
    return `In the classroom I have a ${facts.gpa} GPA and I'm interested in studying ${facts.intendedMajor}.`
  }
  if (facts.gpa) return `In the classroom I have a ${facts.gpa} GPA.`
  if (facts.intendedMajor) return `I'm interested in studying ${facts.intendedMajor}.`
  return null
}

function scheduleLines(events: OutreachEvent[]): string[] {
  return events.map((e) => `- ${e.title}, ${e.dates}${e.location ? ` (${e.location})` : ""}`)
}

function signOff(facts: OutreachFacts, seed: string): string {
  const closers = ["Thank you for your time,", "Thank you,", "Thanks for your time, Coach,"]
  const contact = [facts.phone, facts.email].filter(Boolean).join(" · ")
  return [closers[variant(`close:${seed}`, closers.length)], `${facts.firstName} ${facts.lastName}`.trim(), contact]
    .filter(Boolean)
    .join("\n")
}

const PROFILE_LINE = (facts: OutreachFacts) =>
  `My verified results and full record are on my RecruitNC profile: ${facts.profileUrl}`

/**
 * Why a draft cannot be written yet, as something the wrestler can act on - or null when it can.
 */
export function outreachBlocker(input: OutreachInput): string | null {
  if (input.kind === "intro" && input.why.trim().length < 15) {
    return "Tell the coach, in your own words, why you're interested in this program."
  }
  if (input.kind === "competing" && input.events.length === 0) {
    return "Add at least one event you're wrestling in."
  }
  if ((input.kind === "update" || input.kind === "visit") && input.detail.trim().length < 10) {
    return input.kind === "update" ? "Say what happened at the tournament." : "Say what you came for and what stood out."
  }
  return null
}

export function renderOutreachEmail(facts: OutreachFacts, input: OutreachInput): OutreachEmail {
  const seed = `${facts.athleteId}:${facts.schoolName}`
  const paragraphs: Array<string | null> = [greeting(facts)]

  if (input.kind === "intro") {
    paragraphs.push(`${whoIAm(facts, seed)} ${sentence(input.why)}`)
    paragraphs.push(resultsParagraph(facts))
    paragraphs.push(academicsParagraph(facts))
    if (input.events.length > 0) {
      paragraphs.push(
        ["This season I'll be wrestling at:", ...scheduleLines(input.events), "I'd welcome the chance to wrestle in front of you."].join("\n"),
      )
    }
    paragraphs.push(PROFILE_LINE(facts))
    paragraphs.push(
      input.questionnaireDone
        ? "I've filled out your recruiting questionnaire. What would you like to see from me this season?"
        : "What would you like to see from me this season?",
    )
  } else if (input.kind === "competing") {
    paragraphs.push(
      `${facts.firstName} ${facts.lastName}${facts.graduationYear ? ` (Class of ${facts.graduationYear}${facts.weight ? `, ${facts.weight}` : ""})` : ""} here. I wanted you to know where I'm wrestling next, in case you or your staff will be there:`,
    )
    paragraphs.push(scheduleLines(input.events).join("\n"))
    paragraphs.push(`I'd welcome the chance to wrestle in front of you. ${PROFILE_LINE(facts)}`)
  } else if (input.kind === "update") {
    paragraphs.push(`A quick update since I last wrote. ${sentence(input.detail)}`)
    if (input.events.length > 0) paragraphs.push(["Next I'll be at:", ...scheduleLines(input.events)].join("\n"))
    paragraphs.push(PROFILE_LINE(facts))
  } else if (input.kind === "visit") {
    paragraphs.push(`Thank you for having me at ${facts.schoolName}. ${sentence(input.detail)}`)
    paragraphs.push(`I'm very interested in the program. What should my next step be?`)
    paragraphs.push(PROFILE_LINE(facts))
  } else {
    paragraphs.push(`Thank you for getting back to me. ${sentence(input.detail)}`.trim())
    if (input.events.length > 0) paragraphs.push(["My upcoming schedule:", ...scheduleLines(input.events)].join("\n"))
    paragraphs.push(PROFILE_LINE(facts))
  }

  paragraphs.push(signOff(facts, seed))
  return {
    subject: outreachSubject(facts, input.kind),
    body: paragraphs.filter((p): p is string => Boolean(p && p.trim())).join("\n\n"),
  }
}
