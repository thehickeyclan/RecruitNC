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
import { Briefcase, Landmark, MapPin, PiggyBank, Trophy, Users } from "lucide-react"

const NAVY = "#003366"
const RED = "#C20017"
const GOLD = "#b8860b"
const SLATE = "#64748b"

/** Midpoints / totals from the article line-item model (annual). */
const ANNUAL_BREAKDOWN = [
  { name: "Training", amount: 7200, fill: NAVY },
  { name: "Major travel", amount: 8425, fill: "#1e4976" },
  { name: "Additional events", amount: 2000, fill: "#2a5a8a" },
  { name: "Family / spectator", amount: 400, fill: SLATE },
  { name: "Camps & clinics", amount: 1000, fill: "#475569" },
  { name: "Gear & Flo", amount: 650, fill: "#94a3b8" },
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
          <BarChart
            layout="vertical"
            data={ANNUAL_BREAKDOWN}
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              domain={[0, "dataMax + 1000"]}
              className="text-xs"
            />
            <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Annual"]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
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
        Road to Fargo adds roughly <strong>$3,000–$5,000</strong> / year on top of this base model.
      </p>
    </div>
  )
}

const SCHOLARSHIP_COMPARE = [
  { label: "HS development (4 yr)", short: "HS dev", amount: 89000, note: "~$70k–$108k range", fill: NAVY },
  { label: "Scholarship value (4 yr)", short: "Scholarship", amount: 68000, note: "~$17k/yr × 4", fill: "#1e4976" },
  { label: "Out-of-pocket after aid (4 yr)", short: "Out of pocket", amount: 104000, note: "Illustrative", fill: RED },
]

export function RealCostScholarshipRealityGraphic() {
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 border-b border-slate-200 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#003366]">The scholarship reality</p>
        <h4 className="text-lg font-bold text-slate-900">Four-year picture — development vs. aid vs. college bill</h4>
        <p className="mt-1 text-sm text-slate-600">
          Illustrative totals. Combined 9th-grade-through-graduation bill often lands around{" "}
          <strong>$180,000–$200,000</strong> in the article model.
        </p>
      </div>
      <div className="h-[260px] w-full sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={SCHOLARSHIP_COMPARE} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
            <XAxis dataKey="short" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Illustrative 4-yr total"]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={56}>
              {SCHOLARSHIP_COMPARE.map((entry) => (
                <Cell key={entry.short} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        Division I wrestling: equivalency sport — average award often cited around <strong>~40%</strong> of a full ride. Academic / need-based aid
        may apply separately.
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
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Hypothetical 529 illustration</p>
          <h4 className="text-lg font-bold text-slate-900">$370/mo from birth → age 18 @ ~10% avg. return</h4>
          <p className="text-sm text-slate-600">Not a guarantee — fees, glide paths, and actual returns vary.</p>
        </div>
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={FIVE_TWO_NINE} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
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
      <div className="mt-4 grid gap-2 rounded-lg bg-white/80 p-3 text-sm text-slate-700 ring-1 ring-slate-200 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-slate-500">Monthly</p>
          <p className="font-semibold text-[#003366]">$370</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Total contributed</p>
          <p className="font-semibold">$79,920</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Illustrative value at 18</p>
          <p className="font-semibold text-amber-900">$228,000+</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Tax-free gain in this illustration: roughly <strong>$148k+</strong> — talk to a licensed professional before acting.
      </p>
    </div>
  )
}

export function RealCostQuoteTilesGraphic() {
  const quotes = [
    {
      q: "I feel like I spend more.",
      sub: "Parent — after seeing the full line-item breakdown",
    },
    {
      q: "You're spending $120,000 of your life's work — not $80,000 after tax.",
      sub: "Tax reality (illustrative bracket math in the article)",
    },
    {
      q: "If college got the same urgency the tournament schedule did.",
      sub: "529 vs. high school wrestling cash flow",
    },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {quotes.map((item) => (
        <blockquote
          key={item.q}
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100"
        >
          <p className="text-base font-medium leading-snug text-slate-800">&ldquo;{item.q}&rdquo;</p>
          <footer className="mt-3 text-xs text-slate-500">{item.sub}</footer>
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
      <p className="mt-6 text-xs text-slate-300">EIN: 99-3757238 · NCUnitedWrestling.com</p>
    </div>
  )
}

export function RealCostSpartanCampaignGraphic() {
  const cols = [
    {
      title: "Race",
      body: "Register for a Spartan event at a discounted rate through NC United. Designate an athlete or the general training fund.",
    },
    {
      title: "Sponsor",
      body: "Tax-deductible gift to a specific wrestler — search their name at checkout; credits to their training and competition costs.",
    },
    {
      title: "Give",
      body: "Direct donation to the NC United training fund — supporting wrestlers statewide.",
    },
  ]
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {cols.map((c) => (
          <div
            key={c.title}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[#C20017]">{c.title}</p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-700">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border-2 border-amber-400/70 bg-gradient-to-r from-amber-50 to-amber-100/80 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">The math every athlete should run</p>
        <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
          10 donors × $155 = <span className="text-[#C20017]">$1,550</span>
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Toward that athlete&apos;s training fund — not overhead. Ten intentional asks; every gift tax-deductible to NC United.
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <a href="/spartan" className="font-semibold text-[#003366] underline underline-offset-2">
            recruitnc.com/spartan
          </a>
          <span aria-hidden>·</span>
          <span>EIN 99-3757238</span>
        </p>
      </div>
    </div>
  )
}
