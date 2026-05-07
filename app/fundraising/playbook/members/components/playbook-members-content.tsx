import type { ReactNode } from "react"
import type { FundraisingAthleteIndexRow } from "@/lib/fundraising/athlete-fundraising-profiles"
import { HardLink } from "@/components/hard-link"
import { DigitalWalletGovernancePlaybook } from "../../_components/digital-wallet-governance-playbook"
import { PlaybookInformalGivingNote } from "./red-callout"
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
      <DH as="h1">The NC United fundraising playbook</DH>
      <p className="mt-4 font-[family-name:var(--font-fundraising-display)] text-[clamp(1rem,2.8vw,1.2rem)] font-semibold uppercase leading-snug tracking-wide text-white/88 sm:text-[clamp(1.05rem,2.8vw,1.25rem)]">
        Built from how NC wrestling families raised $21,000+ in 16 days — yours can follow the same steps
      </p>
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

      <Lead>
        Thanks for opening this. Whether you&apos;re new to fundraising or you&apos;ve done it every season, we wrote this so your family can see{" "}
        <Strong>what NC United provides</Strong>, <Strong>what&apos;s worked for other wrestlers</Strong>, and <Strong>practical next steps</Strong>.
      </Lead>
      <P className="text-white/78">
        Skim in order or jump ahead. After reading,{" "}
        {showFundraisingRequest ? (
          <>
            use{" "}
            <HardLink href="#fundraising-page-request" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
              Request staff link
            </HardLink>{" "}
            below <span className="text-white/55">(or open the gift page and use </span>
          </>
        ) : (
          <>open your athlete&apos;s gift page and </>
        )}
        <Strong>Request activation</Strong>
        {showFundraisingRequest ? (
          <span className="text-white/55"> from there)</span>
        ) : (
          <span className="text-white/55">)</span>
        )}{" "}
        so NC United can wire your RecruitNC login.
      </P>
      <Ul>
        <Li>
          <Strong>Proof points</Strong> — real numbers from a recent NC United × Spartan campaign (below).
        </Li>
        <Li>
          <Strong>The nonprofit model</Strong> — receipts, matching, businesses, and foundations.
        </Li>
        <Li>
          <Strong>A toolkit + timeline</Strong> — story, ask, link, outreach in plain language.
        </Li>
      </Ul>

      <Rule />

      <DH as="h2">Proof it works here in NC</DH>
      <Lead>This isn&apos;t theory — NC families already ran this playbook.</Lead>

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
        The NC United × Spartan Race campaign moved past a $10,000 goal in under two weeks — without weeks of advance rehearsal. Families, local
        businesses, a foundation, athlete-to-athlete gifts, and anonymous supporters all used one trusted nonprofit checkout.
      </P>
      <P>The patterns later in this guide showed up in that data.</P>

      <Rule />

      <DH as="h2">The NC United model</DH>
      <P>
        Venmo, Cash App, and standalone crowdfunding links feel urgent — they&apos;re basically asking friends for cash through an app. Each household can
        blast another solo post; what you don&apos;t get is <Strong>one credible nonprofit spine</Strong> schools, employers, sponsors, and auditors can
        rely on.
      </P>
      <P className="text-white/82">
        Raising with credibility beats one hundred individuals spinning separate Venmo handles and GoFundMe URLs across social — scattered receipts, no
        matching lane, no institutional grade attribution. NC United concentrates that lift behind{" "}
        <Strong>501(c)(3) rails, ledger-backed credits, and documented flows</Strong> donors already expect when they want their gift to count beyond a text
        thread.
      </P>
      <P className="text-white/78">
        Five strengths built into NC United&apos;s nonprofit stack — generally impossible for one household or a pile of informal payment apps to carry
        end-to-end:
      </P>
      <ol className="mt-6 list-decimal space-y-5 pl-5 text-white/82 marker:font-black marker:text-[#C8A94A]">
        <li>
          <Strong>501(c)(3) structure.</Strong> Tax-deductible giving for individuals, businesses, and foundations where applicable — paths informal peer apps
          simply don&apos;t open.
        </li>
        <li>
          <Strong>Central platform.</Strong> Donations tracked, dollars attributed to athletes, receipts emailed, ledger aligned with nonprofit
          expectations — not screenshots you chase across devices.
        </li>
        <li>
          <Strong>Community network.</Strong> The broader NC wrestling community invests together instead of every household pretending it must carry the whole
          lift solo off-platform.
        </li>
        <li>
          <Strong>Athlete ownership.</Strong> NC United supplies infrastructure; families still drive outreach, follow-through, and thank-yous — but under a
          banner outsiders recognize as nonprofit-backed.
        </li>
        <li>
          <Strong>Transparency.</Strong> Public attribution where intended, live progress signals, receipts generated at checkout — built for scrutiny, not
          opacity.
        </li>
      </ol>

      <DigitalWalletGovernancePlaybook />

      <PlaybookInformalGivingNote />

      <Rule />

      <DH as="h2">Where unofficial channels usually leave money on the table</DH>
      <P className="text-white/82">
        Informal channels max out fast because they weren&apos;t engineered for charitable receipts, employer matching, corporate gifts, or foundations —
        no matter how loud the feed gets. When donors want paperwork that survives HR or the IRS, unstructured rails leak leverage even when everyone&apos;s
        intentions are good.
      </P>
      <P className="mt-6 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.18em] text-[#C8A94A]">
        Same ten donors — different upside
      </P>

      <DataTable>
        <thead>
          <tr className="border-b border-white/15 bg-[#0B2545]/90">
            <th className="px-3 py-3 font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-wide text-white/55">
              Line
            </th>
            <th className="px-3 py-3 font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-wide">
              Venmo / GoFundMe / personal
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
            <td className="px-3 py-2.5 align-top">Automatic receipt</td>
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

      <P className="text-sm text-white/65">
        Same ask. Same community. <Strong>30–50% more money</Strong> when matching and institutional gifts unlock — illustration only; outcomes
        vary.
      </P>

      <p className="mt-8 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.18em] text-[#C8A94A]">
        Seven habits we see soften totals — all fixable
      </p>
      <ol className="mt-4 list-decimal space-y-4 pl-5 text-white/82 marker:font-semibold marker:text-[#C8A94A]">
        <li>
          <Strong>GoFundMe or standalone crowdfunding alone</Strong> — fees add up; donors may not receive a charitable deduction; attribution and team
          bookkeeping can get fuzzy compared with NC United&apos;s ledger.
        </li>
        <li>
          <Strong>Venmo / Cash App as the only system</Strong> — usually no formal receipt, employer matching rarely applies, some larger donors pause
          without documentation.
        </li>
        <li>
          <Strong>Relying only on car washes or bake sales</Strong> — huge volunteer hours per dollar; digital campaigns often raise faster when paired
          with in-person connection — not instead of it.
        </li>
        <li>
          <Strong>Only passive social posts</Strong> — &quot;support my journey — link in bio&quot; earns visibility; paired personal asks still carry most
          conversions.
        </li>
        <li>
          <Strong>Gifts routed outside a 501(c)(3)</Strong> — many employers, foundations, and corporate programs need nonprofit eligibility.
        </li>
        <li>
          <Strong>One-off bursts with no rhythm</Strong> — rebuilding trust from scratch each season is slower than nurturing repeat donors.
        </li>
        <li>
          <Strong>Waiting until budgets feel desperate</Strong> — relationships seeded earlier tend to respond better than last-minute-only appeals.
        </li>
      </ol>

      <Rule />

      <DH as="h2">Fundraising is an invitation, not a plea</DH>
      <P>
        Wrestlers who reach strong totals are rarely just &quot;loudest online&quot; — they tend to make a clear ask, share an honest story, and remove friction so donors can say yes quickly.
      </P>
      <P>Every NC wrestler has a story worth backing; what changes outcomes is how clearly families invite people into it.</P>

      <Rule />

      <DH as="h2">Who can give — and how much</DH>
      <P className="mt-4 border-l-2 border-[#C8A94A]/45 bg-white/[0.03] pl-4 py-3 text-sm leading-relaxed text-white/78">
        The spans below come from <Strong>what we&apos;ve seen across NC United drives</Strong> — usual gift sizes and tiers families anchor asks on.
        They are <Strong>not caps</Strong>: donors can give more or less than any bracket (checkout minimums aside). Nothing here limits how much a
        relative, friend, or business can contribute when they&apos;re ready.
      </P>

      <DH as="h3">Individual donors — $25 to $500</DH>
      <P>
        Parents, grandparents, aunts and uncles, coaches, teachers, neighbors. The largest share of donations in every campaign.{" "}
        <Strong>Best approach:</Strong> mix personal texts or calls with posts — mass posting alone usually underperforms.
      </P>

      <DH as="h3">Local business donors — $100 to $1,000</DH>
      <P>
        Restaurants, contractors, agents, gyms, retailers, professional services. The Spartan campaign included Caffeine Fueled Lawn Service,
        Carolina Heating &amp; Air, and North State Sport &amp; Spine — all giving through NC United&apos;s nonprofit checkout alongside individual
        families.
      </P>
      <P>
        For business owners, charitable gifts to a 501(c)(3) carry real tax advantages. At a 32–37% combined bracket, a $1,000 donation effectively
        costs $630–$680 after the deduction. <Strong>Best approach:</Strong> brief in-person visit with a one-page proposal, a clear ask amount, and
        the NC United EIN: <span className="tabular-nums">99-3757238</span>.
      </P>

      <DH as="h3">Corporate donors — $1,000 to $25,000+</DH>
      <P>
        Most corporations cannot donate to individuals in a tax-beneficial way. They give through 501(c)(3) organizations. NC United&apos;s structure
        opens this door entirely. The Adam Mills Foundation gave through the Spartan campaign. That only happens because NC United is a registered
        nonprofit.
      </P>

      <DH as="h3">Foundations and grants — $500 to $10,000+</DH>
      <P>
        Foundations typically give to registered 501(c)(3) organizations. Research local community foundations, align programs with their mission (youth
        access, development, education), and apply through NC United.
      </P>

      <DH as="h3">Matching gift programs — many employers still offer them</DH>
      <P>
        Many employers match charitable donations dollar-for-dollar — sometimes 2:1 or 3:1. Matching almost always requires a 501(c)(3) recipient.
      </P>
      <Ul>
        <Li>
          <Strong>$200 donation at 1:1 match = $400</Strong> for your athlete.
        </Li>
        <Li>
          <Strong>$200 donation at 2:1 match = $600</Strong> for your athlete.
        </Li>
      </Ul>
      <P className="font-[family-name:var(--font-fundraising-display)] text-xs font-black uppercase tracking-[0.14em] text-[#C8A94A]">
        How to access it
      </P>
      <Ul>
        <Li>After someone donates, ask: &quot;Does your employer offer a charitable matching program?&quot;</Li>
        <Li>
          Donor searches for &quot;NC United Wrestling&quot; or EIN <span className="tabular-nums">99-3757238</span> in their employer&apos;s giving
          portal.
        </Li>
        <Li>Employer contacts NC United to verify — respond quickly; slow responses kill matches.</Li>
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
          .
        </Li>
      </Ul>
      <blockquote className="mt-6 border-l-4 border-[#C8A94A]/80 bg-white/[0.04] px-4 py-3 text-sm italic leading-relaxed text-white/85">
        &quot;Does your employer match charitable gifts? NC United is a registered 501(c)(3) (EIN: 99-3757238) — your donation may qualify to be
        matched at no extra cost to you.&quot;
      </blockquote>
      <P>
        Identify at least 3–5 donors whose employers likely have matching programs. One successful match at $500 is $500 in free money for your
        training fund.
      </P>

      <Rule />

      <DH as="h2">The 501(c)(3) advantage</DH>
      <DataTable>
        <thead>
          <tr className="border-b border-white/15 bg-[#0B2545]/90">
            <th className="px-3 py-2 font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-wide">Scenario</th>
            <th className="px-3 py-2 font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-wide">
              Personal / non-501(c)(3)
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
      <P className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.14em] text-[#C8A94A]">
        Four building blocks before the first ask
      </P>

      <ol className="mt-6 list-decimal space-y-5 pl-5 text-white/82 marker:font-black marker:text-[#C8A94A]">
        <li>
          <Strong>Your story — written down.</Strong> Three paragraphs: who you are (name, school, weight class, years wrestling, where you&apos;re
          headed), what you&apos;re raising for (be specific — &quot;NHSCA Nationals travel and privates through June&quot;), and why it matters.
          Specific beats vague every time.
        </li>
        <li>
          <Strong>A simple ask amount.</Strong> Give people a number. &quot;I&apos;m asking 20 people to give $100 each&quot; converts better than
          &quot;any amount helps.&quot; People respond to specificity.
          <P className="mt-3 text-sm text-white/70">
            Suggested tiers: <Strong>$25</Strong> — one practice · <Strong>$50</Strong> — one tournament entry fee · <Strong>$100</Strong> — one private
            lesson · <Strong>$500</Strong> — one major tournament travel weekend · <Strong>$1,000</Strong> — one elite summer camp.
          </P>
        </li>
        <li>
          <Strong>A donation link through NC United.</Strong> Mobile-friendly. Instant tax receipt. Credit to the right athlete. Live leaderboard shows
          your progress publicly. Your donors can see exactly where they stand.
          <div className="mt-4">
            <HardLink
              href="/fundraising/athletes"
              className="inline-flex min-h-11 items-center font-[family-name:var(--font-fundraising-display)] text-sm font-extrabold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:underline"
            >
              Fundraising athletes directory →
            </HardLink>
          </div>
        </li>
        <li>
          <Strong>A personal outreach list.</Strong> Write out every person in your network who might give. Most athletes find 50–100 people when they
          actually do this exercise. At an average gift of $75 that is $3,750–$7,500 from one direct outreach campaign.
        </li>
      </ol>

      <Rule />

      <DH as="h2">The outreach sequence</DH>

      <DH as="h3">Week 1 — personal direct asks</DH>
      <P>
        Contact your top 20 most likely donors personally. Text. Call. In-person. Not a mass post.
      </P>
      <blockquote className="mt-4 border-l-4 border-[#C8A94A]/80 bg-white/[0.04] px-4 py-3 text-sm italic leading-relaxed text-white/85">
        &quot;Hey [name] — I&apos;m raising money for my wrestling training and competition this season. I&apos;m trying to get to [specific goal] and
        I&apos;m asking people who have supported me to consider giving [specific amount]. All donations go through NC United Wrestling — it&apos;s a
        nonprofit so it&apos;s tax-deductible. Here&apos;s the link: [link]. Would you be willing to help?&quot;
      </blockquote>

      <DH as="h3">Week 2 — social media push</DH>
      <P>
        After your direct asks are in, post publicly. By now you have real donors and real momentum to show. Your post needs: a photo of you on the
        mat, your specific goal and current progress, a direct dollar ask, the donation link, and a deadline. Urgency drives action.
      </P>

      <DH as="h3">Week 3 — follow up</DH>
      <P>
        Most people intend to donate but forget. A simple follow-up converts a significant number of people who meant to give. Follow-up is not pushy.
        It is professional. Athletes who follow up raise significantly more than those who don&apos;t.
      </P>

      <DH as="h3">Ongoing — business and corporate asks</DH>
      <P>
        Longer sales cycles — run in parallel from Week 1. Identify five local businesses connected to your family. Have a parent make an in-person
        introduction. Bring a one-page proposal. Ask for $250–$1,000.
      </P>

      <Rule />

      <DH as="h2">Thank every donor personally</DH>
      <P>
        For every donation, the athlete owns the thank-you — not the organization.
      </P>
      <P>
        A personal text within 48 hours is the minimum. Name the donor. Name what their gift supports. A handwritten note is better. People repeat gifts
        when they feel seen, not when a ledger silently ticks up.
      </P>
      <P>Parents: help with logistics, but keep the athlete&apos;s voice in front. Authenticity compounds trust.</P>

      <Rule />

      <DH as="h2">Campaign execution models</DH>
      <P className="text-white/65">
        Tactical patterns that produce predictable results. Adapt to your roster and coaches.
      </P>

      <div className="mt-8 space-y-10">
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">The phonathon</p>
          <P>
            Team blocks 2–3 hours. Every athlete brings a contact list of 20–30 people. Coach sets a visible team goal. Athletes make calls and texts
            simultaneously. NC United&apos;s live leaderboard shows donations arriving in real time — the energy of the room drives the hustle.
          </P>
          <p className="mt-3 text-sm italic text-white/55">
            Illustrative math: 15 athletes × 20 contacts × $75 average ≈ $22,500 in one focused session.
          </p>
        </section>
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">The business blitz</p>
          <P>
            Map businesses connected to your families. Pair each athlete with 2–3 businesses. Parent and athlete visit in person with a one-page proposal.
            Clear ask. NC United checkout for clean receipts.
          </P>
          <p className="mt-3 text-sm italic text-white/55">
            Illustrative math: 20 businesses × $500 average ≈ $10,000 in one coordinated week.
          </p>
        </section>
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">The team challenge</p>
          <P>
            Set a 7–10 day campaign window. NC United&apos;s leaderboard is visible to all athletes in real time. Top fundraiser earns recognition —
            first pick at practice, featured on the site. Wrestlers compete on the leaderboard the same way they compete on the mat.
          </P>
          <p className="mt-3 text-sm italic text-white/55">
            Predictable outcome: 30–40% more total donations compared to campaigns without visible competition.
          </p>
        </section>
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">
            The parent network activation
          </p>
          <P>
            Each parent identifies 3–5 professional contacts — colleagues, clients, business owners. Parents make the introduction. Athletes make the
            personal ask. Focus specifically on employers with matching programs.
          </P>
          <p className="mt-3 text-sm italic text-white/55">
            Illustrative math: 20 families × 3 contacts × $200 average ≈ $12,000 before matching; matching participation stretches from there.
          </p>
        </section>
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">
            The event-anchored campaign
          </p>
          <P>
            Frame the ask around a specific event: &quot;We&apos;re raising $5,000 to send our team to NHSCA Duals.&quot; Specific goals with specific
            deadlines tend to outperform open-ended asks. The event supplies gentle urgency.
          </P>
        </section>
      </div>

      <Rule />

      {showFundraisingRequest ? (
        <PlaybookFundraisingRequestSection rows={fundraisingDirectoryRows} activationStatusBySlug={activationStatusBySlug} />
      ) : null}

      {showFundraisingRequest ? <Rule /> : null}

      <DH as="h2">When you&apos;re ready to move</DH>
      <P>You&apos;re not &quot;just a wrestler&quot; — you&apos;re a story people can invest in with clarity.</P>
      <P>
        Families who finish strong tend to share a clear ask, an honest narrative, real relationships with donors, and steady follow-up — habits NC
        United&apos;s tools support rather than replace.
      </P>
      <P>The rails exist; the community is active — your next step is the first intentional conversation or message.</P>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <HardLink
          href="/fundraising/athletes"
          className="inline-flex min-h-[52px] items-center justify-center rounded-sm bg-[#C8A94A] px-8 font-[family-name:var(--font-fundraising-display)] text-sm font-extrabold uppercase tracking-[0.14em] text-[#061224] hover:bg-[#b89740]"
        >
          Set up your athlete fundraising profile →
        </HardLink>
        <HardLink
          href="/fundraising"
          className="inline-flex min-h-[52px] items-center justify-center rounded-sm border border-white/25 px-8 font-[family-name:var(--font-fundraising-display)] text-sm font-extrabold uppercase tracking-[0.14em] text-[#C8A94A] hover:bg-white/5"
        >
          Return to fundraising hub →
        </HardLink>
      </div>

      <div className="mt-16 space-y-2 border-t border-white/10 pt-10 text-xs leading-relaxed text-white/50">
        <p>
          NC United Wrestling is a registered 501(c)(3) nonprofit organization. EIN: <span className="tabular-nums text-white/65">99-3757238</span> ·
          All donations are fully tax-deductible to the extent allowed by law.
        </p>
        <p>
          NCUnitedWrestling.com ·{" "}
          <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] underline-offset-4 hover:underline">
            info@ncwrestlingunited.com
          </a>
        </p>
        <p className="text-white/40">#NCUnited #StrengthInUnity #NCWrestling</p>
      </div>
    </article>
  )
}
