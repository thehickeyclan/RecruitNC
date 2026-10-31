import { APP_PLAN_LABEL } from "@/lib/college-programs/list"
import { daysUntil, easternToday, shortDate } from "@/lib/college-programs/admissions-format"
import type { CollegeAdmissions } from "@/lib/college-programs/admissions"

const PLANS = ["ed1", "ed2", "ea", "rea", "rd"] as const

/**
 * A college's admissions facts for the 2026-27 cycle (Fall 2027 entry), each with the page it
 * came from. A plan the college does not offer says so; one we could not find is left out rather
 * than guessed. Deadlines already passed are shown struck through, so last week's date never
 * reads as one still ahead.
 */
export function AdmissionsCard({ a, card, cardTitle }: { a: CollegeAdmissions; card: string; cardTitle: string }) {
  const today = easternToday()
  const rows = PLANS.flatMap((plan) => {
    const p = a.plans[plan]
    if (!p) return []
    if (!p.offered) return [{ key: plan, label: APP_PLAN_LABEL[plan], value: "Not offered", passed: false, soon: false, source: p.source ?? null, muted: true }]
    if (p.dates?.length)
      return p.dates.map((d, i) => {
        const days = daysUntil(d.date, today)
        return {
          key: `${plan}-${i}`,
          label: d.label ?? APP_PLAN_LABEL[plan],
          value: `${shortDate(d.date)}${days >= 0 ? (days === 0 ? " · today" : ` · ${days} days`) : ""}`,
          passed: days < 0,
          soon: days >= 0 && days <= 21,
          source: p.source ?? null,
          muted: false,
        }
      })
    return [{ key: plan, label: APP_PLAN_LABEL[plan], value: p.raw ?? "", passed: false, soon: false, source: p.source ?? null, muted: false }]
  })
  const facts: Array<[string, string | null, string | undefined]> = [
    ["Apply through", a.platform, a.sources.apply],
    ["Rolling admission", a.rolling === true ? "Yes" : typeof a.rolling === "string" ? a.rolling : a.rolling === false ? "No" : null, a.sources.rolling],
    ["Testing", a.testPolicy, a.sources.test],
    ["Application fee", a.fee == null ? null : a.fee === 0 ? "None" : `$${a.fee}${a.feeWaiver ? " · fee waiver available" : ""}`, a.sources.fee],
    ["Financial aid forms", a.aidForm, a.sources.aid],
    ["Priority aid deadline", a.aidDeadline, a.sources.aidDeadline],
  ]
  return (
    <section id="admissions" className={`${card} scroll-mt-16`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={cardTitle}>
          Admissions <span className="font-normal text-white/50">(apply in 2026-27, start fall 2027)</span>
        </h2>
        {a.applyUrl ? (
          <a href={a.applyUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-[#D3B574] px-3 py-1.5 text-xs font-black text-[#0A1628]">
            Apply ↗
          </a>
        ) : null}
      </div>
      {rows.length ? (
        <ul className="mt-3 space-y-1 text-sm">
          {rows.map((r) => (
            <li key={r.key} className="flex justify-between gap-3 border-b border-white/5 pb-1">
              <span className="text-white/65">{r.label}</span>
              <span className={`text-right font-semibold ${r.muted ? "font-normal text-white/40" : r.passed ? "text-white/35 line-through" : r.soon ? "text-amber-200" : ""}`}>
                {r.source ? (
                  <a href={r.source} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {r.value}
                  </a>
                ) : (
                  r.value
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-white/55">Deadlines not published yet.</p>
      )}
      <ul className="mt-3 space-y-1 text-xs">
        {facts
          .filter(([, v]) => v)
          .map(([label, value, source]) => (
            <li key={label} className="flex justify-between gap-3">
              <span className="text-white/50">{label}</span>
              <span className="text-right text-white/80">
                {source ? (
                  <a href={source} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {value}
                  </a>
                ) : (
                  value
                )}
              </span>
            </li>
          ))}
      </ul>
      <p className="mt-3 text-[11px] text-white/40">From the college&apos;s own admissions pages; tap a date for its source. Recruited athletes: confirm your dates with the coaching staff.</p>
    </section>
  )
}
