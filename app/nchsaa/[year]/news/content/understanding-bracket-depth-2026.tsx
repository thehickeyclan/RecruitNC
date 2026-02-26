"use client"

/**
 * Optional bracket/podium images. Add paths when you have them; layout reserves space.
 * Keys: "7A-138" | "7A-190" | "7A-150" | "7A-157" | "7A-165" | "6A-150"
 */
const BRACKET_IMAGES: Record<string, string> = {
  "7A-138": "/images/nchsaa-2026-7a-138-podium.png",
  "7A-150": "/images/nchsaa-2026-7a-150-podium.png",
  "7A-157": "/images/nchsaa-2026-7a-157-podium.png",
  "7A-165": "/images/nchsaa-2026-7a-165-podium.png",
}

function profileUrl(name: string, school: string, year: string) {
  return `/unified-profile/by-name?${new URLSearchParams({ name, school, year }).toString()}`
}

const RANKINGS_HREF = "/public-rankings"

const linkClass = "text-[#003366] underline hover:no-underline font-medium"
const linkClassMuted = "text-[#003366] underline hover:no-underline"

/** Force full-page navigation so the by-name lookup completes (avoids client-side fetch being canceled). */
function ProfileLink({
  href,
  className,
  children,
}: {
  href: string
  className: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        window.location.href = href
      }}
    >
      {children}
    </a>
  )
}

export function UnderstandingBracketDepth2026Content() {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_hr]:my-8 [&_hr]:border-slate-200 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-slate-300 [&_td]:px-3 [&_td]:py-2">
      <p><strong>How bracket strength is measured:</strong></p>
      <p>
        Bracket strength is determined by the number of wrestlers competing who were ranked in NC United&apos;s{" "}
        <a href={RANKINGS_HREF} className={linkClass}>Pre-State College Prospect Rankings</a>{" "}
        (Class of 2026 Top 30, Class of 2027 Top 30, Class of 2028 Top 20). 77 of the 80 ranked wrestlers competed at states.
      </p>
      <p><strong>Bracket classifications:</strong></p>
      <ul>
        <li><strong>ELITE:</strong> 4+ ranked wrestlers</li>
        <li><strong>STRONG:</strong> 3 ranked wrestlers</li>
        <li><strong>MEDIUM:</strong> 2 ranked wrestlers</li>
        <li><strong>LIGHT:</strong> 0-1 ranked wrestlers</li>
      </ul>
      <p className="text-sm text-slate-600 italic">
        This data provides context for the broader structural conversation in{" "}
        <a href="/nchsaa/2026/news/seven-divisions-98-brackets-784-qualifiers" className={linkClassMuted}>&quot;Did North Carolina Wrestling Expand Divisions—But Shrink Our Future?&quot;</a>
      </p>

      <hr />

      <h2>The Distribution</h2>
      <table>
        <thead>
          <tr>
            <th>Bracket Strength</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ELITE (4+ ranked)</td>
            <td>2</td>
            <td>2%</td>
          </tr>
          <tr>
            <td>STRONG (3 ranked)</td>
            <td>4</td>
            <td>4%</td>
          </tr>
          <tr>
            <td>MEDIUM (2 ranked)</td>
            <td>~12</td>
            <td>~12%</td>
          </tr>
          <tr>
            <td>LIGHT (0-1 ranked)</td>
            <td>~80</td>
            <td>~82%</td>
          </tr>
        </tbody>
      </table>
      <p><strong>What the data shows:</strong></p>
      <p>Across 98 weight class brackets, competitive depth varied significantly. Two brackets featured 4+ ranked wrestlers. Four had exactly 3 ranked wrestlers. Most brackets (82%) had 0-1 ranked wrestlers.</p>

      <div className="my-6 rounded-xl bg-[#003366]/10 border-l-4 border-[#003366] p-4 sm:p-5">
        <p className="text-lg font-bold text-slate-800">
          In the ELITE and STRONG brackets, every ranked wrestler chose to compete in fields where multiple elite opponents stood between them and a state title. They could have competed at different weights or sought easier paths. <strong>They didn&apos;t.</strong>
        </p>
      </div>

      <hr />

      <h2>The ELITE Brackets</h2>

      <BracketSection imageKey="7A-138" title="7A 138 lbs">
        <p><strong>4 Ranked Wrestlers:</strong></p>
        <ol className="list-decimal pl-6 my-3 space-y-1">
          <li>#3 <ProfileLink href={profileUrl("Tye Johnson", "Cape Fear", "2027")} className={linkClass}>Tye Johnson</ProfileLink> (Cape Fear, 2027) — <strong>1ST</strong></li>
          <li>#17 <ProfileLink href={profileUrl("Aidan Szewczyk", "Davie", "2027")} className={linkClass}>Aidan Szewczyk</ProfileLink> (Davie, 2027) — 2ND</li>
          <li>#9 <ProfileLink href={profileUrl("Aiden White", "Weddington", "2027")} className={linkClass}>Aiden White</ProfileLink> (Weddington, 2027) — 3RD</li>
          <li>#8 <ProfileLink href={profileUrl("Jake Amiott", "Topsail", "2028")} className={linkClass}>Jake Amiott</ProfileLink> (Topsail, 2028) — 4TH</li>
        </ol>
        <p><ProfileLink href={profileUrl("Tye Johnson", "Cape Fear", "2027")} className={linkClass}>Johnson</ProfileLink> defeated <ProfileLink href={profileUrl("Aiden White", "Weddington", "2027")} className={linkClass}>White</ProfileLink> and <ProfileLink href={profileUrl("Aidan Szewczyk", "Davie", "2027")} className={linkClass}>Szewczyk</ProfileLink> at states to win the title (he had beaten <ProfileLink href={profileUrl("Jake Amiott", "Topsail", "2028")} className={linkClass}>Amiott</ProfileLink> at the 7A East regional finals the week prior). All four ranked wrestlers placed exactly where seeded—a testament to the depth and quality of competition in this bracket.</p>
        <p><strong>What this bracket required:</strong> Every wrestler faced multiple ranked opponents. To win, Johnson navigated through two ranked opponents at states after having beaten a third at regionals. To place, every wrestler had to defeat or compete closely with other elite talent. This is what deep competitive brackets look like.</p>
      </BracketSection>

      <BracketSection imageKey="7A-190" title="7A 190 lbs">
        <p><strong>4 Ranked Wrestlers:</strong></p>
        <ol className="list-decimal pl-6 my-3 space-y-1">
          <li>#13 <ProfileLink href={profileUrl("Gavin Yow", "A.L. Brown", "2026")} className={linkClass}>Gavin Yow</ProfileLink> (A.L. Brown, 2026) — <strong>1ST</strong></li>
          <li>#14 <ProfileLink href={profileUrl("Sam Harper", "South Iredell", "2026")} className={linkClass}>Sam Harper</ProfileLink> (South Iredell, 2026) — 2ND</li>
          <li>#25 <ProfileLink href={profileUrl("Brieon Mayfield", "Jack Britt", "2027")} className={linkClass}>Brieon Mayfield</ProfileLink> (Jack Britt, 2027) — 3RD</li>
          <li>#20 <ProfileLink href={profileUrl("Amanuel Kahsai", "New Bern", "2028")} className={linkClass}>Amanuel Kahsai</ProfileLink> (New Bern, 2028) — DNP</li>
        </ol>
        <p>Also competing: <ProfileLink href={profileUrl("Deyari El-Amin", "Hillside", "2026")} className={linkClass}>Deyari El-Amin</ProfileLink> (Hillside, 2026, Honorable Mention) — 4TH</p>
        <p><ProfileLink href={profileUrl("Gavin Yow", "A.L. Brown", "2026")} className={linkClass}>Yow</ProfileLink> defeated <ProfileLink href={profileUrl("Sam Harper", "South Iredell", "2026")} className={linkClass}>Harper</ProfileLink> 4-2 in the finals. This bracket featured ranked wrestlers from all three classes, plus an honorable mention wrestler who placed fourth, creating the most diverse competitive field of the tournament.</p>
        <p><strong>What this bracket required:</strong> Wrestlers faced opponents across multiple graduating classes. Yow beat a 54-2 opponent in a close finals match. Harper, Mayfield, and Kahsai all competed knowing any match could be against elite-level talent. El-Amin battled through a bracket stacked with ranked opponents to earn fourth place.</p>
      </BracketSection>

      <hr />

      <h2>The STRONG Brackets</h2>

      <BracketSection imageKey="7A-150" title="7A 150 lbs">
        <p><strong>3 Ranked Wrestlers:</strong></p>
        <ul className="list-disc pl-6 my-3 space-y-1">
          <li>#7 <ProfileLink href={profileUrl("Andrew Davis", "Davie", "2026")} className={linkClass}>Andrew Davis</ProfileLink> (Davie, 2026) — <strong>1ST</strong></li>
          <li>#1 <ProfileLink href={profileUrl("Aaron Ellison", "Lumberton", "2028")} className={linkClass}>Aaron Ellison</ProfileLink> (Lumberton, 2028) — 2ND</li>
          <li>#5 <ProfileLink href={profileUrl("Jacob Perry", "New Bern", "2028")} className={linkClass}>Jacob Perry</ProfileLink> (New Bern, 2028) — 4TH</li>
        </ul>
        <p>Davis navigated two highly-touted 2028 prospects, including beating the #1 ranked 2028 wrestler (<ProfileLink href={profileUrl("Aaron Ellison", "Lumberton", "2028")} className={linkClass}>Ellison</ProfileLink>) in sudden victory 20-17 in the finals. Ellison and Perry both competed knowing they&apos;d face ranked opposition in their path.</p>
      </BracketSection>

      <BracketSection imageKey="7A-157" title="7A 157 lbs">
        <p><strong>3 Ranked Wrestlers:</strong></p>
        <ul className="list-disc pl-6 my-3 space-y-1">
          <li>#7 <ProfileLink href={profileUrl("Aidan Gore", "Garner", "2027")} className={linkClass}>Aidan Gore</ProfileLink> (Garner, 2027) — <strong>1ST</strong></li>
          <li>#13 <ProfileLink href={profileUrl("Jacob McCord", "Grimsley", "2027")} className={linkClass}>Jacob McCord</ProfileLink> (Grimsley, 2027) — 2ND</li>
          <li>#29 <ProfileLink href={profileUrl("Elliott Gould", "Davie", "2026")} className={linkClass}>Elliott Gould</ProfileLink> (Davie, 2026) — 3RD</li>
        </ul>
        <p>Gore defeated Gould 7-0 in the semifinals and McCord 1-0 in an extremely close finals match. All three ranked wrestlers placed top-3, with each having to compete through ranked opponents.</p>
      </BracketSection>

      <BracketSection imageKey="7A-165" title="7A 165 lbs">
        <p><strong>3 Ranked Wrestlers:</strong></p>
        <ul className="list-disc pl-6 my-3 space-y-1">
          <li>#10 <ProfileLink href={profileUrl("Carson Worrick", "Davie", "2027")} className={linkClass}>Carson Worrick</ProfileLink> (Davie, 2027) — <strong>1ST</strong></li>
          <li>#3 <ProfileLink href={profileUrl("Ryan Thompson", "Cardinal Gibbons", "2028")} className={linkClass}>Ryan Thompson</ProfileLink> (Cardinal Gibbons, 2028) — 2ND</li>
          <li>#29 <ProfileLink href={profileUrl("John Bane", "New Bern", "2027")} className={linkClass}>John Bane</ProfileLink> (New Bern, 2027) — 3RD</li>
        </ul>
        <p>Worrick beat higher-ranked Thompson (#3) in a close 7-6 finals match. Thompson, Bane, and Worrick all competed in a bracket where earning a medal meant navigating multiple ranked wrestlers.</p>
      </BracketSection>

      <BracketSection imageKey="6A-150" title="6A 150 lbs">
        <p><strong>3 Ranked Wrestlers:</strong></p>
        <ul className="list-disc pl-6 my-3 space-y-1">
          <li>#27 <ProfileLink href={profileUrl("Elijah Oakley", "Piedmont", "2026")} className={linkClass}>Elijah Oakley</ProfileLink> (Piedmont, 2026) — <strong>1ST</strong></li>
          <li>#4 <ProfileLink href={profileUrl("Hayden Smith", "White Oak", "2028")} className={linkClass}>Hayden Smith</ProfileLink> (White Oak, 2028) — 2ND</li>
          <li>#18 <ProfileLink href={profileUrl("Jacob De La Torre", "Union Pines", "2028")} className={linkClass}>Jacob De La Torre</ProfileLink> (Union Pines, 2028) — 3RD</li>
        </ul>
        <p>Oakley (#27) defeated higher-ranked Smith (#4) decisively 9-2 in the finals. All three ranked wrestlers placed top-3, with Smith and De La Torre both navigating a bracket knowing they&apos;d face ranked opponents.</p>
      </BracketSection>

      <hr />

      <h2>Celebrating Our Iron Men</h2>
      <h3>The Ones Who Had a Choice—And Made the Hard One</h3>
      <figure className="my-6 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/nchsaa-2026-iron-man.png" alt="Wrestler in the arena—grit and choice" className="w-full h-auto object-cover" />
        <figcaption className="text-sm text-slate-500 p-3 text-center">
        <span className="italic block">They chose to stay.</span>
        <span className="text-xs text-slate-400 mt-1 block">Aidan Szewczyk — 138 lbs 7A Finalist</span>
      </figcaption>
      </figure>
      <p>In a 7-division system where <strong>82% of brackets are LIGHT</strong> (0-1 ranked wrestlers), most athletes compete at their natural weight in their assigned classification. They don&apos;t choose the competitive depth of their bracket. That&apos;s determined by the structure.</p>
      <p>If you&apos;re a 150-pounder in 5A and there are no ranked wrestlers at your weight, you didn&apos;t avoid competition. You&apos;re simply wrestling where you belong. You&apos;re a consequence of structural decisions made by leadership.</p>
      <p><strong>But some wrestlers had a choice.</strong></p>
      <p>They could have bumped up a weight class—or dropped down—and faced an easier bracket. Fewer ranked opponents. A clearer path to a state title.</p>
      <p>They chose to stay.</p>
      <p>These are our iron men:</p>
      <ul>
        <li>The wrestler who could have moved to 144 or 157 but stayed at 150 to face ranked opponents.</li>
        <li>The wrestler who could have cut to a lighter bracket but chose to compete where the competition was deepest.</li>
        <li>The wrestler who knew moving weight classes would give them a better shot at gold—and stayed anyway.</li>
      </ul>
      <p>That&apos;s the difference between circumstance and choice.</p>
      <div className="my-6 rounded-xl bg-amber-50 border-l-4 border-amber-500 p-4 sm:p-5">
        <p className="text-lg font-bold text-slate-800">Most wrestlers in light brackets didn&apos;t choose easy paths. The 7-division system created 80+ light brackets—most athletes are just wrestling where they naturally belong.</p>
        <p className="text-slate-700 mt-2"><strong>But iron men chose resistance when ease was available.</strong></p>
      </div>
      <p>They chose growth over guaranteed outcomes. They chose to test themselves when they could have taken the safer route.</p>
      <p>Wrestling teaches that growth comes from difficulty. You don&apos;t get stronger lifting light weights. You don&apos;t get better wrestling easy opponents.</p>
      <p><strong>Iron men understand this—and make choices accordingly.</strong></p>

      <hr />

      <h2>College Coaches Notice the Difference</h2>
      <p>When college coaches evaluate North Carolina wrestlers, they can clearly see which athletes competed in ELITE and STRONG brackets.</p>
      <p>The difference is measurable:</p>
      <ul>
        <li>A wrestler who won an ELITE bracket defeated multiple ranked opponents in a single tournament. They&apos;re battle-tested. They&apos;ve proven they can handle pressure repeatedly.</li>
        <li>A wrestler who won a LIGHT bracket faced zero ranked opponents. They&apos;re unproven against elite competition.</li>
      </ul>
      <div className="my-6 rounded-xl bg-[#C20017]/10 border-l-4 border-[#C20017] p-4 sm:p-5">
        <p className="text-lg font-bold text-slate-800">Both are state champions. But the context tells drastically different stories.</p>
      </div>
      <p>For college programs building rosters, iron men who seek competitive resistance are easier to project. They&apos;ve already proven they belong in deep fields.</p>
      <p>This is why performance at national events has become increasingly important for North Carolina wrestlers. College coaches need to see how athletes perform when the bracket is stacked.</p>
      <p>The iron men in ELITE and STRONG brackets already provided that proof at states.</p>

      <hr />

      <h2>What This Reveals</h2>
      <p><strong>Where ranked talent concentrated:</strong></p>
      <p>While 7A had the most ranked wrestlers of any single division (26 ranked wrestlers), the majority of ranked talent came from 6A and below (68% according to the full <a href={RANKINGS_HREF} className={linkClass}>prospect rankings</a>). This distribution aligns with North Carolina&apos;s developmental landscape where elite talent emerges from programs across all school sizes, not just the largest classifications.</p>
      <p><strong>Context for evaluation:</strong></p>
      <p>Understanding bracket composition helps provide context for individual performances and offers insight into where the state&apos;s competitive depth exists. For wrestlers pursuing college opportunities, this data illustrates why performance at national events has become increasingly important for evaluation.</p>
      <p><strong>The structural question:</strong></p>
      <p>This distribution reinforces the questions raised in our first article: When competitive depth varies this significantly across 98 brackets, what does that mean for championship meaning, recruiting clarity, and long-term development?</p>

      <hr />

      <h2>Looking Ahead</h2>
      <p>Every state champion earned their title by defeating everyone in their bracket. The data simply provides context for understanding the different competitive landscapes wrestlers navigated.</p>
      <div className="my-6 rounded-xl bg-[#003366]/10 border-l-4 border-[#003366] p-4 sm:p-5">
        <p className="text-lg font-bold text-slate-800">The wrestlers who competed in ELITE and STRONG brackets—all <strong>20 ranked wrestlers</strong> across these 6 weight classes—chose to compete in fields where every match tested them. They sought growth through resistance. North Carolina wrestling&apos;s future will be built by athletes who make those choices.</p>
      </div>
      <p>For North Carolina wrestling&apos;s continued growth as a developmental state, understanding where elite talent concentrates and how competitive depth varies can inform conversations about structure, development, and goals.</p>

      <hr />

      <p className="text-sm text-slate-500 italic">
        Data compiled from NC United Wrestling&apos;s pre-state <a href={RANKINGS_HREF} className={linkClassMuted}>rankings</a> and 2026 state championship results.
      </p>
      <p className="font-medium text-[#003366] mt-6">
        <strong>Continue to Part 3:</strong> <a href="/nchsaa/2026/news/three-join-the-immortals-2026" className="underline hover:no-underline text-[#003366]">Three Join the Immortals: North Carolina&apos;s Historic 2026 Four-Time State Champions</a>
      </p>
    </article>
  )
}

function BracketSection({
  imageKey,
  title,
  children,
}: {
  imageKey: string
  title: string
  children: React.ReactNode
}) {
  const imgSrc = BRACKET_IMAGES[imageKey]
  return (
    <div className="mb-8">
      <h3 className="!mt-6">{title}</h3>
      <div className={`grid gap-4 ${imgSrc ? "md:grid-cols-[1fr,minmax(200px,280px)]" : ""} md:items-start`}>
        <div>{children}</div>
        {imgSrc ? (
          <figure className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt={`${title} bracket or podium`} className="w-full h-auto object-cover" />
            <figcaption className="text-xs text-slate-500 p-2 text-center">Podium / bracket</figcaption>
          </figure>
        ) : (
          <div className="hidden md:block w-full max-w-[280px] rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center text-sm text-slate-400">
            Podium or bracket image — add to <code className="text-xs">BRACKET_IMAGES[{`"${imageKey}"`}]</code> when ready
          </div>
        )}
      </div>
    </div>
  )
}
