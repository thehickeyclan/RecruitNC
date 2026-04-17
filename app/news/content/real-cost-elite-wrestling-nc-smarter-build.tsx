import Image from "next/image"
import {
  RealCost529ComparisonGraphic,
  RealCostAnnualBreakdownGraphic,
  RealCostNonprofitMissionGraphic,
  RealCostQuoteTilesGraphic,
  RealCostScholarshipRealityGraphic,
  RealCostSpartanCampaignGraphic,
  RealCostTwoLeversGraphic,
} from "@/components/news/real-cost-article-graphics"

/** Hero: same file as `lib/news.ts` for home + /news cards; article page uses it only below (template banner skipped — see `app/news/[slug]/page.tsx`). */
const HERO_SRC = "/images/real-cost-elite-wrestling-nc-hero.png"

/**
 * Your Kid's Wrestling Career Will Cost More Than Their College — NC United analysis, 529, 501(c)(3), Spartan.
 * Financial illustrations labeled hypothetical where appropriate.
 */
export function RealCostEliteWrestlingNcSmarterBuildContent() {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_hr]:my-8 [&_hr]:border-slate-200 [&_table]:w-full [&_table]:text-sm [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-2 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-700">
      <p className="text-slate-600 font-medium not-italic">
        By <strong>Matt Hickey</strong>, Co-Founder — NC United Wrestling
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
        <div className="relative aspect-[2.15/1] w-full min-h-[200px] sm:min-h-[240px]">
          <Image
            src={HERO_SRC}
            alt="The real cost of elite wrestling in North Carolina — and the smarter way to develop your athlete without betting your family's financial future on a scholarship"
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 48rem"
            priority
          />
        </div>
      </figure>

      <h2>The moment every wrestling family knows</h2>
      <p>
        There is a moment every wrestling family knows.
      </p>
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
        <strong>$15,000 and $25,000 per year</strong> on their development. Over four years of high school that is{" "}
        <strong>$60,000 to $100,000</strong>. Most families never see it as one number because it never arrives as one number. It comes in
        pieces — a few hundred here, a few hundred there — each one easy to justify on its own.
      </p>
      <p>Nobody talks about the total. But everybody feels it.</p>
      <p>The good news is there is a smarter way to carry it. This article is about that.</p>

      <h2>What it actually costs to develop an elite NC wrestler</h2>
      <p>
        Let&apos;s put the full picture on the table. This is not an estimate. This is what families are actually spending.
      </p>
      <p>
        We recently shared this breakdown with 15 of NC United&apos;s most competitive wrestling families. The response was immediate and
        consistent. One parent summed it up simply: <em>&ldquo;I feel like I spend more.&rdquo;</em> They&apos;re probably right — and
        that&apos;s exactly the point.
      </p>

      <h3>Training</h3>
      <ul>
        <li>Club dues: $2,100/year</li>
        <li>NC United membership: $600/year</li>
        <li>Private lessons (8/month × $75): $4,800/year</li>
        <li>
          <strong>Training total: $7,500/year</strong>
        </li>
      </ul>
      <p>
        A growing number of elite families are also adding mindset and performance coaching — typically $300 to $400 a month — bringing an
        additional $4,000 to $5,000 to the annual total for those who pursue it.
      </p>

      <h3>Major competition travel</h3>
      <ul>
        <li>
          <strong>NHSCA Nationals</strong> (Virginia Beach): $1,100–$1,300{" "}
          <em>(Hotel 3 nights × $180, travel, entry, food)</em>
        </li>
        <li>
          <strong>NHSCA Duals</strong> (Virginia Beach): $1,100–$1,300 <em>(Same venue, same costs)</em>
        </li>
        <li>
          <strong>Journeymen</strong> (travel event): $1,200–$1,800
        </li>
        <li>
          <strong>Super 32</strong> (Greensboro, NC): $200–$400
        </li>
        <li>
          <strong>State tournament</strong> (Greensboro, NC): $150–$300
        </li>
        <li>
          <strong>College opens</strong>: $300
        </li>
        <li>
          <strong>Subtotal: $4,050–$5,400</strong>
        </li>
      </ul>

      <h3>Additional events</h3>
      <ul>
        <li>2 additional tournaments: $800–$1,600</li>
        <li>High school season / misc events: $500</li>
        <li>
          <strong>Subtotal: $1,300–$2,100</strong>
        </li>
      </ul>

      <h3>Family &amp; spectator costs</h3>
      <ul>
        <li>Entry fees: $50 × 8 weekends = <strong>$400</strong></li>
        <li>Additional spectator costs (parking, food, lodging): <strong>$400</strong></li>
        <li>
          <strong>Subtotal: $800</strong>
        </li>
      </ul>

      <h3>Transportation</h3>
      <ul>
        <li>Gas to/from club practice (3× week, 50 weeks): $800–$1,200</li>
        <li>Gas to/from privates and NC United: $400–$600</li>
        <li>Local tournament mileage: $200–$400</li>
        <li>
          <strong>Subtotal: $1,400–$2,200</strong>
        </li>
      </ul>

      <h3>Nutrition &amp; recovery</h3>
      <ul>
        <li>Competition day meals and travel food: $400–$600</li>
        <li>Clean eating premium above normal grocery budget: $600–$1,200</li>
        <li>
          <strong>Subtotal: $1,000–$1,800</strong>
        </li>
      </ul>

      <h3>Development</h3>
      <ul>
        <li>Summer training camp (1 elite camp): $700–$1,500</li>
        <li>Additional clinics: $300–$500</li>
        <li>
          <strong>Subtotal: $1,000–$2,000</strong>
        </li>
      </ul>

      <h3>Gear &amp; access</h3>
      <ul>
        <li>Gear and apparel (annual): $850</li>
        <li>FloWrestling subscription: $150</li>
        <li>
          <strong>Subtotal: $1,000</strong>
        </li>
      </ul>

      <h3>
        <span aria-hidden>💰</span> Full annual cost
      </h3>
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
              <td>Training</td>
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
              <td>Family / spectator</td>
              <td>$800</td>
            </tr>
            <tr>
              <td>Transportation</td>
              <td>$1,400–$2,200</td>
            </tr>
            <tr>
              <td>Nutrition &amp; recovery</td>
              <td>$1,000–$1,800</td>
            </tr>
            <tr>
              <td>Development (camp + clinics)</td>
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
        <strong>Over 4 years of high school: $72,000 – $91,000.</strong>
      </p>
      <p>
        And that doesn&apos;t include middle school development or anything before 9th grade. One parent in our community put it plainly:{" "}
        <em>
          &ldquo;You can offset some of it by planning vacation around a tournament trip, or subtracting regular meal costs from travel meals —
          but you&apos;re talking maybe $500 to $750 a year. It doesn&apos;t dent the $15K to $20K.&rdquo;
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
        To spend $80,000 on wrestling over four years, a family in the 28–32% combined federal and state tax bracket needs to{" "}
        <strong>earn approximately $115,000–$120,000 in gross income</strong> just to net that $80,000 after taxes.
      </p>
      <p>
        You&apos;re not spending $80,000. You&apos;re spending <strong>$120,000 of your life&apos;s work</strong>.
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
        <RealCostQuoteTilesGraphic />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Perspective on what the investment is really funding — and the tax reality of pre-tax dollars.
        </figcaption>
      </figure>

      <h2>Understanding the full college picture</h2>
      <p>
        For many families the goal is a Division I scholarship — and that is a worthy and achievable goal for the right athlete. Before making
        major financial decisions around that path though, it helps to see the full picture of what college actually costs and what a wrestling
        scholarship typically covers.
      </p>
      <p>
        One data point worth knowing: of NC wrestlers in the class of 2025 and 2026 who signed Division I,{" "}
        <strong>86% committed to a school within 3 hours of home.</strong> For most NC families the recruiting conversation is closer to home than
        they might expect — which makes understanding the real net cost of those specific schools especially useful.
      </p>

      <h3>Average NC college costs (in-state, including living expenses)</h3>
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

      <h3>The scholarship reality</h3>
      <p>
        Wrestling is an equivalency sport. The average Division I wrestling program offers approximately <strong>40% of a full scholarship</strong>{" "}
        per athlete. That means:
      </p>
      <ul>
        <li>Average scholarship value: ~$17,000/year</li>
        <li>Average family out-of-pocket after scholarship: ~$26,000/year</li>
        <li>
          <strong>4-year family cost after scholarship: ~$104,000</strong>
        </li>
      </ul>
      <p>
        So a family spends <strong>$80,000–$100,000 developing a wrestler</strong> who then earns a scholarship that still requires them to pay{" "}
        <strong>$100,000+ for college</strong>.
      </p>
      <p>
        The total bill from 9th grade through graduation: <strong>$180,000–$200,000.</strong>
      </p>
      <p>
        Most families arrive at the scholarship conversation having never seen the full financial picture laid out in one place. That&apos;s not a
        failure of planning — it&apos;s a failure of information. Nobody hands wrestling parents a roadmap at the start. The goal of this article
        is to be that roadmap — so the scholarship, if it comes, is a bonus rather than the only plan.
      </p>
      <p>
        The families who get the most out of this sport are the ones who figure out early that wrestling was never the destination. It is the
        foundation. The discipline, the resilience, the ability to perform under pressure and get back up when you lose — those are the tools.
        The goal is to leverage those tools to access the best academic institutions, the strongest networks, and the life opportunities that
        follow. A wrestler with a 3.8 GPA and a national tournament on their resume has a story that opens doors at schools and in careers that
        most athletes never reach. That is the North Star worth orienting around — not the scholarship, not the podium, but the person the sport
        is building and where that person can go.
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <RealCostScholarshipRealityGraphic />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          The <strong>total bill</strong> bar ties HS development to college out-of-pocket in the ~<strong>$180k–$200k</strong> range discussed
          above. Scholarship value is shown separately. Division I — average scholarship covers ~40% per athlete. Academic and need-based aid would
          likely exist regardless of wrestling.
        </figcaption>
      </figure>

      <h2>Investing where it matters most</h2>
      <p>
        Not every dollar spent on wrestling carries equal weight. The families who get the most out of their investment are not necessarily
        spending the most — they are being intentional about where each dollar goes.
      </p>
      <p>
        One of the most overlooked opportunities in NC wrestling is the college open. For roughly $50–$100 in entry fees, an athlete can compete in
        front of college coaches on their home mat — one of the highest-impact, lowest-cost investments available at any stage of development.
        Most families don&apos;t know they exist. The ones who do use them consistently.
      </p>
      <p>
        Beyond that, a focused private lesson targeting a specific technical weakness delivers more than scattered sessions with no clear purpose.
        One elite summer camp beats two average ones. And on the tournament side, the events that move recruiting conversations — NHSCA Nationals,
        NHSCA Duals, Super 32, Journeymen — deserve priority over national tournaments across the country that require significant investments in
        time and money with limited upside and real opportunity cost. The goal is depth over breadth. Fewer things done at the highest level will
        always outperform more things done at an average one.
      </p>

      <h2>The smarter plan — for every stage</h2>
      <p>
        Most families don&apos;t set out to underfund college savings — life just moves fast and wrestling expenses have a way of arriving before
        the long-term plan does. Each tournament, each private, each camp feels necessary in the moment because it usually is. The goal isn&apos;t
        to choose between wrestling and planning — it&apos;s to build a system where both can happen at the same time.
      </p>
      <p>There are two levers every NC wrestling family should be pulling simultaneously.</p>
      <p>
        <strong>Lever 1 — Use other people&apos;s money to fund the sport</strong>
      </p>
      <p>
        Community fundraising through a 501(c)(3) nonprofit is one of the most underutilized tools available to wrestling families. When donations
        are made to a recognized nonprofit in your athlete&apos;s name, every dollar goes directly toward their training, travel, and competition
        costs — and every gift is fully tax-deductible for the donor. That means your network has a real financial incentive to support your
        wrestler, not just an emotional one. Ten people giving $150 each is <strong>$1,500</strong> toward your athlete&apos;s summer. Twenty
        people is $3,000. The math is simple. The ask is not as hard as it feels. And the system exists to make it work.
      </p>
      <p>
        <strong>Lever 2 — Save early and consistently</strong>
      </p>
      <p>
        It is never too late to start a 529. Even opening one during high school years captures tax-advantaged growth and keeps college savings
        intentional. For families with younger children — a sibling, a neighbor&apos;s child — the earlier it starts the more powerful it becomes. A
        plan funded at $370 a month from birth grows to <strong>$228,000+</strong> over 18 years at a 10% average annual return. That covers four
        years at most NC schools with money left over. One parent in our community — a financial advisor — added something most families
        don&apos;t know:{" "}
        <em>
          &ldquo;If your child doesn&apos;t use the full 529, the SECURE Act now allows you to roll up to $35,000 into a Roth IRA — up to $7,000 per
          year. Your college savings becomes a retirement head start. There is no bad outcome when you start saving.&rdquo;
        </em>{" "}
        Talk to a licensed professional about what makes sense for your family.
      </p>
      <p>
        Pull both levers. Raise what you can. Save what you can. And let the sport open the doors it was always meant to open.
      </p>
      <p className="text-sm italic text-slate-600">
        The 529 illustration is hypothetical — not a prediction, projection, or offer. Real returns vary; plans have fees; balances fluctuate.
        Talk to a licensed professional about your situation.
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

      <h2>The better path forward</h2>
      <p>
        Wrestling builds something no 529 can buy — discipline, resilience, competitive instincts, and character that carries athletes through
        life. The lessons learned on the mat are worth every dollar. That is not in question.
      </p>
      <p>
        <strong>But the financial model is broken.</strong> And the families bearing the full weight of it deserve a better system.
      </p>
      <p>
        There is a familiar defense that comes up whenever anyone questions the cost: &ldquo;The lessons wrestling teaches are invaluable.&rdquo;
        And they are. Nobody is arguing that. But the life lessons wrestling builds don&apos;t require your family to arrive at college decision
        day with no savings and a partial scholarship. The discipline, the resilience, the work ethic — none of that is diminished by a 529 plan.
        In fact, the family that plans well can invest more in training, access more resources, and give their athlete a genuine shot at schools
        most families never consider — the Ivies, the academically elite programs, the full range of opportunity that a great wrestler with a
        strong academic profile can actually reach. The sport deserves better than to be used as a reason not to plan.
      </p>
      <p>
        Compared to many elite youth sports — travel baseball, hockey, gymnastics, lacrosse — wrestling is actually one of the more accessible
        paths. The investment is real but it is not out of line with what competitive athletics demands at the highest level. The opportunity is
        in building a smarter system around it — one where families are not carrying the full weight alone.
      </p>
      <p>
        <strong>That changes with a 501(c)(3).</strong>
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <RealCostNonprofitMissionGraphic />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          The 501(c)(3) structure exists to serve the athlete — accountable dollars, tax-deductible gifts. NCUnitedWrestling.com · #StrengthInUnity
        </figcaption>
      </figure>

      <h2>What a nonprofit changes — the Spartan Race example</h2>
      <p>
        In <strong>April 2026</strong>, NC United — North Carolina&apos;s only active 501(c)(3) wrestling development organization — partnered
        with <strong>Spartan Race CEO Joe De Sena</strong> to create a fundraising campaign that puts real money back in athletes&apos; hands.
      </p>
      <p>There are three ways to participate — all fully tax-deductible charitable donations to NC United:</p>
      <ul>
        <li>
          <strong>Race</strong> — Register for any Spartan Race event at a discounted rate through NC United. Your donation can be designated to
          a specific athlete&apos;s training fund or to the NC United general training fund.
        </li>
        <li>
          <strong>Sponsor an athlete</strong> — Don&apos;t want to race? Make a tax-deductible donation in support of a specific wrestler. Search
          their name at checkout and your gift credits directly to their training and competition costs.
        </li>
        <li>
          <strong>Support NC United</strong> — Make a direct tax-deductible donation to the NC United training fund, supporting NC wrestlers
          statewide.
        </li>
      </ul>
      <p>
        Every dollar — whether you run or not — is a fully tax-deductible charitable gift to NC United. No race required to make an impact.
      </p>

      <h3>What the charitable deduction actually means</h3>
      <p>Say your uncle donates $500 to NC United in your wrestler&apos;s name. At tax time:</p>
      <ul>
        <li>He deducts $500 from his taxable income</li>
        <li>In a 22% tax bracket, that saves him $110 on his tax bill</li>
        <li>His $500 donation effectively costs him $390 out of pocket</li>
        <li>100% of the $500 goes to your athlete&apos;s training</li>
      </ul>
      <p>
        Compare that to paying $500 in fees to a non-501(c)(3) organization: no deduction, no accountability, no benefit at tax time. The money
        disappears.
      </p>

      <h3>The math every athlete needs to run</h3>
      <p>
        The Spartan Super 10K donation is $155. An athlete with a network of 10 people — parents, grandparents, aunts and uncles, coaches,
        neighbors, coworkers — who each donate $155 using that athlete&apos;s name:
      </p>
      <p>
        <strong>10 × $155 = $1,550</strong> toward that athlete&apos;s summer training fund
      </p>
      <p>Not a general pool. Not organizational overhead. Directly to that wrestler&apos;s camps, travel, and competition costs.</p>
      <p>That&apos;s $1,550 earned by making 10 phone calls.</p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
        <RealCostSpartanCampaignGraphic />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Three ways to participate; every dollar is a charitable gift to NC United. See live options on the campaign page.
        </figcaption>
      </figure>

      <p>
        <a
          href="https://app.ncwrestlingunited.com/spartan"
          className="font-semibold text-[#C20017] underline decoration-[#C20017]/40 underline-offset-2 hover:decoration-[#C20017]"
          target="_blank"
          rel="noopener noreferrer"
        >
          Donate to a specific athlete — app.ncwrestlingunited.com/spartan
        </a>
      </p>

      <h2>The ecosystem NC wrestling has been missing</h2>
      <p>The 501(c)(3) structure isn&apos;t just about fundraising. It&apos;s the foundation for building something that has never existed in North Carolina wrestling — a true developmental ecosystem.</p>
      <p>
        <strong>What that looks like:</strong>
      </p>
      <ul>
        <li>
          <strong>Developmental programs</strong> — organized pathways from middle school through high school with real funding behind them
        </li>
        <li>
          <strong>Mentorship</strong> — college wrestlers mentoring high schoolers, high schoolers mentoring middle schoolers
        </li>
        <li>
          <strong>Internships</strong> — opportunities for athletes aging out of competition to stay connected to the sport through coaching,
          operations, and program management
        </li>
        <li>
          <strong>Career pathways</strong> — connecting the discipline and work ethic of wrestling to professional networks and opportunities
          beyond the mat
        </li>
        <li>
          <strong>Community investment</strong> — corporate sponsors, foundations, and individual donors who can give tax-advantaged dollars to a
          cause they believe in
        </li>
        <li>
          <strong>Statewide coordination</strong> — a single organizing body that elevates the entire state rather than individual clubs competing
          in isolation
        </li>
      </ul>
      <p>
        Every dollar raised through NC United&apos;s nonprofit model funds this ecosystem. Every athlete who earns their training costs through
        community fundraising learns something more valuable than a single tournament result — they learn how to build support, communicate their
        value, and ask for what they&apos;ve worked for.
      </p>
      <p>Those are skills that follow them for life.</p>

      <h2>The bottom line</h2>
      <p>
        Wrestling families in North Carolina are spending $15,000–$25,000 per year on a sport that builds extraordinary human beings. The
        financial burden is real, it&apos;s significant, and for too many families it&apos;s the reason their athlete never reaches their
        potential.
      </p>
      <p>
        The ultimate goal should always be to use wrestling to open opportunities that wouldn&apos;t otherwise exist — educationally and in life.
        The families who plan well give their athlete real choice and real freedom when that moment comes. Save early if you can. Leverage your
        community and the tax code to fund training. And use the sport for what it was always meant to be — a foundation that opens doors to the
        best academic institutions, the strongest networks, and a life built on everything the mat taught your athlete to become.
      </p>
      <p>
        A 501(c)(3) nonprofit doesn&apos;t eliminate that cost. But it does something no for-profit organization ever could — it turns the entire
        community into investors in your athlete&apos;s development, with the IRS sharing the cost through the tax code.
      </p>
      <p>
        <strong>That&apos;s not a small thing. That&apos;s the whole game.</strong>
      </p>
      <p>
        NC United is building that system. The Spartan Race campaign is the first proof of concept. And this is just the beginning.
      </p>

      <hr />

      <footer className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="my-0 font-medium text-slate-700">NC United Wrestling</p>
        <p className="my-2">
          Registered 501(c)(3) nonprofit. EIN: <strong>99-3757238</strong>. All donations are fully tax-deductible. Learn more and support NC
          athletes at{" "}
          <a href="https://ncunitedwrestling.com" className="font-medium text-[#003366] underline" target="_blank" rel="noopener noreferrer">
            NCUnitedWrestling.com
          </a>
          .
        </p>
        <p className="my-2">
          Donate to a specific athlete:{" "}
          <a
            href="https://app.ncwrestlingunited.com/spartan"
            className="font-medium text-[#003366] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            app.ncwrestlingunited.com/spartan
          </a>
        </p>
        <p className="my-2">
          Consult a tax or financial professional before making planning decisions. Nothing in this article is tax, legal, or investment advice.
        </p>
        <p className="my-3 text-slate-500">
          #NCUnited #StrengthInUnity #NCWrestling #SpartanRace
        </p>
      </footer>
    </article>
  )
}
