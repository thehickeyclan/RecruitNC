/**
 * Admissions deadlines in words, for the browser (the facts come from admissions.ts on the
 * server). A date the colleges' pages gave without a year is shown as written, never counted down.
 */
import { APP_PLAN_LABEL, type AppPlan } from "@/lib/college-programs/list"

export type PlanDeadline = { plan: Exclude<AppPlan, "rolling">; date: string | null; label: string | null; raw: string | null }

export type AdmissionsSummary = {
  deadlines: PlanDeadline[]
  /** Plans the college says it does not offer. */
  notOffered: AppPlan[]
  rolling: boolean
  applyUrl: string | null
  testPolicy: string | null
  fee: number | null
  feeWaiver: boolean | null
  aidForm: string | null
}

export const PLAN_SHORT: Record<AppPlan, string> = { ed1: "ED", ed2: "ED II", ea: "EA", rea: "REA", rd: "RD", rolling: "Rolling" }

/** Whole days from `today` (YYYY-MM-DD, Eastern) to `date`. */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 864e5)
}

export function easternToday(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
}

export function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
}

/**
 * The deadline that matters next: the family's chosen plan if they picked one, else the earliest
 * one still ahead. Null when nothing dated is ahead.
 */
export function nextDeadline(s: AdmissionsSummary | null | undefined, plan: AppPlan | null, today: string): (PlanDeadline & { date: string; days: number }) | null {
  if (!s) return null
  const ahead = s.deadlines
    .filter((d): d is PlanDeadline & { date: string } => Boolean(d.date) && daysUntil(d.date!, today) >= 0)
    .filter((d) => !plan || plan === "rolling" || d.plan === plan)
    .sort((a, b) => a.date.localeCompare(b.date))
  const d = ahead[0]
  return d ? { ...d, days: daysUntil(d.date, today) } : null
}

/** "Early Action closes Nov 1 · 10 days" / "… · today" / "… · tomorrow". */
export function deadlineLine(d: PlanDeadline & { date: string; days: number }): string {
  const name = d.label ?? APP_PLAN_LABEL[d.plan]
  const when = d.days === 0 ? "today" : d.days === 1 ? "tomorrow" : `${d.days} days`
  return `${name} closes ${shortDate(d.date)} · ${when}`
}

/** For a plan menu: "Early Action · Nov 1", "Early Decision · not offered". */
export function planOptionLabel(s: AdmissionsSummary | null | undefined, plan: AppPlan): string {
  const base = APP_PLAN_LABEL[plan]
  if (!s) return base
  if (plan === "rolling") return s.rolling ? `${base} · offered` : base
  if (s.notOffered.includes(plan)) return `${base} · not offered`
  const dated = s.deadlines.filter((d) => d.plan === plan && d.date)
  if (dated.length) return `${base} · ${dated.map((d) => shortDate(d.date!)).join(", ")}`
  const raw = s.deadlines.find((d) => d.plan === plan)?.raw
  return raw ? `${base} · ${raw.slice(0, 24)}` : base
}
