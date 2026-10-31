"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, Calculator, ExternalLink, Info, Pencil, Trophy, X } from "lucide-react"

import {
  bottomLine,
  dollars,
  OFFER_FIELD_LABEL,
  OFFER_FIELDS,
  OWE_GUIDE,
  rankOffers,
  RENEWS,
  RENEWS_LABEL,
  type BottomLine,
  type Offer,
  type OfferField,
  type Renews,
} from "@/lib/recruiting/offers"
import { MoneyWord } from "@/components/recruiting/money-word"
import type { MoneyWordId } from "@/lib/recruiting/learn/money-words"

/** The money word behind each field's ⓘ. Other aid is plain enough to need none. */
const FIELD_WORD: Partial<Record<OfferField, MoneyWordId>> = {
  grants: "grant-scholarship-loan",
  merit: "merit-aid",
  athletic: "athletic-scholarship",
  revenueShare: "revenue-share",
  loans: "student-loans",
}

/** What we hold about one college's price, for one family (worked out on the server). */
export type SchoolMoney = {
  /** The published full yearly cost the family is charged, before aid. */
  published: { amount: number; year: string; which: string } | null
  /** The average paid after grants and scholarships by aided first-year students, before any athletic scholarship. */
  afterAid: { amount: number; year: string } | { amount: null; why: string }
  /** The college's own Net Price Calculator, from the US Department of Education's records. */
  calculatorUrl: string | null
}

export type CostSchool = { id: string; name: string; logo: string | null; money: SchoolMoney }

/** One offer's bottom line, from the offer and the college's published cost. */
export const lineFor = (s: CostSchool, o: Offer | null): BottomLine | null => (o ? bottomLine(o, s.money.published?.amount ?? null) : null)

function Logo({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-1" />
  ) : (
    <span className="h-9 w-9 shrink-0 rounded-lg bg-white/[0.06]" aria-hidden />
  )
}

/** The small cost lines under a college's published price in the list's Cost column. */
export function CostCell({ s, offer, onOffer, readOnly }: { s: CostSchool; offer: Offer | null; onOffer: () => void; readOnly: boolean }) {
  const p = s.money.published
  const line = lineFor(s, offer)
  return (
    <>
      {p ? (
        <>
          <span className="font-semibold text-white">{dollars(p.amount)}</span>
          <span className="block text-[11px] text-white/40">
            {p.which}, {p.year}
          </span>
        </>
      ) : (
        <span className="text-white/35">Not published</span>
      )}
      {s.money.afterAid.amount != null ? <span className="mt-1 block whitespace-nowrap text-[11px] text-white/55">After aid {dollars(s.money.afterAid.amount)}</span> : null}
      {line ? (
        <button type="button" onClick={onOffer} className="mt-1.5 inline-flex whitespace-nowrap rounded-md bg-emerald-400/15 px-2 py-0.5 text-xs font-bold text-emerald-200 hover:bg-emerald-400/25">
          You: {dollars(line.perYear)}/yr
        </button>
      ) : readOnly ? null : (
        <button type="button" onClick={onOffer} className="mt-1.5 block whitespace-nowrap text-xs font-semibold text-[#D3B574] hover:underline">
          + Offer
        </button>
      )}
    </>
  )
}

/**
 * "What will it cost us?" on My List: every offer the family has entered, cheapest first, side by
 * side; then the colleges without one, with their published price, the average after aid and the
 * college's Net Price Calculator.
 */
export function CostComparison({ schools, offers, onOffer, readOnly, available }: { schools: CostSchool[]; offers: Record<string, Offer>; onOffer: (id: string) => void; readOnly: boolean; available: boolean }) {
  const [about, setAbout] = useState(false)
  const lines = schools.map((s) => ({ s, line: lineFor(s, offers[s.id] ?? null) }))
  const ranked = rankOffers(lines)
  const cheapest = ranked[0]?.line?.fourYears ?? null
  const without = lines.filter((x) => !x.line)

  return (
    <section id="cost" className="mt-6 scroll-mt-24 rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Calculator className="h-5 w-5 text-[#D3B574]" aria-hidden /> What will it cost us?
          </h2>
          <p className="mt-0.5 text-sm text-white/60">{ranked.length ? `${ranked.length} ${ranked.length === 1 ? "offer" : "offers"}, cheapest first` : "Enter an offer to see what you'll owe"}</p>
        </div>
        <div className="flex items-center gap-3">
          <a href={OWE_GUIDE} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D3B574] hover:underline">
            <BookOpen className="h-4 w-4" aria-hidden /> The money guide
          </a>
          <button type="button" onClick={() => setAbout((v) => !v)} aria-expanded={about} aria-label="How this is worked out" className="rounded-full p-1 text-white/40 hover:text-white">
            <Info className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      {about ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-white/60 marker:text-[#D3B574]">
          <li>You pay or borrow: the college&apos;s full yearly cost, less every grant and scholarship in the offer, and any revenue share or NIL money in a written agreement with the college.</li>
          <li>Loans are not taken off. Borrowed money is still owed, paid back later with interest.</li>
          <li>Four years are at this year&apos;s price. Prices rise most years, so the real total is higher.</li>
          <li>Aid counts only for the years the offer covers. Years after that are at full price.</li>
          <li>After aid: what aided first-year students paid on average, after grants and scholarships and before any athletic scholarship (US Department of Education).</li>
          <li>Nothing about your family&apos;s income is asked or stored. Only the college&apos;s numbers.</li>
        </ul>
      ) : null}
      {!available ? <p className="mt-3 rounded-lg bg-amber-300/10 px-3 py-2 text-xs text-amber-100">Saving offers is being switched on. You can try the numbers now; they won&apos;t be kept yet.</p> : null}

      {ranked.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ranked.map(({ s, line }, i) => {
            const l = line!
            const more = cheapest != null && i > 0 ? l.fourYears - cheapest : 0
            const o = offers[s.id]
            return (
              <div key={s.id} className={`flex flex-col rounded-xl border p-4 ${i === 0 && ranked.length > 1 ? "border-[#D3B574]/60 bg-[#D3B574]/5" : "border-white/10 bg-[#0f1c2e]"}`}>
                <div className="flex items-center gap-2.5">
                  <Logo src={s.logo} />
                  <p className="min-w-0 flex-1 truncate text-sm font-bold">{s.name}</p>
                  {i === 0 && ranked.length > 1 ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#D3B574] px-2 py-0.5 text-[10px] font-black uppercase text-[#0A1628]">
                      <Trophy className="h-3 w-3" aria-hidden /> Lowest
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-3xl font-black tracking-tight">{dollars(l.perYear)}</p>
                <p className="text-xs text-white/55">a year you pay or borrow</p>
                <p className="mt-2 text-sm font-bold">
                  {dollars(l.fourYears)} <span className="font-normal text-white/55">over 4 years</span>
                </p>
                {more > 0 ? <p className="text-xs text-white/50">{dollars(more)} more than the lowest</p> : null}
                {l.ifNotRenewed != null ? <p className="mt-1 text-xs text-amber-100">{dollars(l.ifNotRenewed)} if the athletic scholarship stops after year 1</p> : null}
                <dl className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-white/55">
                      <MoneyWord id="cost-of-attendance">{l.costFrom === "offer" ? "Cost on the offer letter" : `Published cost${s.money.published ? `, ${s.money.published.year}` : ""}`}</MoneyWord>
                    </dt>
                    <dd className="font-semibold">{dollars(l.cost)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-white/55">
                      <MoneyWord id="grant-scholarship-loan">Grants, scholarships, NIL</MoneyWord>
                    </dt>
                    <dd className="font-semibold text-emerald-200">−{dollars(l.freeMoney)}</dd>
                  </div>
                  {l.loans > 0 ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-white/55">
                        <MoneyWord id="student-loans">Loans offered (owed later)</MoneyWord>
                      </dt>
                      <dd className="font-semibold">{dollars(l.loans)}</dd>
                    </div>
                  ) : null}
                  {o && o.years < 4 ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-white/55">Offer covers</dt>
                      <dd className="font-semibold">{o.years === 1 ? "1 year" : `${o.years} years`}</dd>
                    </div>
                  ) : null}
                </dl>
                <button type="button" onClick={() => onOffer(s.id)} className="mt-3 inline-flex items-center gap-1 self-start text-xs font-semibold text-white/60 hover:text-white">
                  <Pencil className="h-3 w-3" aria-hidden /> {readOnly ? "See the offer" : "Edit the offer"}
                </button>
              </div>
            )
          })}
        </div>
      ) : null}

      {without.length ? (
        <div className="mt-5">
          <p className="text-xs font-black uppercase tracking-wide text-white/45">{ranked.length ? "No offer yet" : "Your colleges"}</p>
          {!ranked.length ? <p className="mt-1 text-sm text-white/60">Before an offer arrives, each college&apos;s Net Price Calculator gives your own estimate.</p> : null}
          <ul className="mt-2 divide-y divide-white/5">
            {without.map(({ s }) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                <span className="flex min-w-0 flex-1 basis-56 items-center gap-2.5">
                  <Logo src={s.logo} />
                  <span className="truncate text-sm font-semibold">{s.name}</span>
                </span>
                <span className="w-28 text-xs">
                  <span className="block text-white/45">
                    <MoneyWord id="cost-of-attendance">Published</MoneyWord>
                  </span>
                  <span className="font-semibold">{s.money.published ? dollars(s.money.published.amount) : "—"}</span>
                </span>
                <span className="w-28 text-xs">
                  <span className="block text-white/45">
                    <MoneyWord id="net-price">After aid</MoneyWord>
                  </span>
                  <span className="font-semibold" title={s.money.afterAid.amount == null ? s.money.afterAid.why : undefined}>
                    {s.money.afterAid.amount != null ? dollars(s.money.afterAid.amount) : "In-state only"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {s.money.calculatorUrl ? (
                    <a href={s.money.calculatorUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white/80 hover:border-[#D3B574]/50 hover:text-white">
                      Net Price Calculator <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : null}
                  {readOnly ? null : (
                    <button type="button" onClick={() => onOffer(s.id)} className="rounded-lg bg-[#D3B574] px-2.5 py-1.5 text-xs font-black text-[#0A1628] hover:bg-[#e2c98d]">
                      Enter offer
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

type Draft = { cost: string } & Record<OfferField, string> & { years: number; renews: Renews }
const asText = (n: number | null | undefined) => (n ? n.toLocaleString("en-US") : "")
const draftOf = (o: Offer | null): Draft => ({
  cost: asText(o?.cost),
  grants: asText(o?.grants),
  merit: asText(o?.merit),
  athletic: asText(o?.athletic),
  revenueShare: asText(o?.revenueShare),
  otherAid: asText(o?.otherAid),
  loans: asText(o?.loans),
  years: o?.years ?? 4,
  renews: o?.renews ?? "unknown",
})
const num = (s: string) => {
  const n = Number(s.replace(/[$,\s]/g, ""))
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}

/** Type in one college's offer; the bottom line updates as you type. */
export function OfferDialog({
  school,
  offer,
  athleteId,
  readOnly,
  onClose,
  onSaved,
}: {
  school: CostSchool
  offer: Offer | null
  athleteId: string
  readOnly: boolean
  onClose: () => void
  onSaved: (o: Offer | null) => void
}) {
  const [d, setD] = useState<Draft>(() => draftOf(offer))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const live = useMemo(
    () =>
      bottomLine(
        { cost: num(d.cost) || null, grants: num(d.grants), merit: num(d.merit), athletic: num(d.athletic), revenueShare: num(d.revenueShare), otherAid: num(d.otherAid), loans: num(d.loans), years: d.years, renews: d.renews },
        school.money.published?.amount ?? null,
      ),
    [d, school.money.published],
  )
  const any = OFFER_FIELDS.some((f) => num(d[f]) > 0)

  const save = async () => {
    setBusy(true)
    setError(null)
    const res = await fetch("/api/college-offers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId, schoolId: school.id, ...d }) }).catch(() => null)
    const j = (await res?.json().catch(() => null)) as { offer?: Offer; error?: string } | null
    setBusy(false)
    if (!res?.ok || !j?.offer) return setError(j?.error ?? "Could not save. Try again.")
    onSaved(j.offer)
  }
  const remove = async () => {
    if (!window.confirm(`Remove the ${school.name} offer?`)) return
    setBusy(true)
    const res = await fetch(`/api/college-offers?athlete=${encodeURIComponent(athleteId)}&school=${encodeURIComponent(school.id)}`, { method: "DELETE" }).catch(() => null)
    setBusy(false)
    if (!res?.ok) return setError("Could not remove. Try again.")
    onSaved(null)
  }

  const input = "w-full rounded-lg border border-white/15 bg-[#0A1628] py-2 pl-6 pr-3 text-right text-sm font-semibold text-white placeholder:text-white/30 focus:border-[#D3B574] focus:outline-none disabled:opacity-60"
  const seg = (on: boolean) => `flex-1 rounded-md px-2 py-1.5 text-xs font-bold ${on ? "bg-[#D3B574] text-[#0A1628]" : "text-white/70 hover:text-white"}`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" role="dialog" aria-modal="true" aria-label={`${school.name} offer`} onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0d1d36] p-5 text-white shadow-2xl sm:max-w-lg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <Logo src={school.logo} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-6">{school.name}</p>
            <p className="text-xs text-white/55">Yearly amounts from the offer letter. Leave blank what isn&apos;t there.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {OFFER_FIELDS.map((f) => (
            <label key={f} className="grid grid-cols-[1fr_9rem] items-center gap-3">
              <span>
                <span className={`block text-sm font-bold ${f === "loans" ? "text-amber-100" : ""}`}>{FIELD_WORD[f] ? <MoneyWord id={FIELD_WORD[f]!}>{OFFER_FIELD_LABEL[f].label}</MoneyWord> : OFFER_FIELD_LABEL[f].label}</span>
                <span className="block text-[11px] leading-4 text-white/45">{OFFER_FIELD_LABEL[f].help}</span>
              </span>
              <span className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-white/40">$</span>
                <input inputMode="numeric" value={d[f]} disabled={readOnly} onChange={(e) => setD({ ...d, [f]: e.target.value })} placeholder="0" className={input} />
              </span>
            </label>
          ))}
          <label className="grid grid-cols-[1fr_9rem] items-center gap-3 border-t border-white/10 pt-3">
            <span>
              <span className="block text-sm font-bold">
                <MoneyWord id="cost-of-attendance" />
              </span>
              <span className="block text-[11px] leading-4 text-white/45">
                {school.money.published ? `If the letter gives one. Otherwise the published ${dollars(school.money.published.amount)} (${school.money.published.year}).` : "The letter's yearly cost. No published price for this college."}
              </span>
            </span>
            <span className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-white/40">$</span>
              <input inputMode="numeric" value={d.cost} disabled={readOnly} onChange={(e) => setD({ ...d, cost: e.target.value })} placeholder={school.money.published ? school.money.published.amount.toLocaleString("en-US") : "0"} className={input} />
            </span>
          </label>
          <div className="grid grid-cols-[1fr_9rem] items-center gap-3">
            <span className="text-sm font-bold">Years it covers</span>
            <span className="flex rounded-lg border border-white/15 p-0.5">
              {[1, 2, 3, 4].map((y) => (
                <button key={y} type="button" disabled={readOnly} onClick={() => setD({ ...d, years: y })} className={seg(d.years === y)}>
                  {y}
                </button>
              ))}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <span>
              <span className="block text-sm font-bold">
                <MoneyWord id="renewal">Does it renew each year?</MoneyWord>
              </span>
              <span className="block text-[11px] leading-4 text-white/45">Ask the coach in writing.</span>
            </span>
            <span className="flex rounded-lg border border-white/15 p-0.5">
              {RENEWS.map((r) => (
                <button key={r} type="button" disabled={readOnly} onClick={() => setD({ ...d, renews: r })} className={`${seg(d.renews === r)} whitespace-nowrap`}>
                  {RENEWS_LABEL[r]}
                </button>
              ))}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/10 p-4">
          {live && any ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-white/55">You pay or borrow</p>
              <p className="mt-0.5 text-3xl font-black">
                {dollars(live.perYear)} <span className="text-base font-semibold text-white/60">a year</span>
              </p>
              <p className="text-sm font-bold">
                {dollars(live.fourYears)} <span className="font-normal text-white/60">over 4 years</span>
              </p>
              {live.loans > 0 && live.perYear > 0 ? <p className="mt-1 text-xs text-amber-100">Up to {dollars(Math.min(live.loans, live.perYear))} a year of this can be the loans offered: still owed, paid back later.</p> : null}
              {live.ifNotRenewed != null ? <p className="mt-1 text-xs text-amber-100">{dollars(live.ifNotRenewed)} over 4 years if the athletic scholarship stops after year 1.</p> : null}
            </>
          ) : (
            <p className="text-sm text-white/60">{live ? "Enter the amounts to see what you'll owe." : "Enter the cost of attendance from the letter to see what you'll owe."}</p>
          )}
        </div>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-4 flex items-center gap-2">
          {offer && !readOnly ? (
            <button type="button" onClick={remove} disabled={busy} className="text-xs font-semibold text-red-300 hover:underline disabled:opacity-50">
              Remove
            </button>
          ) : null}
          <span className="flex-1" />
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-white/70 hover:text-white">
            {readOnly ? "Close" : "Cancel"}
          </button>
          {readOnly ? null : (
            <button type="button" onClick={save} disabled={busy || !any} className="rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-black text-[#0A1628] hover:bg-[#e2c98d] disabled:opacity-50">
              {busy ? "Saving…" : "Save offer"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
