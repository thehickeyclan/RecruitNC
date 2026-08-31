import type { Metadata } from "next"

/**
 * The weekend run sheet, for the crew.
 *
 * Deliberately not in the public route list, so it sits behind the sign-in every volunteer
 * already has. It is not linked from anywhere either — the link is passed to the people who
 * need it, and nothing on the site leads a spectator to it.
 *
 * Times are given for both fields because 184 lbs may or may not fill, and one sheet that covers
 * both is better than two sheets where somebody reads the wrong one.
 */

export const metadata: Metadata = {
  title: "TOC Weekend Run Sheet",
  description: "Friday and Saturday running order for the Tournament of Champions.",
  robots: { index: false, follow: false },
}

type Row = { a: string; b?: string; what: string; detail?: string; kind?: "prep" | "beat" | "finish" }

const FRIDAY: Row[] = [
  { a: "10:00 AM", what: "Venue open for setup — unlock doors, direct vendors to booths", kind: "prep" },
  { a: "10:15 AM", what: "Group meeting and walk-through", detail: "All hands", kind: "prep" },
  { a: "10:30 AM", what: "Breakout group meetings", detail: "Team leaders, assigned areas", kind: "prep" },
  { a: "10:45 AM", what: "Mats into the facility — wrestling mat setup begins", kind: "prep" },
  { a: "11:00 AM", what: "VIP parking, food concessions, gear sale and coaches lounge setup", kind: "prep" },
  { a: "12:00 PM", what: "Scales in place and checked", detail: "Plugged in, on, set to 0.0 — checked against the official scale", kind: "prep" },
  { a: "12:00 PM", what: "Tournament dry run — first pass", kind: "prep" },
  { a: "1:00 PM", what: "PA and production setup · security team meeting and setup", kind: "prep" },
  { a: "2:00 PM", what: "Tournament dry run — second pass", kind: "prep" },
  { a: "2:45 PM", what: "Security team in place", detail: "Ticket entry and band checks", kind: "prep" },
  { a: "3:00 PM", what: "Doors open to coaches and athletes", kind: "prep" },
  { a: "3:45 PM", what: "Ticket sales open · doors open to spectators", kind: "prep" },
  { a: "4:00 – 5:00 PM", what: "Weigh-in and skin check", detail: "One official weigh-in. Invited wrestlers only — there is no Saturday weigh-in.", kind: "beat" },
  { a: "5:00 PM", what: "Meeting with athletes", kind: "prep" },
  { a: "5:15 PM", what: "Mats open for warm-ups", kind: "prep" },
  { a: "5:25 PM", what: "Wrestlers clear the mats · table workers report", kind: "prep" },
  { a: "5:30 PM", what: "Welcome — Jason Gore", kind: "beat" },
  { a: "5:35 PM", what: "Prayer — Jason Gore", kind: "beat" },
  { a: "5:40 PM", what: "National anthem — to be named", kind: "beat" },
  { a: "5:45 PM", what: "Athlete walkout", detail: "Fifteen minutes for roughly 80 wrestlers — by weight class, announced as a group, or it will not hold.", kind: "beat" },
  { a: "6:00 PM", what: "First whistle — 133 lbs pigtail", detail: "Run first so its winner has the whole session before he wrestles again." },
  { a: "6:08 PM", what: "Round 1 — all brackets, two mats", detail: "Four bouts per weight. 133 lbs goes last, giving its pigtail winner the longest rest." },
  { a: "8:38 PM", b: "8:52 PM", what: "Mats clear", kind: "finish" },
  { a: "9:00 PM", b: "9:15 PM", what: "Spectators and athletes exit · clean-up", kind: "prep" },
]

const SATURDAY: Row[] = [
  { a: "6:00 AM", what: "Venue open for setup", kind: "prep" },
  { a: "7:30 AM", what: "Athletes in · mats open for warm-ups", kind: "prep" },
  { a: "8:30 AM", what: "Doors open to spectators", kind: "prep" },
  { a: "8:45 AM", what: "Wrestlers clear the mats", kind: "prep" },
  { a: "9:00 AM", what: "Welcome and prayer — Jason Gore", detail: "No anthem this morning. It is held for the finals, when the building is full.", kind: "beat" },
  { a: "9:30 – 10:45 AM", b: "9:30 – 10:52 AM", what: "Consolation round 1 · two mats", detail: "Friday's first-round losers. 20 bouts, or 22 with 184." },
  { a: "10:45 – 12:00 PM", b: "10:52 – 12:15 PM", what: "Winners semifinals · two mats", detail: "20 bouts, or 22 with 184." },
  { a: "12:00 – 1:15 PM", b: "12:15 – 1:38 PM", what: "Consolation semifinals · two mats", detail: "Cannot start until both blocks above finish — it needs the semifinal losers." },
  { a: "1:15 – 1:52 PM", b: "1:38 – 2:22 PM", what: "Third place · two mats", detail: "One per weight, and the last medal — TOC places the top three." },
  { a: "1:52 PM", b: "2:22 PM", what: "Mat changeover to one — runs underneath the Giving Hour, since the raffle needs no mat", kind: "prep" },
  { a: "2:00 – 3:00 PM", b: "2:30 – 3:30 PM", what: "The Giving Hour — Jason Gore MC", detail: "Free raffle tickets for every paid spectator. Gore thanks every vendor and sponsor, then draws a winner for each in turn. The Caden Perry Warrior Scholarship and the guest speaker sit inside this hour.", kind: "beat" },
  { a: "3:00 – 3:14 PM", b: "3:30 – 3:44 PM", what: "Parade of finalists and introductions", detail: "All finalists walk out together and are announced by weight.", kind: "beat" },
  { a: "3:14 – 3:20 PM", b: "3:44 – 3:50 PM", what: "National anthem — to be named", detail: "Held for this moment rather than the morning: full house, finalists already on the mat.", kind: "beat" },
  { a: "3:20 – 5:40 PM", b: "3:50 – 6:24 PM", what: "Championship finals, awards after each weight · one mat", detail: "Ryan Mitchell, The NC Mat, announcing. Each finalist by name, club, who they are coached by, top accolades and college commitment. About 14 minutes a weight: announcements and walkouts, a 6 minute bout, then medal, bracket and jacket to the champion, medals to second and third, all three placers on the mat for the photograph." },
  { a: "5:40 – 5:52 PM", b: "6:24 – 6:36 PM", what: "Most Outstanding Wrestler and Match of Champions hammers", detail: "Tournament-wide awards, presented last.", kind: "beat" },
  { a: "5:52 PM", b: "6:36 PM", what: "Event concludes", kind: "finish" },
  { a: "5:55 – 7:00 PM", b: "6:40 – 7:45 PM", what: "Clean-up and mat roll-up", detail: "Allow a full hour with a decent crew.", kind: "prep" },
]

const VENDORS: { name: string; gift: string | null }[] = [
  { name: "adidas Wrestling", gift: "Headgear and backpacks" },
  { name: "Pathos", gift: "Socks for every Giving Hour winner" },
  { name: "Wegmans", gift: "Gift cards toward food and drink" },
  { name: "Costco Wholesale", gift: "Gift cards toward food and drink" },
  { name: "Food Lion", gift: "Gift cards toward food and drink" },
  { name: "Cove", gift: "Twelve cases of probiotic soda" },
  { name: "The Guild", gift: null },
  { name: "Cronin Customs", gift: null },
  { name: "Funky Flickr Boyz", gift: null },
  { name: "Wrestling Mindset", gift: null },
  { name: "Triangle Wrestling Academy", gift: null },
  { name: "V1G1L Wrestling", gift: null },
]

const NOTES = [
  "7½ minutes per bout — six minutes of mat time plus ninety seconds to change wrestlers. Justin's timeline allows 6:30 to 9:00 for the same Friday round; the arithmetic gives 2 hours 37 minutes, so the two agree within seven minutes.",
  "Fourteen minutes per championship weight — six minutes of wrestling, three for announcements and walkouts, then the presentation. Awarding at the mat rather than banking to the end costs about ten minutes across the afternoon and gives every weight its moment in front of a full house.",
  "Stage the next weight while the last is being photographed, or the presentation time is paid twice. Put someone on runner duty for medals, brackets and jackets.",
  "Clubs, never schools. Wrestlers are announced and printed by club and class year only — unaffiliated where there is no club — for NCHSAA compliance. This holds on the microphone, on the brackets and in any printed programme.",
  "The raffle and the scholarship are not capped. The $250 state limit applies to prizes won by performance; both of these are random awards. The cap still governs anything awarded for placing.",
  "The hard ceiling is 7:00 PM, with clean-up in the hour after. Ten weights cannot break it. The only exposure is 184 filling and bouts running to nine minutes — then trim the Giving Hour to 45 minutes and start at 9:00.",
]

function DayTable({ title, note, rows }: { title: string; note: string; rows: Row[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <span className="text-sm text-white/50">{note}</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0f1c2e]">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr>
              <th className="border-b border-white/15 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#D3B574]">
                10 weights
              </th>
              <th className="border-b border-white/15 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#E08C6E]">
                11 weights
              </th>
              <th className="border-b border-white/15 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/45">
                Item
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.a + row.what}
                className={
                  row.kind === "finish"
                    ? "bg-[#D3B574]/15"
                    : row.kind === "beat"
                      ? "bg-[#D3B574]/[0.07]"
                      : undefined
                }
              >
                <td className="whitespace-nowrap border-b border-white/5 px-4 py-2.5 align-baseline text-sm font-semibold tabular-nums text-white">
                  {row.a}
                </td>
                <td className="whitespace-nowrap border-b border-white/5 px-4 py-2.5 align-baseline text-sm font-semibold tabular-nums text-[#E08C6E]">
                  {row.b ?? row.a}
                </td>
                <td className="border-b border-white/5 px-4 py-2.5 align-baseline text-sm">
                  <span className={row.kind === "prep" ? "text-white/70" : "font-medium text-white"}>{row.what}</span>
                  {row.detail ? <span className="mt-1 block text-[13px] text-white/45">{row.detail}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function RunSheetPage() {
  return (
    <main className="admin-dark-page min-h-screen bg-[#0A1628] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D3B574]">
            NC United · Tournament of Champions
          </p>
          <h1 className="text-4xl font-extrabold leading-none">Weekend Run Sheet</h1>
          <p className="max-w-2xl text-sm text-white/55">
            18–19 September 2026 · Hope Community Church, Apex. Two mats both days, one mat for
            championship finals. Build-up from Justin Perry&rsquo;s timeline; bout timing calculated from
            the brackets. Welcome and prayer by Jason Gore; anthem to be named; finals announced by
            Ryan Mitchell of The NC Mat.
          </p>
          <p className="text-sm text-white/40">
            Times are given for both fields, since 184 lbs is not yet filled — 121 bouts at ten
            weights, 133 at eleven.
          </p>
        </header>

        <DayTable title="Friday 18 September" note="Build-up, weigh-in, pigtail and first round · 41 or 45 bouts" rows={FRIDAY} />
        <DayTable title="Saturday 19 September" note="Placement, the Giving Hour, then finals · 80 or 88 bouts" rows={SATURDAY} />

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-xl font-bold">The Giving Hour — vendors and prizes</h2>
            <span className="text-sm text-white/50">Read order for Jason Gore · one winner drawn per vendor</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0f1c2e]">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-white/15 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/45">Vendor</th>
                  <th className="border-b border-white/15 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/45">Giving away</th>
                  <th className="border-b border-white/15 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/45">One line about them</th>
                </tr>
              </thead>
              <tbody>
                {VENDORS.map((vendor) => (
                  <tr key={vendor.name}>
                    <td className="border-b border-white/5 px-4 py-2.5 align-baseline text-sm font-medium">{vendor.name}</td>
                    <td className="border-b border-white/5 px-4 py-2.5 align-baseline text-sm">
                      {vendor.gift ?? <span className="italic text-[#E08C6E]">To confirm</span>}
                    </td>
                    <td className="border-b border-white/5 px-4 py-2.5 align-baseline text-sm italic text-[#E08C6E]">To write</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="max-w-3xl text-sm text-white/50">
            Thanked but not drawn for: <b className="text-white/80">Farina</b>,{" "}
            <b className="text-white/80">New York Bagel &amp; Deli</b> and{" "}
            <b className="text-white/80">Chad Richards State Farm</b> (VIP lounge food),{" "}
            <b className="text-white/80">Defense Soap</b> (mat and athlete supplies),{" "}
            <b className="text-white/80">Submission Solutions</b>, and{" "}
            <b className="text-white/80">the Hickey family</b>, whose two Resilite mats are a $24,000
            gift and the mats the tournament is wrestled on.
          </p>
        </section>

        <section className="flex flex-col gap-3 border-t-2 border-white/15 pt-6">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-white/45">What these times rest on</h3>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {NOTES.map((note) => (
              <li key={note.slice(0, 40)} className="max-w-4xl text-sm text-white/70">
                {note}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
