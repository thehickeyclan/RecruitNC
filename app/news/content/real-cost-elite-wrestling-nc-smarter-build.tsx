import Image from "next/image"
import {
  RealCost529ComparisonGraphic,
  RealCostAnnualBreakdownGraphic,
  RealCostQuoteTilesGraphic,
  RealCostSpartanCampaignGraphic,
  RealCostTwoLeversGraphic,
} from "@/components/news/real-cost-article-graphics"

/** Hero banner for article + `lib/news.ts` (cards/carousel). Social/tall version: `real-cost-campaign-headline-nc-united.png` inline where needed. */
const HERO_SRC = "/images/real-cost-elite-wrestling-nc-hero.png"

/**
 * What Elite Wrestling Really Costs — NC United analysis, 529, 501(c)(3), Spartan.
 * Financial illustrations labeled hypothetical where appropriate.
 */
export function RealCostEliteWrestlingNcSmarterBuildContent() {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_hr]:my-8 [&_hr]:border-slate-200 [&_table]:w-full [&_table]:text-sm [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-2 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-700">
      <p className="text-slate-600 font-medium not-italic">
        By <strong>Matt Hickey</strong>, Co-Founder — NC United Wrestling
      </p>
      <p className="text-slate-500 text-sm">
        <em>Raleigh, NC — April 2026</em>
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
        <div className="relative aspect-[16/10] w-full min-h-[180px] sm:min-h-[220px]">
          <Image
            src={HERO_SRC}
            alt="NC United: $15,000–$25,000 per year; $70,000–$100,000 or more over a career — most families never see it as one number"
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 48rem"
            priority
          />
        </div>
      </figure>

      <h2>The moment every wrestling family knows</h2>
      <p>There is a moment every wrestling family knows.</p>
      <p>
        It is not the state championship. It is not the recruiting call. It is somewhere around sophomore year, sitting in a hotel lobby in
        Greensboro or Virginia Beach or wherever the next tournament has taken you, doing the quiet math on your phone while your kid is asleep
        upstairs.
      </p>
      <p>
        You add it up. The entry fees. The hotel. The gas. The privates on Tuesday. The club dues that came out last week. The gear he outgrew in
        August.
      </p>
      <p>And you think — how did we get here? And more importantly — how do we keep going?</p>
      <p>
        If you are raising a serious wrestler in North Carolina, you are probably spending somewhere between{" "}
        <strong>$15,000 and $25,000 per year</strong> on their development. Over a high school career — about four years — that stacks to{" "}
        <strong>$70,000–$100,000+</strong>. Most families never see it as <em>one number</em> because it never arrives as one number. It comes in
        pieces — a few hundred here, a few hundred there — each one easy to justify on its own.
      </p>
      <p>Nobody talks about the total. But everybody feels it.</p>
      <p>The good news is there is a smarter way to carry it. This article is about that.</p>

      <h2>What it actually costs</h2>
      <p>
        We shared this breakdown with 25 of NC United&apos;s most competitive wrestling families. One parent summed up the response simply:{" "}
        <em>&ldquo;I feel like I spend more.&rdquo;</em> They&apos;re probably right.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Annual cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Training (club, NC United, private lessons)</td>
              <td>$7,500</td>
            </tr>
            <tr>
              <td>Major competition travel</td>
              <td>$4,050–$5,400</td>
            </tr>
            <tr>
              <td>Additional events</td>
              <td>$1,300–$2,100</td>
            </tr>
            <tr>
              <td>Family / spectator costs</td>
              <td>$800</td>
            </tr>
            <tr>
              <td>Transportation (gas, mileage)</td>
              <td>$1,400–$2,200</td>
            </tr>
            <tr>
              <td>Nutrition &amp; recovery</td>
              <td>$1,000–$1,800</td>
            </tr>
            <tr>
              <td>Development (elite camp + clinics)</td>
              <td>$1,000–$2,000</td>
            </tr>
            <tr>
              <td>Gear &amp; access</td>
              <td>$1,000</td>
            </tr>
            <tr>
              <td>
                <strong>Base elite path total</strong>
              </td>
              <td>
                <strong>$18,050–$22,800</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        <strong>Over four years of high school, the line-by-line model above totals $72,000–$91,000</strong> — squarely in the{" "}
        <strong>$70,000–$100,000+</strong> career band we use in statewide messaging (before optional add-ons like mindset coaching).
      </p>
      <p>
        A growing number of elite families are also adding mindset and performance coaching — typically $300 to $400 a month — bringing an
        additional $4,000 to $5,000 for those who pursue it. And none of this includes anything before 9th grade.
      </p>
      <p>
        One parent put it plainly:{" "}
        <em>
          &ldquo;You can offset some of it by planning vacation around a tournament trip — but you&apos;re talking maybe $500 to $750 a year. It
          doesn&apos;t dent the $15K to $20K.&rdquo;
        </em>
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <RealCostAnnualBreakdownGraphic />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Representative model — individual families vary. Ranges in the article (e.g. major travel) use midpoints in the chart.
        </figcaption>
      </figure>

      <h2>The tax reality nobody mentions</h2>
      <p>
        To spend about <strong>$85,000</strong> on wrestling over four years (midpoint of the <strong>$70,000–$100,000+</strong> career range), a
        family in a typical combined federal and state tax bracket needs to earn approximately{" "}
        <strong>$115,000–$125,000 in gross income</strong> just to net that amount after taxes.
      </p>
      <p>
        You&apos;re not spending one number on paper. You&apos;re spending <strong>well over $100,000 of your life&apos;s work</strong> once you count
        the tax bite.
      </p>
      <p>
        For families counting on a scholarship to offset that investment — the landscape has shifted in ways most haven&apos;t heard about yet.
        For everyone else — the college cost picture is worth understanding regardless.
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
        <RealCostQuoteTilesGraphic />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Perspective on what the investment is really funding — and the tax reality of pre-tax dollars.
        </figcaption>
      </figure>

      <h2>The new era — roster caps and the scholarship reality</h2>
      <p>
        <strong>The 30-man roster cap</strong> — Schools opting into the House v. NCAA revenue-sharing model are now capped at 30 athletes.
        Programs that once carried 40 to 50 wrestlers are making harder decisions with fewer spots.
      </p>
      <p>
        <strong>A tighter path to the roster</strong> — With fewer available spots, coaches have less room for development projects. Athletes
        arriving on campus need to be more ready than ever.
      </p>
      <p>
        <strong>Scholarships remain partial</strong> — Wrestling is an equivalency sport. The average Division I program covers roughly{" "}
        <strong>40% of a full scholarship</strong> per athlete. A D1 offer is a meaningful reward — not a financial exit strategy.
      </p>
      <p>
        One data point worth knowing: of NC wrestlers in the class of 2025 and 2026 who signed Division I,{" "}
        <strong>86% committed to a school within 3 hours of home.</strong> The recruiting conversation for most NC athletes is closer than
        families expect — which makes understanding the real net cost of those schools especially useful.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table>
          <thead>
            <tr>
              <th>School</th>
              <th>Annual cost</th>
              <th>Type</th>
              <th>4-year total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>UNC Chapel Hill</td>
              <td>~$27,000–$32,000</td>
              <td>In-state</td>
              <td>~$108,000–$128,000</td>
            </tr>
            <tr>
              <td>NC State</td>
              <td>~$26,000–$31,000</td>
              <td>In-state</td>
              <td>~$104,000–$124,000</td>
            </tr>
            <tr>
              <td>App State</td>
              <td>~$23,000–$28,000</td>
              <td>In-state</td>
              <td>~$92,000–$112,000</td>
            </tr>
            <tr>
              <td>Gardner-Webb</td>
              <td>~$45,000–$55,000</td>
              <td>Private</td>
              <td>~$180,000–$220,000</td>
            </tr>
            <tr>
              <td>Davidson</td>
              <td>~$75,000–$85,000</td>
              <td>Private</td>
              <td>~$300,000–$340,000</td>
            </tr>
            <tr>
              <td>Campbell</td>
              <td>~$40,000–$50,000</td>
              <td>Private</td>
              <td>~$160,000–$200,000</td>
            </tr>
            <tr>
              <td>The Citadel</td>
              <td>~$60,000–$67,000</td>
              <td>Out-of-state</td>
              <td>~$240,000–$268,000</td>
            </tr>
            <tr>
              <td>VMI</td>
              <td>~$64,000–$67,000</td>
              <td>Out-of-state</td>
              <td>~$256,000–$268,000</td>
            </tr>
            <tr>
              <td>Presbyterian College</td>
              <td>~$20,000–$30,000 net</td>
              <td>Private</td>
              <td>~$80,000–$120,000</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        The goal of this article is to be the roadmap nobody handed you — so the scholarship, if it comes, is a bonus rather than the only plan.
      </p>

      <h2>Wrestling was never the destination</h2>
      <p>
        The families who get the most out of this sport figure out early that wrestling was never the destination. It is the foundation. The
        discipline, the resilience, the ability to perform under pressure and get back up when you lose — those are the tools. The goal is to
        leverage those tools to access the best academic institutions, the strongest networks, and the life opportunities that follow.
      </p>
      <p>
        A wrestler with a strong GPA and a national tournament on their resume has a story that opens doors at schools and in careers that most
        athletes never reach. That is the North Star worth orienting around — not the scholarship, not the podium, but the person the sport is
        building and where that person can go.
      </p>

      <h2>Investing where it matters most</h2>
      <p>
        Not every dollar spent on wrestling carries equal weight. The families who get the most out of their investment are not necessarily
        spending the most — they are being intentional about where each dollar goes.
      </p>
      <p>
        For elite wrestlers actively pursuing a college program, one of the most overlooked opportunities in NC is the <strong>college open</strong>.
        For roughly $50–$100 in entry fees, an athlete can compete in front of college coaches on their home mat — direct visibility at a fraction of
        the cost of most travel tournaments. Most families don&apos;t know they exist. The ones who do use them consistently.
      </p>
      <p>
        North Carolina is also home to more than a dozen collegiate wrestling programs within driving distance of most families in the state.
        Leveraging access to current NCAA athletes for small group training — often available for $50–$100 per athlete — can deliver more focused,
        personalized development than a large national camp at ten times the cost. The ratio of instruction to athlete matters. Smaller is almost
        always better.
      </p>
      <p>
        On the tournament side, the events that move recruiting conversations — NHSCA Nationals, NHSCA Duals, Super 32, Journeymen — deserve
        priority over national tournaments that require significant investment in time and money with limited upside and real opportunity cost.
        One elite summer camp beats two average ones. A focused private lesson targeting a specific weakness beats scattered sessions with no clear
        purpose.
      </p>
      <p>
        The goal is depth over breadth. Fewer things done at the highest level will always outperform more things done at an average one.
      </p>

      <h2>The smarter plan — two levers</h2>
      <p>
        The goal isn&apos;t to choose between wrestling and planning. It&apos;s to build a system where both happen at the same time. There are two
        levers every NC wrestling family should pull simultaneously.
      </p>

      <p>
        <strong>Lever 1 — The wrestling community takes care of its own</strong>
      </p>
      <p>
        Of all the sports communities in the world, few are as naturally tight as wrestling. We train together. We travel together. We compete
        against each other on Saturday and help each other&apos;s kids on Sunday. Coaches open their rooms to athletes from other programs. College
        wrestlers mentor the high schoolers coming up behind them. Families who have been through the journey reach back to help the ones just
        starting it.
      </p>
      <p>
        But without a shared system, that community operates tactically instead of strategically. Every family makes decisions in isolation — which
        camp, which tournament, whether the scholarship is worth chasing — under financial pressure, without the benefit of a community that has
        seen the full picture.
      </p>
      <p>
        A strong ecosystem changes that. When there is shared infrastructure for mentorship, training, career pathways, and collective
        investment, families stop making survival decisions and start making strategic ones. The North Star shifts from &ldquo;how do we pay for next
        month&rdquo; to &ldquo;where does this sport take my athlete in ten years.&rdquo;
      </p>
      <p>
        That is what NC United aims to build. And that is why it matters beyond any single camp, clinic, or tournament.
      </p>

      <p>
        <strong>Lever 2 — Save early and consistently</strong>
      </p>
      <p>
        It is never too late to start a 529. Even opening one during high school years captures tax-advantaged growth and keeps college savings
        intentional. For families with younger children — a sibling, a neighbor&apos;s child — the earlier it starts the more powerful it becomes. A
        plan funded at $370 a month from birth grows to <strong>$228,000+</strong> over 18 years at a 10% average annual return. That covers four
        years at most NC schools with money left over.
      </p>
      <p>
        One parent in our community — a financial advisor — added something most families don&apos;t know:{" "}
        <em>
          &ldquo;If your child doesn&apos;t use the full 529, the SECURE Act now allows you to roll up to $35,000 into a Roth IRA — up to $7,000 per
          year. Your college savings becomes a retirement head start. There is no bad outcome when you start saving.&rdquo;
        </em>
      </p>
      <p>
        Pull both levers. Raise what you can. Save what you can. And let the sport open the doors it was always meant to open.
      </p>
      <p className="text-sm italic text-slate-600">
        The 529 illustration is hypothetical — not a prediction, projection, or offer. Real returns vary. Talk to a licensed professional about
        your situation.
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-sm">
        <RealCostTwoLeversGraphic />
      </figure>

      <figure className="my-6 overflow-hidden rounded-xl border border-amber-200/60 bg-amber-50/40 shadow-sm">
        <RealCost529ComparisonGraphic />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Hypothetical illustration at 10% average annual return — actual returns vary based on fund, fees, glide path, and sequence of returns.
          Not a projection or guarantee.
        </figcaption>
      </figure>

      <h2>NC United × Spartan Race — the model in action</h2>
      <p>
        In April 2026, NC United partnered with Spartan Race to create the most tangible proof of what community fundraising through a 501(c)(3)
        can do for NC wrestling families.
      </p>
      <p>
        Spartan is donating the value of every race entry — zero cost to the participant. The motivation behind the partnership is personal:
        Spartan&apos;s CEO&apos;s son is an NHSCA National Champion heading to the University of Pennsylvania. This is not a corporate sponsorship.
        It is a wrestling family taking care of the wrestling community.
      </p>
      <p>
        <strong>Three ways to participate — each runs through nonprofit checkout to NC United Wrestling for the NC United Training Fund:</strong>
      </p>
      <ul>
        <li>
          <strong>Race</strong> — Register through NC United checkout for Fayetteville Spartan; document your charitable gift naming a wrestler (or broader
          Training Fund support) exactly as prompts guide. Spartan sends registration follow-up separately from how NC United acknowledges the gift.
        </li>
        <li>
          <strong>Sponsor (name a wrestler)</strong> — Charitable contribution to NC United Wrestling for the NC United Training Fund, documented in checkout in
          connection with that wrestler for eligible wrestling training/competition expenses under nonprofit policy—not cash paid directly into their pocket.
        </li>
        <li>
          <strong>Give</strong> — Contribution to NC United Wrestling for the NC United Training Fund pool supporting wrestling programs statewide —
          acknowledgements follow IRC charitable-gift documentation rules; deductible treatment varies by donor.
        </li>
      </ul>

      <h3>What the charitable pathway can unlock</h3>
      <p>
        When uncle gives $500 to NC United Wrestling (documented toward your wrestler for the NC United Training Fund checkout path), IRC rules—and his own
        tax facts—might let him deduct that gift on his schedule A the way many donors do when they itemize charitable contributions. Nobody should promise that
        math from the athlete hallway: his CPA decides whether thresholds, taxable income assumptions, substantiation timing, etc. beat out the standard deduction
        story. Compared with dumping fees through a bucket that&apos;s{" "}
        <strong>not</strong> a recognized exempt organization checkout, charitable gifts routed through NC United carry nonprofit accountability plus the
        documentation serious donors attach to filings when they qualify.
      </p>

      <h3>The math every athlete needs to run</h3>
      <p>
        <strong>10 donors × $155 = $1,550 toward your summer training fund.</strong>
      </p>
      <p>Not phantom overhead—NC United administers disbursements consistent with exempt purpose so families know how training and competition costs line up policy-wise.</p>
      <p>
        Athletes — build your network. Make the ask. Show up for your own development the way you show up on the mat.
      </p>
      <p>
        <strong>Race, sponsor, or give:</strong>{" "}
        <a
          href="https://app.ncwrestlingunited.com/spartan"
          className="font-semibold text-[#C20017] underline decoration-[#C20017]/40 underline-offset-2 hover:decoration-[#C20017]"
          target="_blank"
          rel="noopener noreferrer"
        >
          app.ncwrestlingunited.com/spartan
        </a>
      </p>
      <p className="text-slate-600">
        <em>Fayetteville, NC · May 2–3, 2026</em>
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
        <RealCostSpartanCampaignGraphic />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Three ways to participate via NC United&apos;s charitable checkout — each acknowledgment follows IRC charitable-gift standards while donors confirm their
          own deductibility questions with tax counsel.
        </figcaption>
      </figure>

      <h2>The bottom line</h2>
      <p>
        Save early if you can. Leverage your community and the tax code to fund training. And use the sport for what it was always meant to be — a
        foundation that opens doors to the best academic institutions, the strongest networks, and a life built on everything the mat taught your
        athlete to become.
      </p>
      <p>
        A 501(c)(3) nonprofit doesn&apos;t eliminate the cost of wrestling. But it does something no for-profit organization ever could — it turns the entire
        community into partners behind athlete development—with charitable recognition and documentation rails so donors who qualify can work legitimate tax
        benefits into their filings alongside NC United stewardship.
      </p>
      <p>
        <strong>That&apos;s not a small thing. That&apos;s the whole game.</strong>
      </p>
      <p>
        NC United aims to build that system. The Spartan Race campaign is the first proof of concept. And this is just the beginning.
      </p>

      <hr />

      <footer className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="my-2">
          <em>
            NC United Wrestling is a registered 501(c)(3) nonprofit. EIN: <strong>99-3757238</strong>. Contributions are charitable gifts routed through exempt
            organization stewardship; IRC-aligned acknowledgements support donors who qualify; whether your gift is deductible for you sits with IRS rules plus your CPA.
            Nothing in this article is tax, legal, or investment advice — consult a licensed professional before making planning decisions.
          </em>
        </p>
        <p className="my-2">
          <a href="https://ncunitedwrestling.com" className="font-medium text-[#003366] underline" target="_blank" rel="noopener noreferrer">
            NCUnitedWrestling.com
          </a>
          {" · "}
          <a
            href="https://app.ncwrestlingunited.com/spartan"
            className="font-medium text-[#003366] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            app.ncwrestlingunited.com/spartan
          </a>
        </p>
        <p className="my-3 text-slate-500">#NCUnited #StrengthInUnity #NCWrestling #SpartanRace</p>
      </footer>
    </article>
  )
}
