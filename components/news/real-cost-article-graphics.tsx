"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Briefcase, HeartHandshake, Landmark, MapPin, PiggyBank, Trophy, Users } from "lucide-react"

const NAVY = "#003366"
const RED = "#C20017"
const GOLD = "#b8860b"
const SLATE = "#64748b"

/** Midpoints from ranges in the article; tooltips note ranges where applicable. */
const ANNUAL_BREAKDOWN = [
  { name: "Training", amount: 7200, range: null as string | null, fill: NAVY },
  { name: "Major travel", amount: 8425, range: "$6,750–$10,100", fill: "#1e4976" },
  { name: "Additional events", amount: 2000, range: "$1,600–$2,400", fill: "#2a5a8a" },
  { name: "Family / spectator", amount: 400, range: null, fill: SLATE },
  { name: "Camps & clinics", amount: 1000, range: null, fill: "#475569" },
  { name: "Gear & Flo", amount: 650, range: null, fill: "#94a3b8" },
]

function formatMoney(n: number) {
  if (n >= 1000) return `$${Math.round(n / 1000)}k`
  return `$${n.toLocaleString()}`
}

export function RealCostAnnualBreakdownGraphic() {
  const sum = ANNUAL_BREAKDOWN.reduce((s, r) => s + r.amount, 0)
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-1 border-b border-slate-200 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#003366]">Annual model</p>
        <h4 className="text-lg font-bold text-slate-900">Where the dollars go (representative)</h4>
        <p className="text-sm text-slate-600">
          Line-item subtotals sum to about <strong className="text-slate-800">{formatMoney(sum)}</strong> — aligned with the{" "}
          <strong>$17,500–$22,000</strong> base elite path before Fargo add-ons.
        </p>
      </div>
      <div className="h-[280px] w-full sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={ANNUAL_BREAKDOWN} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} domain={[0, "dataMax + 1000"]} className="text-xs" />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const row = payload[0].payload as (typeof ANNUAL_BREAKDOWN)[number]
                return (
                  <div className="max-w-[240px] rounded-md border border-slate-200 bg-white p-2 text-xs shadow-sm">
                    <p className="font-medium text-slate-800">{row.name}</p>
                    <p className="tabular-nums text-slate-700">${row.amount.toLocaleString()} (midpoint where range)</p>
                    {row.range && <p className="mt-1 text-slate-500">Range in model: {row.range}</p>}
                  </div>
                )
              }}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={22}>
              {ANNUAL_BREAKDOWN.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        Road to Fargo full pathway adds roughly <strong>$3,000–$5,000</strong> / year on top of this base model.
      </p>
      <p className="mt-2 text-center text-[11px] text-slate-400">Representative model — individual families vary.</p>
    </div>
  )
}

/** HS dev & total use article midpoints within stated ranges; total bill range $174k–$212k. */
const SCHOLARSHIP_COMPARE = [
  { label: "HS development (4 yr range $70k–$108k)", short: "HS dev", amount: 89000, fill: NAVY },
  { label: "Avg. D1 scholarship value (~40%, 4 yr)", short: "Scholarship", amount: 68000, fill: "#1e4976" },
  { label: "Out-of-pocket after scholarship (4 yr)", short: "College OOP", amount: 104000, fill: RED },
  {
    label: "Total bill 9th grade → graduation (illustrative range $174k–$212k)",
    short: "Total bill",
    amount: 193000,
    fill: "#0e7490",
  },
]

export function RealCostScholarshipRealityGraphic() {
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 border-b border-slate-200 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#003366]">The scholarship reality</p>
        <h4 className="text-lg font-bold text-slate-900">The full financial picture — 9th grade through graduation</h4>
        <p className="mt-1 text-sm text-slate-600">
          Illustrative midpoints for bars; HS development spans <strong>$70,000–$108,000</strong> over four years. The{" "}
          <strong>total bill</strong> bar reflects HS development plus college out-of-pocket — often discussed as roughly{" "}
          <strong>$174,000–$212,000</strong> in this model. Scholarship value is shown separately.
        </p>
      </div>
      <div className="h-[280px] w-full sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={SCHOLARSHIP_COMPARE} margin={{ top: 12, right: 12, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
            <XAxis dataKey="short" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={48} domain={[0, 220000]} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const row = payload[0].payload as (typeof SCHOLARSHIP_COMPARE)[number]
                return (
                  <div className="max-w-[260px] rounded-md border border-slate-200 bg-white p-2 text-xs shadow-sm">
                    <p className="font-medium leading-snug text-slate-800">{row.label}</p>
                    <p className="mt-1 tabular-nums text-slate-700">${row.amount.toLocaleString()}</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={40}>
              {SCHOLARSHIP_COMPARE.map((entry) => (
                <Cell key={entry.short} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-xs font-medium text-slate-700">
        The scholarship dream is real. So is the math. Families deserve to see both clearly.
      </p>
      <p className="mt-2 text-center text-[11px] text-slate-500">
        Division I — average scholarship covers ~40% per athlete. Illustrative 4-year totals. Academic and need-based aid would likely exist
        regardless of wrestling.
      </p>
    </div>
  )
}

const FIVE_TWO_NINE = [
  { name: "Contributed (18 yrs)", value: 79920, fill: NAVY },
  { name: "Illustrative balance at 18", value: 228000, fill: GOLD },
]

export function RealCost529ComparisonGraphic() {
  return (
    <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-slate-50 p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3 border-b border-amber-200/60 pb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#003366] text-white">
          <PiggyBank className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Plan smarter — Lever 2</p>
          <h4 className="text-lg font-bold text-slate-900">$370/month from birth grows to $228,000+</h4>
          <p className="text-sm text-slate-600">Hypothetical illustration at ~10% average annual return — not a projection or guarantee.</p>
        </div>
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={FIVE_TWO_NINE} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={48} />
            <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: "8px" }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={72}>
              {FIVE_TWO_NINE.map((e) => (
                <Cell key={e.name} fill={e.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid gap-2 rounded-lg bg-white/80 p-3 text-sm text-slate-700 ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase text-slate-500">Monthly contribution</p>
          <p className="font-semibold text-[#003366]">$370</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Total contributed</p>
          <p className="font-semibold">$79,920</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Value at age 18</p>
          <p className="font-semibold text-amber-900">$228,000+</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Tax-free gain (illustr.)</p>
          <p className="font-semibold">$148,000+</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-600">
        It keeps compounding — funds drawn down over four college years mean the remaining balance can keep growing while your athlete is in
        school.
      </p>
      <p className="mt-2 text-sm font-medium text-slate-800">
        It is never too late to start. Even opening a 529 during high school years captures tax-advantaged growth and keeps college savings
        intentional.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Talk to a licensed professional about your situation. Fees, glide paths, and actual returns vary.
      </p>
    </div>
  )
}

export function RealCostTwoLeversGraphic() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#003366]">The smarter plan</p>
        <h4 className="text-xl font-bold text-slate-900">Two levers. Pull both.</h4>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-xl border-2 border-[#C20017]/25 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-[#C20017]">
            <HeartHandshake className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-wide">Lever 1 — Fundraise</p>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            Use community support and the tax code to fund training <strong>right now</strong>. Every gift to NC United is fully tax-deductible.
            Ten donors × $155 = <strong>$1,550</strong> toward your athlete&apos;s summer.
          </p>
        </div>
        <div className="flex flex-col rounded-xl border-2 border-[#003366]/25 bg-slate-50/80 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-[#003366]">
            <PiggyBank className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-wide">Lever 2 — Save</p>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            It is never too late to start a 529. Tax-advantaged growth works at any stage. Talk to a licensed advisor about what fits your family.
          </p>
        </div>
      </div>
      <p className="text-center text-sm font-medium text-slate-700">
        Pull both levers. Raise what you can. Save what you can.
      </p>
    </div>
  )
}

export function RealCostQuoteTilesGraphic() {
  const quotes = [
    {
      q: "No podium justifies the investment on its own. The real reward happens long after the competition ends.",
      sub: "NC United Wrestling",
      featured: false,
    },
    {
      q: "You're not spending $80,000. You're spending $120,000 of your life's work.",
      sub: "The tax reality nobody mentions",
      featured: true,
    },
    {
      q: "Let the tax code and your community share the load — so the investment you're making has the foundation it deserves.",
      sub: "NC United Wrestling",
      featured: false,
    },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {quotes.map((item) => (
        <blockquote
          key={item.q}
          className={`flex flex-col justify-between rounded-xl border p-4 shadow-sm ring-1 ${
            item.featured
              ? "border-amber-300/80 bg-gradient-to-b from-amber-50 to-amber-100/50 ring-amber-200/80"
              : "border-slate-200 bg-white ring-slate-100"
          }`}
        >
          <p className="text-base font-medium leading-snug text-slate-800">&ldquo;{item.q}&rdquo;</p>
          <footer className="mt-3 text-xs text-slate-500">— {item.sub}</footer>
        </blockquote>
      ))}
    </div>
  )
}

export function RealCostNonprofitMissionGraphic() {
  const items = [
    { icon: Users, title: "Community investment", text: "Tax-advantaged giving through a recognized 501(c)(3)." },
    { icon: Landmark, title: "Statewide coordination", text: "One developmental home for NC wrestling — not clubs in isolation." },
    { icon: Trophy, title: "Athlete-first funding", text: "Training, travel, and access — with accountability." },
    { icon: Briefcase, title: "Pathways beyond the mat", text: "Mentorship, internships, and career connections." },
  ]
  return (
    <div className="overflow-hidden rounded-xl border border-[#003366]/20 bg-gradient-to-br from-[#003366] via-[#0a4a7a] to-[#062a47] p-6 text-white shadow-md sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90">501(c)(3)</p>
      <h4 className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">NC United Wrestling</h4>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-200">
        North Carolina&apos;s wrestling development nonprofit — turning donors, sponsors, and families into partners in athlete development.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3 rounded-lg bg-white/10 p-3 backdrop-blur-sm">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
            <div>
              <p className="font-semibold text-white">{title}</p>
              <p className="text-sm text-slate-200">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-8 border-t border-white/20 pt-5 text-sm leading-relaxed text-slate-100">
        <p className="font-medium text-white">The structure exists to serve the athlete.</p>
        <p className="mt-1">Every dollar accountable. Every gift tax-deductible. That&apos;s why NC United is built this way.</p>
        <p className="mt-3 text-xs text-slate-300">
          <a href="https://ncunitedwrestling.com" className="font-semibold text-amber-200/90 underline" target="_blank" rel="noopener noreferrer">
            NCUnitedWrestling.com
          </a>{" "}
          · #StrengthInUnity
        </p>
      </div>
    </div>
  )
}

export function RealCostSpartanCampaignGraphic() {
  const threeWays = [
    {
      title: "Race",
      body: "Register for any Spartan Race event at a discounted rate through NC United. Your donation can be designated to a specific athlete's training fund or to the NC United general training fund.",
    },
    {
      title: "Sponsor",
      body: "Make a tax-deductible donation in support of a specific wrestler. Search their name at checkout — your gift credits directly to their training and competition costs.",
    },
    {
      title: "Give",
      body: "Make a direct tax-deductible donation to the NC United training fund — supporting NC wrestlers statewide.",
    },
  ]
  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#003366]">Three ways to participate</p>
          <h4 className="mt-1 text-lg font-bold text-slate-900">Spartan Race campaign</h4>
          <ul className="mt-4 space-y-4">
            {threeWays.map((c) => (
              <li key={c.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-[#C20017]">{c.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{c.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-600">
            Every dollar is a fully tax-deductible charitable gift to NC United. No race required to make an impact.
          </p>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Your dollars land where you choose</p>
            <h4 className="mt-1 font-bold text-slate-900">Two designations</h4>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Designate a specific athlete — directed to that wrestler&apos;s training and competition costs.</li>
              <li>Support NC United&apos;s athlete fund — pooled and allocated across statewide athlete needs.</li>
            </ul>
          </div>
          <div className="rounded-xl border-2 border-amber-400/70 bg-gradient-to-r from-amber-50 to-amber-100/80 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">The math every athlete needs to run</p>
            <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
              10 donors × $155 = <span className="text-[#C20017]">$1,550</span>
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Directly to that wrestler&apos;s training fund. Not overhead. Not a general pool. Earned by making 10 intentional asks — and every
              donor gets a tax deduction.
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <a href="/spartan" className="font-semibold text-[#003366] underline underline-offset-2">
                recruitnc.com/spartan
              </a>
              <span aria-hidden>·</span>
              <span>EIN: 99-3757238</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-500">All donations are fully tax-deductible. NC United is a registered 501(c)(3) nonprofit.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
