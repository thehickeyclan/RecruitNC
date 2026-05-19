import type { ReactNode } from "react"
import { HardLink } from "@/components/hard-link"
import { DigitalWalletGovernancePlaybook } from "../../_components/digital-wallet-governance-playbook"

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

export function PlaybookMembersContent() {
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
      <p className="mt-3 text-sm italic leading-relaxed text-white/55">
        Gifts are made to NC United Wrestling. Donor preferences are recorded at checkout and administered under NC United policy. Contributions may be
        tax-deductible to the extent allowed by law — donors should confirm with a tax advisor.
      </p>

      <Rule />

      <DH as="h2">Before you post that Venmo or Cash App link</DH>
      <P>
        If you are raising money for your athlete through Venmo, Cash App, GoFundMe, or informal social posts — read this first.
      </P>
      <P>
        You are leaving institutional giving on the table. Serious donors typically want documentation before they give. Businesses and foundations generally need a
        nonprofit structure to participate. Employer matching programs usually require a 501(c)(3) recipient. None of those doors tend to open through a personal
        payment app.
      </P>
      <P>
        NC United is a registered 501(c)(3). Gifts are made to NC United with donor preference recorded at checkout — not as personal transfers to families. The system
        is already built. Getting set up takes 10 minutes.
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

      <P className="text-xs italic leading-relaxed text-white/55">
        Figures reflect the NC United × Spartan Race Fayetteville campaign window, April–May 2026.
      </P>

      <P>
        The campaign passed a $10,000 goal in under two weeks — with zero advance preparation. Individual families, local businesses, a foundation, athletes
        supporting athletes, and anonymous major donors all gave through one trusted nonprofit checkout.
      </P>

      <Rule />

      <DH as="h2">What doesn&apos;t work — and what it costs you</DH>
      <P>These are the patterns that typically cap results for NC athletes every season.</P>
      <p className="mt-6 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.18em] text-[#C8A94A]">
        Illustrative comparison — same donors, different rails
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
            <td className="px-3 py-2.5 align-top">Charitable giving pathway</td>
            <td className="px-3 py-2.5 align-top text-white/50">❌</td>
            <td className="px-3 py-2.5 align-top text-emerald-300/95">Eligible — requirements apply</td>
          </tr>
          <tr className="bg-black/15">
            <td className="px-3 py-2.5 align-top">Employer matching</td>
            <td className="px-3 py-2.5 align-top text-white/50">❌</td>
            <td className="px-3 py-2.5 align-top text-emerald-300/95">Eligible when employer offers</td>
          </tr>
          <tr className="bg-black/10">
            <td className="px-3 py-2.5 align-top">Businesses can give</td>
            <td className="px-3 py-2.5 align-top text-white/50">❌</td>
            <td className="px-3 py-2.5 align-top text-emerald-300/95">Eligible pathway available</td>
          </tr>
          <tr className="bg-black/15">
            <td className="px-3 py-2.5 align-top">Foundations can give</td>
            <td className="px-3 py-2.5 align-top text-white/50">❌</td>
            <td className="px-3 py-2.5 align-top text-emerald-300/95">Eligible pathway available</td>
          </tr>
          <tr className="bg-black/10">
            <td className="px-3 py-2.5 align-top">Formal acknowledgment email</td>
            <td className="px-3 py-2.5 align-top text-white/50">❌</td>
            <td className="px-3 py-2.5 align-top text-emerald-300/95">✅</td>
          </tr>
          <tr className="border-t border-white/15 bg-[#C8A94A]/12">
            <td className="px-3 py-3 align-top font-semibold text-white">Illustrative total (matching-dependent)</td>
            <td className="px-3 py-3 align-top font-semibold text-white/90">~$2,000</td>
            <td className="px-3 py-3 align-top font-semibold text-[#C8A94A]">$2,600–$3,000+ (when matching applies)</td>
          </tr>
        </tbody>
      </DataTable>

      <P className="text-xs leading-relaxed text-white/55">
        Dollar uplift is illustrative and depends on whether employers offer matching and individual donor eligibility. Deductibility depends on each donor&apos;s
        situation — confirm with a tax advisor.
      </P>

      <p className="mt-8 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.18em] text-[#C8A94A]">
        Seven patterns that typically cap results
      </p>
      <ol className="mt-4 list-decimal space-y-4 pl-5 text-white/82 marker:font-semibold marker:text-[#C8A94A]">
        <li>
          <Strong>GoFundMe and standalone crowdfunding</Strong>
          <br />
          Platform fees on every donation. No nonprofit acknowledgment path. No structured giving lane for businesses or foundations. Culturally associated with
          hardship — not athletic development.
        </li>
        <li>
          <Strong>Venmo and Cash App as the main vehicle</Strong>
          <br />
          No formal acknowledgment. No corporate giving eligibility. No employer matching pathway. Serious donors — the ones who give $250 or more — typically want
          documentation before they give.
        </li>
        <li>
          <Strong>Car wash or bake sale as the only plan</Strong>
          <br />
          Massive volunteer hours for modest return. Structured digital campaigns through a nonprofit platform generally outperform bake sales significantly when
          paired with personal outreach.
        </li>
        <li>
          <Strong>Passive social posts</Strong>
          <br />
          &quot;Support my journey — link in bio&quot; earns likes. Direct personal asks earn donations. There is no substitute for asking someone directly.
        </li>
        <li>
          <Strong>Routing outside a 501(c)(3)</Strong>
          <br />
          Closes the door on corporate giving, foundation grants, and employer matching programs. One structural decision eliminates entire categories of potential
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
          Relationships built early tend to convert better than last-minute asks. Start before the bills arrive.
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
      <P>Five things no individual family, club, or for-profit platform can typically replicate alone.</P>
      <ol className="mt-6 list-decimal space-y-5 pl-5 text-white/82 marker:font-black marker:text-[#C8A94A]">
        <li>
          <Strong>501(c)(3) structure.</Strong> Organizational status that opens charitable giving pathways for individuals, businesses, corporations, and foundations.
          Without it, structured institutional support is largely off the table.
        </li>
        <li>
          <Strong>Central platform.</Strong> Gifts flow to NC United. Donor preferences are recorded at checkout and administered under policy. Approved reimbursements
          are documented. Automated acknowledgments go out to donors immediately.
        </li>
        <li>
          <Strong>Community network.</Strong> The entire NC wrestling community investing collectively in athlete development — not every family carrying the full weight
          alone.
        </li>
        <li>
          <Strong>Athlete accountability.</Strong> NC United provides the rails. The outreach, the follow-through, and the personal thank-you after every gift are still
          yours.
        </li>
        <li>
          <Strong>Radical transparency.</Strong> Approved gifts publish where campaigns allow. Families see totals and disbursements aligned with the reimbursement review
          process. NC United retains control of all funds until disbursed for approved expenses.
        </li>
      </ol>

      <Rule />

      <DH as="h2">Your athlete&apos;s digital wallet</DH>
      <P>
        When donors give through NC United with a preference for your athlete, you can track activity in RecruitNC under{" "}
        <Strong>Profile → Digital wallet</Strong>. This is an NC United-hosted ledger — not a personal payment app — showing gifts made to NC United where donors
        expressed support for your wrestler&apos;s qualifying costs.
      </P>

      <p className="mt-6 font-[family-name:var(--font-fundraising-display)] text-xs font-black uppercase tracking-[0.14em] text-[#C8A94A]">
        What you see in the wallet
      </p>
      <Ul>
        <Li>
          <Strong>Raised</Strong> — total gifts where donors designated your athlete
        </Li>
        <Li>
          <Strong>Spent</Strong> — approved reimbursements paid out
        </Li>
        <Li>
          <Strong>Available</Strong> — what remains after reimbursements
        </Li>
      </Ul>

      <p className="mt-6 font-[family-name:var(--font-fundraising-display)] text-xs font-black uppercase tracking-[0.14em] text-[#C8A94A]">
        How reimbursements work
      </p>
      <P>
        Submit a request through the platform — expense category, amount, vendor, and a receipt. NC United reviews and approves. Payment follows. Every transaction is
        documented.
      </P>

      <p className="mt-6 font-[family-name:var(--font-fundraising-display)] text-xs font-black uppercase tracking-[0.14em] text-[#C8A94A]">
        How parents access the digital wallet
      </p>
      <P>Use the same RecruitNC account you use as athlete or parent — the login tied to your wrestler on NC United.</P>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-base leading-relaxed text-white/82 marker:font-black marker:text-[#C8A94A]">
        <li>
          <Strong>Sign in</Strong> to RecruitNC —{" "}
          <HardLink href="/auth/signin" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            open sign-in
          </HardLink>{" "}
          if you aren&apos;t already.
        </li>
        <li>
          Open{" "}
          <HardLink href="/profile" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            Profile
          </HardLink>
          .
        </li>
        <li>
          Select the <Strong>Digital wallet</Strong> tab (coins icon). On phones it may show as <Strong>Wallet</Strong>.
        </li>
      </ol>
      <P className="text-sm text-white/65">
        Balances and reimbursement requests live there. If you don&apos;t see your wrestler, link them first under Profile →{" "}
        <Strong>Family &amp; athletes</Strong>, then open Digital wallet again.
      </P>

      <p className="mt-6 font-[family-name:var(--font-fundraising-display)] text-xs font-black uppercase tracking-[0.14em] text-[#C8A94A]">
        What the wallet can typically be used for
      </p>
      <P className="text-white/85">
        Tournament entry fees · Competition travel · Training fees · Summer camps · Gear · FloWrestling subscription · Sports physicals · Recruiting services ·
        Transportation to NC United programming
      </P>
      <P className="text-xs italic leading-relaxed text-white/55">
        All categories are subject to NC United approval and eligible-expense policy.
      </P>

      <DigitalWalletGovernancePlaybook />

      <Rule />

      <DH as="h2">Who can give — and how much</DH>
      <P>
        Based on data from NC United campaigns — including the Spartan Race Fayetteville fundraiser that raised $21,000+ across 220+ donations — five distinct donor
        groups typically show up. Here is what real NC wrestling families have taught us.
      </P>

      <DH as="h3">Individual donors — $25 to $500</DH>
      <P>
        Parents, grandparents, aunts and uncles, coaches, teachers, neighbors. The largest share of every NC United campaign.{" "}
        <Strong>Best approach:</Strong> direct personal ask — text, call, or in-person. Never rely on a mass post as your only strategy.
      </P>

      <DH as="h3">Local business donors — $100 to $1,000</DH>
      <P>
        Restaurants, contractors, insurance agents, gyms, retailers, professional services firms. The Spartan campaign included Caffeine Fueled Lawn Service, Carolina
        Heating &amp; Air, and North State Sport &amp; Spine — all giving through NC United&apos;s nonprofit checkout.
      </P>
      <P>
        For business owners, giving through a 501(c)(3) can carry real financial advantages depending on their entity type and situation. The specifics belong with
        whoever files their return — but the structural benefit is worth the conversation.{" "}
        <Strong>Best approach:</Strong> brief in-person visit with a one-page proposal, a specific ask amount, and the NC United EIN:{" "}
        <span className="tabular-nums">99-3757238</span>.
      </P>

      <DH as="h3">Corporate donors — $1,000 to $25,000+</DH>
      <P>
        Most corporations cannot give to individuals through structured charitable channels. They typically give through 501(c)(3) organizations. NC United&apos;s
        structure opens this pathway. The Adam Mills Foundation gave through the Spartan campaign. That only happens because NC United is a registered nonprofit.
      </P>

      <DH as="h3">Foundations and grants — $500 to $10,000+</DH>
      <P>
        Foundations typically give to 501(c)(3) organizations. Research local community foundations, align programs with their mission — youth access, development,
        education — and apply through NC United.
      </P>

      <DH as="h3">Matching gift programs — often missed</DH>
      <P>
        Many employers offer matching programs for charitable donations — dollar-for-dollar, sometimes 2:1 or 3:1. These programs typically require a 501(c)(3)
        recipient and are employer-dependent.
      </P>
      <p className="mt-4 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.12em] text-white/55">
        Illustrative only — when employer matching applies
      </p>
      <Ul>
        <Li>$200 gift + 1:1 match = up to $400 flowing through NC United</Li>
        <Li>$200 gift + 2:1 match = up to $600 flowing through NC United</Li>
      </Ul>
      <p className="mt-6 font-[family-name:var(--font-fundraising-display)] text-xs font-black uppercase tracking-[0.14em] text-[#C8A94A]">
        How to access it
      </p>
      <Ul>
        <Li>After someone donates, ask whether their employer offers a matching program</Li>
        <Li>
          Donor searches for &quot;NC United Wrestling&quot; or EIN <span className="tabular-nums">99-3757238</span> in their employer&apos;s giving portal
        </Li>
        <Li>Employer contacts NC United to verify — respond quickly. Slow responses lose matches.</Li>
        <Li>Donors can check eligibility at their employer&apos;s matching portal</Li>
      </Ul>
      <p className="mt-4 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.12em] text-white/55">The ask</p>
      <blockquote className="mt-2 border-l-4 border-[#C8A94A]/80 bg-white/[0.04] px-4 py-3 text-sm italic leading-relaxed text-white/85">
        &quot;Does your employer offer a charitable matching program? NC United is a registered 501(c)(3) (EIN: 99-3757238) — your donation may qualify to be matched.&quot;
      </blockquote>

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
            ["Friend gives $100", "No charitable pathway", "Eligible — confirm with advisor"],
            ["Local business gives $500", "No charitable pathway", "Eligible — confirm with advisor"],
            ["Corporation gives $5,000", "No structured vehicle", "Charitable structure available"],
            ["Foundation grant", "Not eligible", "Eligible pathway"],
            ["Employer matching", "Not eligible", "Eligible when employer offers"],
            ["Formal acknowledgment", "❌", "✅ Immediate email"],
            ["Donor preference on record", "❌", "✅ Recorded at checkout"],
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

      <P className="text-xs leading-relaxed text-white/55">
        NC United acknowledges gifts consistent with exempt-organization procedures. Deductibility depends on each donor&apos;s situation — confirm with a tax advisor.
      </P>

      <Rule />

      <DH as="h2">The fundraising toolkit</DH>
      <P>Four things every athlete needs before making a single ask.</P>

      <ol className="mt-6 list-decimal space-y-5 pl-5 text-white/82 marker:font-black marker:text-[#C8A94A]">
        <li>
          <Strong>Your story — written down.</Strong> Three paragraphs: who you are, what you are raising for (be specific — &quot;NHSCA Nationals travel and training through June, $2,500 goal&quot;), and why it matters. Specific beats vague every time. Donors give to people and purposes, not abstractions.
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
          <Strong>A donation link through NC United.</Strong> Mobile-friendly checkout. Automated acknowledgment email to every donor. Donor preference recorded toward your athlete&apos;s qualifying costs. Live leaderboard shows your progress publicly in real time.
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
        &quot;Hey [name] — I&apos;m raising money for my wrestling training and competition this season. I&apos;m trying to get to [specific goal] and I&apos;m asking people who have supported me to consider giving [specific amount]. Donations go through NC United Wrestling — they&apos;re a registered 501(c)(3) and you&apos;ll get an acknowledgment email automatically. Here&apos;s the link: [link]. Would you be willing to help?&quot;
      </blockquote>

      <DH as="h3">Week 2 — social media</DH>
      <P>
        After your direct asks are in, post publicly. By now you have real donors and real momentum to show. Your post needs a photo, a specific goal and
        current progress, a direct dollar ask, the donation link, and a deadline. Urgency drives action.
      </P>

      <DH as="h3">Week 3 — follow up</DH>
      <P>
        Most people intend to give but forget. A simple follow-up converts a significant number of people who meant to give. Follow-up is not pushy. It is
        professional. Athletes who follow up typically raise more than those who do not.
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
        A personal text within 48 hours is the minimum. Name the donor. Name what their gift supports. A handwritten note is better. People repeat gifts when they
        feel seen — not when a progress bar quietly updates without a word of gratitude.
      </P>
      <P>
        Parents: help with logistics but keep the athlete&apos;s voice in front. Authenticity compounds trust and repeat donations.
      </P>

      <Rule />

      <DH as="h2">Campaign execution models</DH>
      <P>Five tactical patterns that tend to produce strong results. Adapt to your roster and coaches.</P>

      <div className="mt-8 space-y-10">
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">The phonathon</p>
          <P>
            Team blocks 2–3 hours. Every athlete brings a contact list of 20–30 people. Coach sets a visible team goal. Athletes make calls and texts simultaneously.
            NC United&apos;s live leaderboard shows donations arriving in real time.
          </P>
          <p className="mt-3 text-sm italic text-white/55">
            Illustrative: 15 athletes × 20 contacts × $75 average ≈ $22,500 in one focused session.
          </p>
        </section>
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">The business blitz</p>
          <P>
            Map businesses connected to your families. Pair each athlete with 2–3 businesses. Parent and athlete visit in person with a one-page proposal. NC United
            checkout so supporters receive proper nonprofit acknowledgment.
          </P>
          <p className="mt-3 text-sm italic text-white/55">Illustrative: 20 businesses × $500 average ≈ $10,000 in one coordinated week.</p>
        </section>
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">The team challenge</p>
          <P>
            Set a 7–10 day campaign window. NC United&apos;s leaderboard is visible to all athletes in real time. Top fundraiser earns meaningful recognition.
            Wrestlers tend to compete on the leaderboard the same way they compete on the mat.
          </P>
          <p className="mt-3 text-sm italic text-white/55">
            Teams using visible competition often raise 30–40% more than campaigns without it.
          </p>
        </section>
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">
            The parent network activation
          </p>
          <P>
            Each parent identifies 3–5 professional contacts. Parents make the introduction. Athletes make the personal ask. Focus on employers with matching programs — the same $200 gift can become $400 or $600 when employers match.
          </P>
          <p className="mt-3 text-sm italic text-white/55">
            Illustrative: 20 families × 3 contacts × $200 average ≈ $12,000 before matching.
          </p>
        </section>
        <section>
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">
            The event-anchored campaign
          </p>
          <P>
            Frame every ask around a specific upcoming event: &quot;We are raising $5,000 to send our team to NHSCA Duals.&quot; Specific goals with real deadlines tend to outperform open-ended asks. The event creates the urgency so you do not have to manufacture it.
          </P>
        </section>
      </div>

      <Rule />

      <DH as="h2">Start now</DH>
      <P>You are not just a wrestler. You are a story and a cause worth investing in.</P>
      <P>
        The athletes who raise the most make the clearest ask, tell their story with conviction, build real relationships with their donors, and follow up.
      </P>
      <P>The system is built. The community is ready. The only thing missing is you making the ask.</P>
      <p className="mt-8">
        <Strong>Set up your athlete fundraising profile → </Strong>
        <HardLink href="/fundraising/athletes" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
          /fundraising/athletes
        </HardLink>
      </p>
      <p className="mt-4">
        <Strong>Return to fundraising hub → </Strong>
        <HardLink href="/fundraising" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
          /fundraising
        </HardLink>
      </p>
      <P className="mt-6 text-sm text-white/65">
        Need a RecruitNC profile first?{" "}
        <HardLink href="/create-profile" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
          Create one here
        </HardLink>
        , then find your athlete on{" "}
        <HardLink href="/fundraising/athletes" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
          /fundraising/athletes
        </HardLink>
        .
      </P>

      <div className="mt-16 space-y-2 border-t border-white/10 pt-10 text-xs leading-relaxed text-white/50">
        <p>NC United Wrestling is a registered 501(c)(3) nonprofit organization. EIN: <span className="tabular-nums text-white/65">99-3757238</span>.</p>
        <p>
          Gifts are made to NC United Wrestling and administered under NC United policy. Contributions may be tax-deductible to the extent allowed by law — donors should confirm with a tax advisor.
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
