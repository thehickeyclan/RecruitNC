import type { ReactNode } from "react"
import type { FundraisingAthleteIndexRow } from "@/lib/fundraising/athlete-fundraising-profiles"
import { HardLink } from "@/components/hard-link"
import { PlaybookFundraisingRequestSection } from "./playbook-fundraising-request-section"

export type PlaybookMembersContentProps = {
  fundraisingDirectoryRows?: FundraisingAthleteIndexRow[]
  activationStatusBySlug?: Record<string, string>
}

function DH({ as: Tag = "h2", children }: { as?: "h1" | "h2" | "h3"; children: ReactNode }) {
  const base =
    Tag === "h1"
      ? "text-[clamp(1.65rem,4.2vw,2.35rem)] font-black uppercase leading-[1.08] tracking-tight"
      : Tag === "h2"
        ? "mt-14 scroll-mt-28 text-xl font-black uppercase leading-snug tracking-tight first:mt-0 sm:text-[1.55rem]"
        : "mt-10 text-base font-bold uppercase tracking-wide text-[#C8A94A] sm:text-lg"
  return <Tag className={`font-[family-name:var(--font-fundraising-display)] text-white ${base}`}>{children}</Tag>
}

function SH({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 font-[family-name:var(--font-fundraising-display)] text-[clamp(1rem,2.6vw,1.15rem)] font-semibold uppercase leading-snug tracking-wide text-white/88">
      {children}
    </p>
  )
}

function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-lg font-medium leading-relaxed text-white/90">{children}</p>
}

function P({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mt-4 text-base leading-relaxed text-white/82 ${className}`}>{children}</p>
}

function Ul({ children }: { children: ReactNode }) {
  return <ul className="mt-4 list-disc space-y-2 pl-5 text-white/82 marker:text-[#C8A94A]">{children}</ul>
}

function Li({ children }: { children: ReactNode }) {
  return <li className="leading-relaxed">{children}</li>
}

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-white/95">{children}</strong>
}

function Rule() {
  return <hr className="my-12 border-white/[0.12]" />
}

function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[min(100%,520px)] border-collapse text-left text-sm text-white/85">{children}</table>
    </div>
  )
}

export function PlaybookMembersContent({
  fundraisingDirectoryRows = [],
  activationStatusBySlug = {},
}: PlaybookMembersContentProps = {}) {
  const showFundraisingRequest = fundraisingDirectoryRows.length > 0

  return (
    <article className="mx-auto max-w-3xl overflow-x-hidden px-4 pb-24 pt-8">
      <p className="font-[family-name:var(--font-fundraising-display)] text-[11px] font-bold uppercase tracking-[0.28em] text-[#C8A94A]">
        Members playbook
      </p>
      <DH as="h1">The NC United Fundraising Playbook</DH>
      <SH>Built from how NC wrestling families raised $21,000+ in 16 days</SH>
      <p className="mt-4 text-sm italic leading-relaxed text-white/55">
        NC United Wrestling · 501(c)(3) nonprofit · EIN: <span className="tabular-nums not-italic">99-3757238</span>
      </p>

      {showFundraisingRequest ? (
        <p className="mt-3">
          <HardLink
            href="#fundraising-page-request"
            className="text-sm font-bold uppercase tracking-[0.14em] text-[#C8A94A] underline-offset-4 hover:underline"
          >
            Jump to: request gift-page access →
          </HardLink>
        </p>
      ) : null}

      <Rule />

      <DH as="h2">Before you post that Venmo or Cash App link</DH>
      <P>
        If you are raising money for your athlete through Venmo, Cash App, GoFundMe, or informal social posts — read this first.
      </P>
      <P>
        You are leaving real money on the table. Your donors are not getting the tax benefit they deserve. Businesses and foundations cannot give.
        Employer matching does not apply. And serious donors hesitate without a formal receipt.
      </P>
      <P>
        NC United is a registered 501(c)(3). The system is already built. Getting set up takes 10 minutes.
      </P>
      <p className="mt-6">
        <Strong>Get set up → </Strong>
        <HardLink href="/fundraising/athletes" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
          /fundraising/athletes
        </HardLink>
      </p>

      <Rule />

      <DH as="h2">This is already working</DH>
      <Lead>This is not theory. NC United wrestling families ran this playbook and here is what happened:</Lead>

      <DataTable>
        <thead>
          <tr className="border-b border-white/15 bg-[#0B2545]/90">
            {["$21,000+", "220+", "30", "16"].map((h) => (
              <th
                key={h}
                className="px-3 py-3 text-center font-[family-name:var(--font-fundraising-display)] text-lg font-black tabular-nums text-[#C8A94A] sm:text-xl"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="bg-black/15">
            {["Raised", "Donations", "Athletes funded", "Days"].map((l) => (
              <td key={l} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-white/65 sm:text-xs">
                {l}
              </td>
            ))}
          </tr>
        </tbody>
      </DataTable>

      <P>
        The NC United × Spartan Race campaign blew past a $10,000 goal in under two weeks — with zero advance preparation. Individual families, local
        businesses, a foundation, athletes supporting athletes, and anonymous major donors all gave through one trusted nonprofit checkout.
      </P>
      <P>Every principle in this guide showed up in that data.</P>

      <Rule />

      <DH as="h2">What doesn&apos;t work — and what it costs you</DH>
      <P>These are the patterns costing NC athletes thousands of dollars every season.</P>
      <p className="mt-6 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.18em] text-[#C8A94A]">
        The real number
      </p>

      <DataTable>
        <thead>
          <tr className="border-b border-white/15 bg-[#0B2545]/90">
            <th className="px-3 py-3 font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-wide text-white/55">
              <span className="sr-only">Scenario</span>
            </th>
            <th className="px-3 py-3 font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-wide">
              Venmo / GoFundMe / Personal
            </th>
            <th className="px-3 py-3 font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">
              NC United 501(c)(3)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          <tr className="bg-black/15">
            <td className="px-3 py-2.5 align-top font-medium text-white/90">10 donors × $200</td>
            <td className="px-3 py-2.5 align-top">$2,000 raised</td>
            <td className="px-3 py-2.5 align-top text-[#C8A94A]/95">$2,000 raised</td>
          </tr>
          <tr className="bg-black/10">
            <td className="px-3 py-2.5 align-top">Tax deduction for donors</td>
            <td className="px-3 py-2.5 align-top text-white/50">❌</td>
            <td className="px-3 py-2.5 align-top text-emerald-300/95">✅</td>
          </tr>
          <tr className="bg-black/15">
            <td className="px-3 py-2.5 align-top">Employer matching</td>
            <td className="px-3 py-2.5 align-top text-white/50">❌</td>
            <td className="px-3 py-2.5 align-top text-emerald-300/95">✅</td>
          </tr>
          <tr className="bg-black/10">
            <td className="px-3 py-2.5 align-top">Businesses can give</td>
            <td className="px-3 py-2.5 align-top text-white/50">❌</td>
            <td className="px-3 py-2.5 align-top text-emerald-300/95">✅</td>
          </tr>
          <tr className="bg-black/15">
            <td className="px-3 py-2.5 align-top">Foundations can give</td>
            <td className="px-3 py-2.5 align-top text-white/50">❌</td>
            <td className="px-3 py-2.5 align-top text-emerald-300/95">✅</td>
          </tr>
          <tr className="bg-black/10">
            <td className="px-3 py-2.5 align-top">Automatic IRS receipt</td>
            <td className="px-3 py-2.5 align-top text-white/50">❌</td>
            <td className="px-3 py-2.5 align-top text-emerald-300/95">✅</td>
          </tr>
          <tr className="border-t border-white/15 bg-[#C8A94A]/12">
            <td className="px-3 py-3 align-top font-semibold text-white">Total potential</td>
            <td className="px-3 py-3 align-top font-semibold text-white/90">~$2,000</td>
            <td className="px-3 py-3 align-top font-semibold text-[#C8A94A]">$2,600–$3,000+</td>
          </tr>
        </tbody>
      </DataTable>

      <P>
        Same ask. Same community. <Strong>30–50% more money.</Strong>
      </P>

      <p className="mt-8 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.18em] text-[#C8A94A]">
        Seven patterns that quietly cap results
      </p>
      <ol className="mt-4 list-decimal space-y-4 pl-5 text-white/82 marker:font-semibold marker:text-[#C8A94A]">
        <li>
          <Strong>GoFundMe and standalone crowdfunding</Strong>
          <br />
          Platform fees on every donation. No formal 501(c)(3) receipt. No athlete attribution. Culturally associated with hardship and emergency — not
          investment in an athlete. Potentially taxable income for the recipient.
        </li>
        <li>
          <Strong>Venmo and Cash App as the main vehicle</Strong>
          <br />
          No receipt. No corporate giving eligibility. No employer matching. Legal gray area on large amounts. Serious donors — the ones who give $250 or
          more — will not send money without documentation.
        </li>
        <li>
          <Strong>Car wash or bake sale as the only plan</Strong>
          <br />
          Massive volunteer hours for modest return. The NC United Spartan campaign raised more in its first 24 hours than most car washes raise in an
          entire season.
        </li>
        <li>
          <Strong>Passive social posts</Strong>
          <br />
          &quot;Support my journey — link in bio&quot; earns likes. Direct personal asks earn donations. There is no substitute for asking someone
          directly.
        </li>
        <li>
          <Strong>Routing outside a 501(c)(3)</Strong>
          <br />
          Closes the door on corporate giving, foundation grants, and employer matching entirely. One structural decision eliminates entire categories of
          support.
        </li>
        <li>
          <Strong>One-time campaigns with no system</Strong>
          <br />
          You restart from zero every season instead of compounding trust, relationships, and donor loyalty year over year.
        </li>
        <li>
          <Strong>Waiting until you need the money</Strong>
          <br />
          Relationships built early convert far better than panic asks. Start before the bills arrive.
        </li>
      </ol>

      <Rule />

      <DH as="h2">Fundraising is not begging. It is building investors.</DH>
      <P>
        The athletes who raise the most are not the ones with the biggest following. They make the clearest ask, tell the most compelling story, and make
        it easy for people to say yes.
      </P>
      <P>Every NC wrestler has a story worth funding. The variable is whether they tell it with intention.</P>

      <Rule />

      <DH as="h2">The NC United model</DH>
      <P>Five things no individual family, club, or for-profit platform can replicate alone.</P>
      <ol className="mt-6 list-decimal space-y-5 pl-5 text-white/82 marker:font-black marker:text-[#C8A94A]">
        <li>
          <Strong>501(c)(3) structure.</Strong> Tax-deductible giving for individuals, businesses, corporations, and foundations. Without this, entire
          categories of support are completely inaccessible.
        </li>
        <li>
          <Strong>Central platform.</Strong> Every donation tracked. Every dollar attributed to the right athlete. Automatic tax receipts emailed the moment a
          gift is made. A clean nonprofit ledger that satisfies IRS expectations.
        </li>
        <li>
          <Strong>Community network.</Strong> The entire NC wrestling community investing collectively in athlete development — not every family carrying the
          full weight alone, improvising with separate payment handles.
        </li>
        <li>
          <Strong>Athlete accountability.</Strong> NC United provides the rails. The outreach, the follow-through, and the personal thank-you after every gift
          are still yours.
        </li>
        <li>
          <Strong>Radical transparency.</Strong> Every donation is public. Every dollar tracked in real time. Live leaderboards show progress. IRS-compliant
          receipts generated and emailed automatically. Transparency builds social proof and donor confidence.
        </li>
      </ol>

      <Rule />

      <DH as="h2">Your athlete&apos;s digital wallet</DH>
      <P>
        Every dollar raised through NC United flows into your athlete&apos;s personal digital wallet — not a general fund, not a shared pool, not a personal
        Venmo balance. Theirs.
      </P>
      <p className="mt-6 font-[family-name:var(--font-fundraising-display)] text-xs font-black uppercase tracking-[0.14em] text-[#C8A94A]">
        How it works
      </p>
      <P>
        Every donation made in your athlete&apos;s name is credited to their wallet in real time. Parents can log in and see exactly what has come in,
        what has been spent, and what is available — at any moment, from any device.
      </P>
      <P>
        When it comes time to use the funds, parents submit a reimbursement request through the platform — expense category, amount, vendor, and a receipt.
        NC United reviews and approves. Payment follows. Every transaction is documented.
      </P>
      <p className="mt-6 font-[family-name:var(--font-fundraising-display)] text-xs font-black uppercase tracking-[0.14em] text-[#C8A94A]">
        What makes it different from Venmo
      </p>
      <P>
        A Venmo balance is just money sitting in an app. There is no receipt trail, no IRS documentation, no accountability for how it is used, and no
        credibility with serious donors who want to know their gift was handled properly.
      </P>
      <P>
        The NC United wallet is a nonprofit ledger. Every dollar that comes in is tracked against an athlete. Every dollar that goes out is approved against
        an IRS-eligible expense category. Donors can see their gift credited publicly. Families can see exactly how funds are being used.
      </P>
      <p className="mt-6 font-[family-name:var(--font-fundraising-display)] text-xs font-black uppercase tracking-[0.14em] text-[#C8A94A]">
        What the wallet can pay for
      </p>
      <P className="text-white/85">
        Tournament entry fees · Competition travel · Training fees · Summer camps · Gear · FloWrestling subscription · Sports physicals · Recruiting services ·
        Transportation to NC United programming
      </P>
      <P>
        This is what separates a real fundraising system from a social post with a payment handle. The money is accountable. The athlete earns it. The family
        controls how it is spent — within a structure that protects everyone.
      </P>
      <P className="text-sm text-white/65">
        Track balances and submit reimbursement requests in RecruitNC under{" "}
        <HardLink href="/profile" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
          Profile
        </HardLink>{" "}
        → <Strong>Fundraise</Strong> (digital wallet).
      </P>

      <Rule />

      <DH as="h2">Who can give — and how much</DH>
      <P>
        Building a strong donor pool starts with knowing who to ask and how much to ask for. Based on data from NC United campaigns — including the Spartan
        Race fundraiser that raised $21,000+ in 16 days across 220+ donations — we consistently see five distinct donor groups show up. Each has different
        motivations, different gift sizes, and responds to a slightly different approach. Here is what the data from real NC wrestling families has taught us.
      </P>

      <DH as="h3">Individual donors — $25 to $500</DH>
      <P>
        Parents, grandparents, aunts and uncles, coaches, teachers, neighbors. The largest share of every NC United campaign.{" "}
        <Strong>Best approach:</Strong> direct personal ask — text, call, or in-person. Never rely on a mass post as your only strategy.
      </P>

      <DH as="h3">Local business donors — $100 to $1,000</DH>
      <P>
        Restaurants, contractors, insurance agents, gyms, retailers, professional services firms. The Spartan campaign included Caffeine Fueled Lawn
        Service, Carolina Heating &amp; Air, and North State Sport &amp; Spine — all giving through NC United&apos;s nonprofit checkout.
      </P>
      <P>
        For business owners, charitable gifts to a 501(c)(3) carry real financial advantages. At a 32–37% combined tax bracket, a $1,000 donation effectively
        costs $630–$680 after the deduction. Community visibility, employee engagement, and network access add to the case.
      </P>
      <P>
        <Strong>Best approach:</Strong> brief in-person visit with a one-page proposal, a specific ask amount, and the NC United EIN:{" "}
        <span className="tabular-nums">99-3757238</span>. Most business owners who are asked in person say yes.
      </P>

      <DH as="h3">Corporate donors — $1,000 to $25,000+</DH>
      <P>
        Most corporations cannot donate to individuals in a tax-beneficial way. They give through 501(c)(3) organizations. NC United&apos;s structure opens this
        door entirely. The Adam Mills Foundation gave through the Spartan campaign. That only happens because NC United is a registered nonprofit.
      </P>

      <DH as="h3">Foundations and grants — $500 to $10,000+</DH>
      <P>
        Foundations give to 501(c)(3) organizations. Full stop. Research local community foundations, align programs with their mission — youth access,
        development, education — and apply through NC United.
      </P>

      <DH as="h3">Matching gift programs — free money most families never claim</DH>
      <P>
        Many employers match charitable donations dollar-for-dollar. Sometimes 2:1 or 3:1. Matching almost always requires a 501(c)(3) recipient.
      </P>
      <Ul>
        <Li>
          <Strong>$200 donation + 1:1 employer match = $400</Strong> for your athlete.
        </Li>
        <Li>
          <Strong>$200 donation + 2:1 employer match = $600</Strong> for your athlete.
        </Li>
      </Ul>
      <p className="mt-6 font-[family-name:var(--font-fundraising-display)] text-xs font-black uppercase tracking-[0.14em] text-[#C8A94A]">
        How to access it
      </p>
      <Ul>
        <Li>After someone donates, ask whether their employer matches charitable gifts</Li>
        <Li>
          Donor searches for &quot;NC United Wrestling&quot; or EIN <span className="tabular-nums">99-3757238</span> in their employer&apos;s giving portal
        </Li>
        <Li>Employer contacts NC United to verify — respond quickly. Slow responses kill matches.</Li>
        <Li>
          Donors can check eligibility at{" "}
          <a
            href="https://doublethedonation.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
          >
            doublethedonation.com
          </a>
        </Li>
      </Ul>
      <p className="mt-4 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.12em] text-white/55">The ask</p>
      <blockquote className="mt-2 border-l-4 border-[#C8A94A]/80 bg-white/[0.04] px-4 py-3 text-sm italic leading-relaxed text-white/85">
        &quot;Does your employer match charitable gifts? NC United is a registered 501(c)(3) (EIN: 99-3757238) — your donation may qualify to be doubled at no
        extra cost.&quot;
      </blockquote>
      <P>
        Identify 3–5 donors whose employers likely have matching programs. One successful match at $500 is $500 in free money for your training fund.
      </P>

      <Rule />

      <DH as="h2">The 501(c)(3) advantage</DH>
      <DataTable>
        <thead>
          <tr className="border-b border-white/15 bg-[#0B2545]/90">
            <th className="px-3 py-2 font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-wide">Scenario</th>
            <th className="px-3 py-2 font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-wide">
              Personal / Non-501(c)(3)
            </th>
            <th className="px-3 py-2 font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">
              NC United 501(c)(3)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {[
            ["Friend gives $100", "No deduction", "Tax-deductible"],
            ["Local business gives $500", "No deduction", "Tax-deductible"],
            ["Corporation gives $5,000", "No tax vehicle", "Tax-deductible path"],
            ["Foundation grant", "Not eligible", "Eligible"],
            ["Employer matching", "Not eligible", "Eligible"],
            ["Automatic receipt", "❌", "✅ Instant email"],
            ["Athlete attribution", "❌", "✅ Named credit"],
            ["Live leaderboard", "❌", "✅ Real-time"],
          ].map(([a, b, c]) => (
            <tr key={String(a)} className="bg-black/10">
              <td className="px-3 py-2 align-top">{a}</td>
              <td className="px-3 py-2 align-top text-white/65">{b}</td>
              <td className="px-3 py-2 align-top text-[#C8A94A]/95">{c}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <Rule />

      <DH as="h2">The fundraising toolkit</DH>
      <P>Four things every athlete needs before making a single ask.</P>

      <ol className="mt-6 list-decimal space-y-5 pl-5 text-white/82 marker:font-black marker:text-[#C8A94A]">
        <li>
          <Strong>Your story — written down.</Strong> Three paragraphs: who you are, what you are raising for (be specific — &quot;NHSCA Nationals travel and
          privates through June, $2,500 goal&quot;), and why it matters. Specific beats vague every time. Donors give to people and purposes, not abstractions.
        </li>
        <li>
          <Strong>A simple ask amount.</Strong> Give people a number. &quot;I am asking 20 people to give $100 each&quot; converts better than &quot;any amount
          helps.&quot; People respond to specificity and a clear target.
          <P className="mt-3 text-sm text-white/70">
            Suggested tiers: <Strong>$25</Strong> — one practice · <Strong>$50</Strong> — one tournament entry fee · <Strong>$100</Strong> — one private lesson
            · <Strong>$500</Strong> — one major tournament travel weekend · <Strong>$1,000</Strong> — one elite summer camp
          </P>
        </li>
        <li>
          <Strong>A donation link through NC United.</Strong> Mobile-friendly checkout. Instant tax receipt. Credit to the right athlete. Live leaderboard shows
          your progress publicly in real time.
          <div className="mt-4">
            <HardLink
              href="/fundraising/athletes"
              className="inline-flex min-h-11 items-center font-[family-name:var(--font-fundraising-display)] text-sm font-extrabold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:underline"
            >
              /fundraising/athletes →
            </HardLink>
          </div>
        </li>
        <li>
          <Strong>A personal outreach list.</Strong> Write out every person in your network who might give. Most athletes find 50–100 people when they actually
          commit this to paper. At an average gift of $75 that is $3,750–$7,500 from one focused outreach campaign.
        </li>
      </ol>

      <Rule />

      <DH as="h2">The outreach sequence</DH>

      <DH as="h3">Week 1 — personal direct asks</DH>
      <P>
        Contact your top 20 most likely donors personally. Text. Call. In-person. Not a mass post as your primary strategy.
      </P>
      <blockquote className="mt-4 border-l-4 border-[#C8A94A]/80 bg-white/[0.04] px-4 py-3 text-sm italic leading-relaxed text-white/85">
        &quot;Hey [name] — I&apos;m raising money for my wrestling training and competition this season. I&apos;m trying to get to [specific goal] and I&apos;m
        asking people who have supported me to consider giving [specific amount]. All donations go through NC United Wrestling — it&apos;s a nonprofit so
        it&apos;s tax-deductible. Here&apos;s the link: [link]. Would you be willing to help?&quot;
      </blockquote>

      <DH as="h3">Week 2 — social media</DH>
      <P>
        After your direct asks are in, post publicly. By now you have real donors and real momentum to show. Your post needs a photo, a specific goal and
        current progress, a direct dollar ask, the donation link, and a deadline. Urgency drives action.
      </P>

      <DH as="h3">Week 3 — follow up</DH>
      <P>
        Most people intend to donate but forget. A simple follow-up converts a significant number of people who meant to give. Follow-up is not pushy. It is
        professional. Athletes who follow up raise significantly more than those who do not.
      </P>

      <DH as="h3">Ongoing — business and corporate asks</DH>
      <P>
        Longer sales cycles. Run in parallel from Week 1. Identify five local businesses connected to your family. Have a parent make an in-person
        introduction. Bring a one-page proposal. Ask for $250–$1,000.
      </P>

      <Rule />

      <DH as="h2">Thank every donor personally</DH>
      <P>For every donation, the athlete owns the thank-you.</P>
      <P>
        A personal text within 48 hours is the minimum. Name the donor. Name what their gift supports. A handwritten note is better. People repeat gifts when
        they feel seen — not when a ledger silently ticks up.
      </P>
      <P>
        Parents: help with logistics but keep the athlete&apos;s voice in front. Authenticity compounds trust and repeat donations.
      </P>

      <Rule />

      <DH as="h2">Campaign execution models</DH>
      <P>Five tactical patterns that produce predictable results. Adapt to your roster and coaches.</P>

      <div className="mt-8 space-y-10">
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">The phonathon</p>
          <P>
            Team blocks 2–3 hours on the calendar. Every athlete brings a contact list of 20–30 people. Coach sets a visible team goal. Athletes make calls and
            texts simultaneously. NC United&apos;s live leaderboard shows donations arriving in real time — the energy of the room drives the hustle and no one
            wants to be at the bottom.
          </P>
          <p className="mt-3 text-sm italic text-white/55">
            15 athletes × 20 contacts × $75 average ≈ $22,500 in one focused session.
          </p>
        </section>
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">The business blitz</p>
          <P>
            Map businesses connected to your families. Pair each athlete with 2–3 businesses they have a connection to. Parent and athlete visit in person with
            a one-page proposal. Clear ask. NC United checkout for clean receipts and tax documentation.
          </P>
          <p className="mt-3 text-sm italic text-white/55">20 businesses × $500 average ≈ $10,000 in one coordinated week.</p>
        </section>
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">The team challenge</p>
          <P>
            Set a 7–10 day campaign window. NC United&apos;s leaderboard is visible to all athletes in real time. Top fundraiser earns meaningful recognition —
            first pick at practice, featured on the site. Wrestlers compete on the leaderboard the same way they compete on the mat.
          </P>
          <p className="mt-3 text-sm italic text-white/55">
            Teams using visible competition consistently raise 30–40% more than campaigns without it.
          </p>
        </section>
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">
            The parent network activation
          </p>
          <P>
            Each parent identifies 3–5 professional contacts — colleagues, clients, business owners. Parents make the introduction. Athletes make the personal
            ask. Focus specifically on employers with matching gift programs where the same $200 ask becomes $400 or $600.
          </P>
          <p className="mt-3 text-sm italic text-white/55">20 families × 3 contacts × $200 average ≈ $12,000 before matching.</p>
        </section>
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">
            The event-anchored campaign
          </p>
          <P>
            Frame every ask around a specific upcoming event: &quot;We are raising $5,000 to send our team to NHSCA Duals.&quot; Specific goals with real deadlines
            consistently outperform open-ended asks by 40–60%. The event creates the urgency so you do not have to manufacture it.
          </P>
        </section>
      </div>

      <Rule />

      {showFundraisingRequest ? (
        <PlaybookFundraisingRequestSection rows={fundraisingDirectoryRows} activationStatusBySlug={activationStatusBySlug} />
      ) : null}

      {showFundraisingRequest ? <Rule /> : null}

      <div className="mt-16 space-y-2 border-t border-white/10 pt-10 text-xs leading-relaxed text-white/50">
        <p>NC United Wrestling is a registered 501(c)(3) nonprofit organization.</p>
        <p>
          EIN: <span className="tabular-nums text-white/65">99-3757238</span> · All donations are tax-deductible to the extent allowed by law.
        </p>
        <p>
          NCUnitedWrestling.com ·{" "}
          <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] underline-offset-4 hover:underline">
            info@ncwrestlingunited.com
          </a>
        </p>
        <p>
          <HardLink href="/fundraising" className="text-[#C8A94A] underline-offset-4 hover:underline">
            Fundraising hub →
          </HardLink>
        </p>
        <p className="text-white/40">#NCUnited #StrengthInUnity #NCWrestling</p>
      </div>
    </article>
  )
}
