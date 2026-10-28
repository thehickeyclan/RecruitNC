"use client"

/**
 * The coach product's screens for /for-coaches (Matt, 28 Oct 2026: "we are a product platform..
 * why not show it?"). Every wrestler, school, phone number and message here is invented; colleges
 * are real. The board is the real My Recruits component fed made-up rows; the rest are drawn in
 * the portal's own styles. Screenshotted by scripts/coach-screens.cjs into public/screens/.
 */
import { AlertTriangle, Bell, Check, FileText, Filter, Mail, MessageSquare, Search, Star, TrendingUp } from "lucide-react"
import { MyRecruitsBoard } from "@/components/my-recruits-board"
import type { MyRecruitRow } from "@/lib/my-recruits"

const LIME = "#A3E635"

type Seed = Partial<MyRecruitRow> & Pick<MyRecruitRow, "name" | "classYear" | "weight" | "highSchool" | "stage">
const row = (i: number, s: Seed): MyRecruitRow => ({
  athleteId: `demo-${i}`,
  photoUrl: null,
  club: null,
  rank: null,
  womensRank: false,
  state: "NC",
  stateFinish: null,
  nationalFinish: null,
  committedTo: null,
  committedToUs: false,
  committedAt: null,
  phone: null,
  gpa: null,
  interestedAt: null,
  contactOpens: null,
  graduated: false,
  starredAt: "2026-10-02T12:00:00Z",
  starredBy: "You",
  mine: true,
  lastContact: null,
  applied: { applied: false, date: null },
  hasReport: true,
  reportUnavailable: null,
  activity: { daysAgo: 4, label: "4 days ago", lastEvent: "Super 32 Challenge, Oct 24, 2026", flags: [] },
  ...s,
})

export const DEMO_RECRUITS: MyRecruitRow[] = [
  row(1, { name: "Cole Whitaker", classYear: 2027, weight: "157", highSchool: "Ridgeview", club: "Iron Pines WC", rank: 3, stateFinish: "NCHSAA 6A Champion ’26", nationalFinish: "Super 32 4th ’26 · NHSCA 3rd ’25", gpa: 3.82, phone: "(919) 555-0142", interestedAt: "2026-10-21T12:00:00Z", stage: "Recruiting", applied: { applied: true, date: "2026-07-14T12:00:00Z" }, lastContact: { type: "call", date: "2026-10-26T12:00:00Z", by: "You", followUp: "2026-11-02" } }),
  row(2, { name: "Mason Delgado", classYear: 2027, weight: "144", highSchool: "Harbor Point", club: "Coastal RTC", rank: 7, state: "SC", stateFinish: "SCHSL 5A Champion ’26", nationalFinish: "NHSCA 5th ’26", gpa: 3.4, phone: "(843) 555-0187", stage: "Contacted", lastContact: { type: "reply", date: "2026-10-27T12:00:00Z", by: "You", followUp: null } }),
  row(3, { name: "Tyler Brannon", classYear: 2027, weight: "175", highSchool: "Cedar Fork", club: "Blue Line Wrestling", rank: 12, stateFinish: "NCHSAA 7A 2nd ’26", gpa: 4.1, phone: "(704) 555-0119", stage: "Visited", applied: { applied: true, date: "2026-09-30T12:00:00Z" }, lastContact: { type: "visit", date: "2026-10-18T12:00:00Z", by: "Coach Reyes", followUp: "2026-10-25" } }),
  row(4, { name: "Evan Holloway", classYear: 2027, weight: "165", highSchool: "Pine Hollow", rank: 9, stateFinish: "NCHSAA 4A 3rd ’26", nationalFinish: "Super 32 7th ’26", gpa: 3.55, committedTo: "Appalachian State", committedAt: "2026-10-26", stage: "Offered", lastContact: { type: "text", date: "2026-10-12T12:00:00Z", by: "You", followUp: null } }),
  row(5, { name: "Jordan Pierce", classYear: 2028, weight: "132", highSchool: "Lakewood", club: "Iron Pines WC", rank: 5, stateFinish: "NCHSAA 6A Champion ’26", gpa: 3.9, phone: "(336) 555-0164", interestedAt: "2026-10-24T12:00:00Z", contactOpens: { date: "2027-04-01", label: "April 1, 2027" }, stage: "Prospect" }),
  row(6, { name: "Ava Sinclair", classYear: 2027, weight: "130", highSchool: "Northbrook", club: "Valor Girls WC", rank: 2, womensRank: true, stateFinish: "NCHSAA Girls 6A Champion ’26", nationalFinish: "Fargo 6th ’26", gpa: 4.3, phone: "(919) 555-0133", stage: "Recruiting", lastContact: { type: "message", date: "2026-10-25T12:00:00Z", by: "You", followUp: "2026-11-01" } }),
  row(7, { name: "Brody Kessler", classYear: 2027, weight: "190", highSchool: "Summit Ridge", state: "SC", stateFinish: "SCHSL 4A 2nd ’26", gpa: 3.2, phone: "(864) 555-0158", stage: "Contacted", activity: { daysAgo: 214, label: "214 days ago", lastEvent: "SCHSL State Championships, Feb 21, 2026", flags: ["Nothing since February"] }, lastContact: { type: "email", date: "2026-10-03T12:00:00Z", by: "Coach Reyes", followUp: null } }),
  row(8, { name: "Nate Caldwell", classYear: 2028, weight: "150", highSchool: "Riverside", rank: 14, stateFinish: "NCHSAA 5A 4th ’26", gpa: 3.7, stage: "Prospect", contactOpens: { date: "2027-04-01", label: "April 1, 2027" } }),
  row(9, { name: "Isaiah Grant", classYear: 2027, weight: "215", highSchool: "Westfield", rank: 6, stateFinish: "NCHSAA 7A Champion ’26", nationalFinish: "NHSCA 6th ’26", gpa: 3.35, phone: "(910) 555-0171", committedTo: "Campbell", committedToUs: false, stage: "Recruiting", applied: { applied: true, date: "2026-08-20T12:00:00Z" } }),
  row(10, { name: "Luke Ashford", classYear: 2027, weight: "126", highSchool: "Oak Valley", rank: 11, stateFinish: "NCHSAA 3A Champion ’26", gpa: 3.95, phone: "(828) 555-0126", stage: "Committed", committedTo: "Your program", committedToUs: true, lastContact: { type: "call", date: "2026-10-20T12:00:00Z", by: "You", followUp: null } }),
]

export function BoardScene() {
  return (
    <MyRecruitsBoard
      initialData={{
        recruits: DEMO_RECRUITS.filter((r) => r.athleteId !== "demo-9"),
        hasSchool: true,
        schoolId: "demo",
        hasStandard: true,
        fit: { "demo-1": { verdict: "meets", summary: "Meets every need" }, "demo-3": { verdict: "meets", summary: "Meets every need" }, "demo-5": { verdict: "possible", summary: "GPA not on file" } },
      }}
    />
  )
}

/* ------------------------------------------------------------------ shared bits */

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-white/10 bg-[#15243B] ${className}`}>{children}</div>
)
const Initials = ({ name, size = 44 }: { name: string; size?: number }) => (
  <span className="flex shrink-0 items-center justify-center rounded-full bg-white/10 font-bold text-white/70" style={{ width: size, height: size, fontSize: size / 3 }}>
    {name.split(" ").map((w) => w[0]).join("")}
  </span>
)
const Chip = ({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "lime" | "gold" | "red" | "green" }) => {
  const c = {
    plain: "border-white/15 text-white/75",
    lime: "border-[#A3E635]/50 bg-[#A3E635]/10 text-[#A3E635]",
    gold: "border-amber-300/40 bg-amber-300/10 text-amber-200",
    red: "border-red-400/40 bg-red-500/10 text-red-200",
    green: "border-emerald-300/40 bg-emerald-400/10 text-emerald-200",
  }[tone]
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${c}`}>{children}</span>
}
const Title = ({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) => (
  <div className="mb-5">
    <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: LIME }}>{kicker}</p>
    <h1 className="mt-1 text-3xl font-black tracking-tight">{title}</h1>
    {sub ? <p className="mt-1 text-sm text-white/60">{sub}</p> : null}
  </div>
)

/* ------------------------------------------------------------------ compare */

export function CompareScene() {
  const L = { name: "Cole Whitaker", meta: "2027 · 157 lbs · Ridgeview (NC)", rank: "#3", cred: ["NCHSAA 6A Champion ’26", "Super 32 4th ’26"] }
  const R = { name: "Mason Delgado", meta: "2027 · 157 lbs · Harbor Point (SC)", rank: "#7", cred: ["SCHSL 5A Champion ’26", "NHSCA 5th ’26"] }
  const lines: Array<[string, string, string, "L" | "R" | null]> = [
    ["Record, last 12 months", "41–5", "36–7", "L"],
    ["Wins over state placers", "14", "9", "L"],
    ["Wins over nationally ranked", "3", "1", "L"],
    ["Bonus-point rate", "68%", "74%", "R"],
    ["Strength of schedule", "Top 8%", "Top 15%", "L"],
    ["GPA", "3.82", "3.40", "L"],
  ]
  const common: Array<[string, string, string]> = [
    ["Drew Patton · NHSCA AA", "W 6–2", "L 3–4"],
    ["Sam Ortega · SC champion", "W Fall 3:12", "W 8–1"],
    ["Kyle Bennett · #11 nationally", "L 2–3 SV", "L 0–5"],
    ["Ryan Cho · NC 3rd", "W 11–2", "W 9–4"],
  ]
  return (
    <div className="mx-auto max-w-[1180px]">
      <Title kicker="Compare" title="Cole Whitaker vs Mason Delgado" sub="Last 12 months · head to head, common opponents and strength of schedule" />
      <div className="grid grid-cols-2 gap-4">
        {[L, R].map((w, i) => (
          <Card key={w.name} className="flex items-center gap-4 p-5">
            <Initials name={w.name} size={60} />
            <div>
              <p className="text-xl font-black">{w.name} <span className="ml-1 rounded bg-[#A3E635]/15 px-1.5 py-px text-sm font-bold text-[#A3E635]">{w.rank}</span></p>
              <p className="text-sm text-white/60">{w.meta}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{w.cred.map((c) => <Chip key={c} tone={i ? "plain" : "plain"}>{c}</Chip>)}</div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-4 border-[#A3E635]/40 p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Head to head</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-2xl font-black">Whitaker leads <span style={{ color: LIME }}>2–1</span></p>
          <div className="space-y-1 text-right text-sm text-white/75">
            <p><b className="text-white">W 5–3</b> · Super 32 quarterfinal · Oct 2026</p>
            <p><b className="text-white">L 2–4</b> · Southeast Regionals · May 2026</p>
            <p><b className="text-white">W 7–2</b> · Journeymen Fall Classic · Nov 2025</p>
          </div>
        </div>
      </Card>
      <div className="mt-4 grid grid-cols-[1.25fr_1fr] gap-4">
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">The numbers</p>
          <table className="mt-2 w-full text-sm">
            <tbody className="divide-y divide-white/10">
              {lines.map(([label, a, b, edge]) => (
                <tr key={label}>
                  <td className={`py-2.5 text-left text-base font-bold ${edge === "L" ? "text-[#A3E635]" : "text-white/85"}`}>{a}</td>
                  <td className="py-2.5 text-center text-white/55">{label}</td>
                  <td className={`py-2.5 text-right text-base font-bold ${edge === "R" ? "text-[#A3E635]" : "text-white/85"}`}>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Common opponents</p>
          <div className="mt-2 divide-y divide-white/10 text-sm">
            {common.map(([opp, a, b]) => (
              <div key={opp} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2.5">
                <span className="text-white/80">{opp}</span>
                <span className={a.startsWith("W") ? "font-bold text-emerald-300" : "font-bold text-red-300"}>{a}</span>
                <span className={b.startsWith("W") ? "font-bold text-emerald-300" : "font-bold text-red-300"}>{b}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ scouting report */

export function ReportScene() {
  const wins: Array<[string, string[], string, string]> = [
    ["Kyle Bennett", ["#11 nationally", "Fargo All-American"], "Dec 4–2", "Super 32 · Oct 2026"],
    ["Drew Patton", ["NHSCA All-American", "VA state champion"], "Dec 6–2", "Super 32 · Oct 2026"],
    ["Sam Ortega", ["SC state champion"], "Fall 3:12", "Southeast Regionals · May 2026"],
    ["Ryan Cho", ["NC state 3rd"], "Major 11–2", "NCHSAA States · Feb 2026"],
  ]
  return (
    <div className="mx-auto max-w-[1100px]">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-5 border-b border-white/10 bg-gradient-to-r from-[#1b2d49] to-[#15243B] p-6">
          <Initials name="Cole Whitaker" size={72} />
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: LIME }}>Scouting report</p>
            <p className="text-3xl font-black">Cole Whitaker</p>
            <p className="text-sm text-white/60">Class of 2027 · 157 lbs · Ridgeview (NC) · Iron Pines WC</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[["41–5", "Last 12 months"], ["68%", "Bonus rate"], ["#3", "Class rank"]].map(([n, l]) => (
              <div key={l} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                <p className="text-2xl font-black" style={{ color: LIME }}>{n}</p>
                <p className="text-[11px] text-white/55">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 p-6 pb-2">
          {[["State Champion", "NCHSAA 6A · ’26"], ["Super 32 4th", "Greensboro · ’26"], ["NHSCA All-American", "3rd · ’25"]].map(([t, s]) => (
            <div key={t} className="rounded-xl border border-[#A3E635]/40 bg-[#A3E635]/[0.07] p-3">
              <p className="font-black">{t}</p>
              <p className="text-xs text-white/60">{s}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[1.4fr_1fr] gap-5 p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Wins that matter · every opponent's résumé</p>
            <div className="mt-2 divide-y divide-white/10">
              {wins.map(([opp, creds, res, ev]) => (
                <div key={opp} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-bold">{opp}</p>
                    <div className="mt-1 flex flex-wrap gap-1">{creds.map((c) => <Chip key={c} tone="gold">{c}</Chip>)}</div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-300">W {res}</p>
                    <p className="text-xs text-white/50">{ev}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Losses</p>
            <div className="mt-2 divide-y divide-white/10">
              {[["Luis Ferreira", "#4 nationally", "L 2–3 SV", "Super 32 semifinal"], ["Mason Delgado", "SC state champion", "L 2–4", "Southeast Regionals"]].map(([o, c, r, e]) => (
                <div key={o} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold">{o}</p>
                    <Chip tone="gold">{c}</Chip>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-red-300">{r}</p>
                    <p className="text-xs text-white/50">{e}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Academics &amp; contact</p>
              <p className="mt-1">GPA <b className="text-white">3.82</b> · (919) 555-0142</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ athletes */

export function AthletesScene() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <Title kicker="Athletes" title="Every wrestler in the current classes" sub="Results from the brackets · weight they last competed at" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white/40"><Search className="h-4 w-4" /> Search name, school or club</div>
        {["Class of 2027", "157 lbs", "NC + SC", "Uncommitted", "State placers"].map((f) => (
          <span key={f} className="inline-flex items-center gap-1 rounded-full border border-[#A3E635]/50 bg-[#A3E635]/10 px-3 py-1.5 text-xs font-semibold text-[#A3E635]"><Filter className="h-3 w-3" />{f}</span>
        ))}
      </div>
      <Card className="divide-y divide-white/10">
        {DEMO_RECRUITS.slice(0, 7).map((r, i) => (
          <div key={r.athleteId} className="grid grid-cols-[auto_1.4fr_0.6fr_1.4fr_0.8fr_auto] items-center gap-4 px-5 py-3.5">
            <Initials name={r.name} />
            <div>
              <p className="font-bold">{r.name} <span className="ml-1 rounded border border-white/25 px-1 text-[10px] font-bold text-white/70">{r.state}</span></p>
              <p className="text-xs text-white/55">{r.highSchool}{r.club ? ` · ${r.club}` : ""}</p>
            </div>
            <p className="text-sm text-white/80">{r.classYear} · {r.weight}</p>
            <div className="text-xs">
              {r.rank ? <span className="mr-1.5 rounded bg-[#A3E635]/15 px-1.5 py-px font-bold text-[#A3E635]">{r.womensRank ? "W " : ""}#{r.rank}</span> : null}
              <span className="text-white/85">{r.stateFinish}</span>
            </div>
            <p className="text-xs text-white/60">{r.committedTo ? <span className="text-amber-200">Committed</span> : "Uncommitted"}</p>
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${i < 3 ? "border-[#A3E635] bg-[#A3E635]/15" : "border-white/20"}`}>
              <Star className={`h-4 w-4 ${i < 3 ? "fill-[#A3E635] text-[#A3E635]" : "text-white/50"}`} />
            </span>
          </div>
        ))}
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ commitments */

export function CommitmentsScene() {
  const rows: Array<[string, string, string, string, string, string]> = [
    ["Evan Holloway", "Pine Hollow (NC)", "Appalachian State", "D1", "2027 · 165", "Oct 26"],
    ["Isaiah Grant", "Westfield (NC)", "Campbell", "D1", "2027 · 215", "Oct 22"],
    ["Carter Lyons", "Bay Creek (SC)", "Pfeiffer", "D2", "2027 · 144", "Oct 19"],
    ["Owen Marsh", "Hillcrest (NC)", "Ferrum", "D3", "2027 · 174", "Oct 15"],
    ["Ava Sinclair", "Northbrook (NC)", "Lindsey Wilson", "NAIA", "2027 · 130", "Oct 11"],
    ["Gavin Ruiz", "Stone Creek (SC)", "Limestone", "D2", "2027 · 197", "Oct 6"],
  ]
  const tone: Record<string, string> = { D1: "bg-sky-400/15 text-sky-200", D2: "bg-violet-400/15 text-violet-200", D3: "bg-emerald-400/15 text-emerald-200", NAIA: "bg-amber-400/15 text-amber-200" }
  return (
    <div className="mx-auto max-w-[1180px]">
      <Title kicker="College commitments" title="Who committed where, as it happens" sub="Every division · reported by families, confirmed by us" />
      <div className="mb-4 grid grid-cols-5 gap-3">
        {[["168", "All"], ["41", "D1"], ["62", "D2"], ["40", "D3"], ["14", "NAIA"]].map(([n, l], i) => (
          <Card key={l} className={`p-4 ${i === 0 ? "border-[#A3E635]/60" : ""}`}>
            <p className="text-3xl font-black" style={i === 0 ? { color: LIME } : undefined}>{n}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">{l}</p>
          </Card>
        ))}
      </div>
      <Card className="divide-y divide-white/10">
        {rows.map(([n, s, c, d, cw, when]) => (
          <div key={n} className="grid grid-cols-[1.3fr_1.2fr_auto_0.7fr_0.5fr] items-center gap-4 px-5 py-3.5 text-sm">
            <div className="flex items-center gap-3"><Initials name={n} size={36} /><div><p className="font-bold">{n}</p><p className="text-xs text-white/50">{s}</p></div></div>
            <p className="font-semibold">{c}</p>
            <span className={`rounded px-2 py-0.5 text-xs font-bold ${tone[d]}`}>{d}</span>
            <p className="text-white/70">{cw}</p>
            <p className="text-right text-white/50">{when}</p>
          </div>
        ))}
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ messages */

export function MessagesScene() {
  const threads: Array<[string, string, boolean]> = [
    ["Cole Whitaker", "Thanks Coach, we'd love to set up a visit…", true],
    ["Mason Delgado", "You: Great win at Super 32. Can we talk Tuesday?", false],
    ["Ava Sinclair", "Her mom: She's taking the SAT Nov 8.", true],
    ["Tyler Brannon", "You: Sending the camp dates now.", false],
  ]
  return (
    <div className="mx-auto grid max-w-[1180px] grid-cols-[340px_1fr] gap-4">
      <Card className="overflow-hidden">
        <p className="border-b border-white/10 px-4 py-3 font-black">Messages</p>
        {threads.map(([n, last, unread], i) => (
          <div key={n} className={`flex items-center gap-3 border-b border-white/10 px-4 py-3 ${i === 0 ? "bg-[#A3E635]/[0.07]" : ""}`}>
            <Initials name={n} size={38} />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{n}</p>
              <p className="truncate text-xs text-white/55">{last}</p>
            </div>
            {unread ? <span className="h-2.5 w-2.5 rounded-full" style={{ background: LIME }} /> : null}
          </div>
        ))}
      </Card>
      <Card className="flex flex-col p-0">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
          <Initials name="Cole Whitaker" size={38} />
          <div className="flex-1">
            <p className="font-bold">Cole Whitaker</p>
            <p className="text-xs text-white/50">2027 · 157 · Ridgeview · parents Dana &amp; Mike Whitaker see every message</p>
          </div>
          <Chip tone="lime">On your board · Recruiting</Chip>
        </div>
        <div className="flex-1 space-y-3 p-5 text-sm">
          <div className="ml-auto max-w-[70%] rounded-2xl rounded-br-sm bg-[#A3E635] px-4 py-2.5 font-medium text-[#0B1426]">
            Cole, great quarterfinal win at Super 32. We'd like to get you on campus this fall. What weekends work for your family?
            <p className="mt-1 text-[10px] font-semibold opacity-60">You · Oct 25</p>
          </div>
          <div className="max-w-[70%] rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2.5">
            Thanks Coach! We'd love to set up a visit. November 8th or 15th both work for us.
            <p className="mt-1 text-[10px] text-white/45">Cole · Oct 26</p>
          </div>
          <div className="max-w-[70%] rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2.5">
            The 15th is best if you can do a Saturday. He'll bring his transcript.
            <p className="mt-1 text-[10px] text-white/45">Dana Whitaker (parent) · Oct 26</p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 p-4">
          <div className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white/40">Write to Cole and his parents…</div>
          <span className="rounded-xl px-4 py-2.5 text-sm font-black text-[#0B1426]" style={{ background: LIME }}>Send</span>
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ alerts */

export function AlertsScene() {
  const bell: Array<[string, string, boolean]> = [
    ["Your Super 32 2026 men's report is ready", "Oct 25", true],
    ["South Carolina Class of 2027 men's rankings published", "Oct 24", true],
    ["Super 32 2026: North Carolina Boys Recap", "Oct 26", false],
  ]
  return (
    <div className="mx-auto grid max-w-[1180px] grid-cols-[1.35fr_1fr] gap-4">
      <div className="space-y-3">
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-red-200"><AlertTriangle className="h-4 w-4" /> A recruit on your board committed elsewhere</p>
          <p className="mt-2 text-sm text-white/85"><b>Evan Holloway</b> committed to <b className="text-red-200">Appalachian State</b> <span className="text-white/50">· Oct 26</span></p>
        </div>
        <Card className="p-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/50"><Bell className="h-3.5 w-3.5" style={{ color: LIME }} /> Alerts on your recruits</p>
          <div className="mt-2 divide-y divide-white/10 text-sm">
            {[
              ["Cole Whitaker", "placed 4th at Super 32", "Oct 25"],
              ["Jordan Pierce", "marked interest in your program", "Oct 24"],
              ["Mason Delgado", "entered the Journeymen Fall Classic", "Nov 8–9"],
              ["Brody Kessler", "has not competed since February", ""],
            ].map(([n, what, when]) => (
              <div key={n} className="flex items-center justify-between py-2.5">
                <p><b>{n}</b> <span className="text-white/75">{what}</span></p>
                <span className="text-xs text-white/45">{when}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/50"><MessageSquare className="h-3.5 w-3.5" style={{ color: LIME }} /> Messages to answer</p>
          <p className="mt-2 text-sm"><b>Cole Whitaker</b> <span className="text-white/75">We'd love to set up a visit…</span> <span className="float-right text-[10px] font-bold uppercase tracking-wider text-white/45">Your turn</span></p>
        </Card>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-end gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/10"><Bell className="h-5 w-5" /><span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold">2</span></span>
        </div>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5"><span className="text-sm font-bold">Notifications</span><span className="text-xs text-white/50">Mark all read</span></div>
          {bell.map(([t, d, unread]) => (
            <div key={t} className={`border-b border-white/10 px-4 py-3 last:border-0 ${unread ? "bg-white/[0.04]" : ""}`}>
              <p className="text-sm font-semibold">{t}</p>
              <p className="mt-0.5 text-xs text-white/45">{d}</p>
            </div>
          ))}
        </Card>
        <Card className="mt-3 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Menu</p>
          <div className="mt-2 space-y-1.5 text-sm">
            {[["Reports", "2"], ["Messages", "1"], ["Interested", "3"], ["Men's Rankings", "NEW"]].map(([l, b]) => (
              <div key={l} className="flex items-center justify-between rounded-md px-2 py-1.5 text-white/80">
                <span className="flex items-center gap-2">{l === "Reports" ? <FileText className="h-4 w-4" /> : l === "Messages" ? <Mail className="h-4 w-4" /> : l === "Interested" ? <Check className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}{l}</span>
                <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{b}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export const SCENES = {
  board: BoardScene,
  compare: CompareScene,
  report: ReportScene,
  athletes: AthletesScene,
  commitments: CommitmentsScene,
  messages: MessagesScene,
  alerts: AlertsScene,
} as const

export function Scene({ shot }: { shot: string }) {
  const S = SCENES[shot as keyof typeof SCENES] ?? BoardScene
  return <S />
}

