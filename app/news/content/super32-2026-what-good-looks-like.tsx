import Image from "next/image"
import Link from "next/link"

const BENTLEY = "/images/news/super32-2026-preview/bentley-sly.png"

const profile = (id: string) => `/view-profile?id=${id}`
const SLY = profile("8c0162c0-b367-4675-bf9d-6ff862275adf")
const EDWARDS = profile("7e75a3e1-2646-4268-84f5-06865962ee00")
const EVANS = profile("73cc5404-b987-4fa4-9192-768cd5124dd8")
const BANE = profile("13547c76-4780-481c-bb47-eba4182a365b")
const SAMUEL = profile("cb19d9e6-c779-478b-954f-939bd818250a")
const KITCHEN = profile("b2586489-a8b9-4251-9e35-356e8ff813f4")
const WHITE = profile("a95c204d-785c-427a-98cf-1930410b0dc7")
const THOMAS = profile("ca4cdc62-99ac-4951-bab6-6577885aad3e")
const MYLES = profile("d5a61e49-a014-4123-86f1-816bb5c05fd6")
const MAC_JOHNSON = profile("5cb8dcb5-6989-4a34-9db2-a33a2487100e")
const CAMBRUZZI = profile("25f19ade-8632-47b1-8b28-81afd2ea8a04")
const REECE = profile("270fcf81-8337-4581-8a17-ff0093a1b6af")
const ELLISON = profile("a31bf725-32b8-4550-aff5-c74c59d97311")
const SEDGWICK = profile("7cf32563-e793-4272-ac9b-4718114473cc")
const YATES = profile("cfd61be9-da05-49f5-ba93-5d62df3862da")
const LOPEZ = profile("da7e32d2-bbdc-4b0e-ac70-ecb6ac67ed10")
const WORRICK = profile("2608f74c-1262-44dd-9097-c990ed3c0166")
const TEETER = profile("5d34ba2f-5111-45ee-8536-cb1bb759cea1")
const RAPER = profile("68696afb-0b22-465c-b22e-82e84913144e")
const MCNAIR = profile("63ea613d-0886-4af0-b64b-1c3d80fe0332")
const AMIOTT = profile("7bb99ea9-a0ff-4cd0-91f8-217327959105")
const KEZIAH = profile("cc8c7471-4f23-4195-b286-ef12807f82e4")
const KHIRY_REESE = profile("ec8ad14e-8d5e-4717-8fd3-147adc697af7")
const TAYLOR = profile("6020b56d-982d-48db-b191-c737388094fb")
const PARDO = profile("d1b5dca0-2b62-4247-96d1-81a8a609f352")
const PADEN = profile("571ec1bb-173a-48c8-bea7-7162a803530a")

function P({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-[#003366] underline decoration-[#D3B574] underline-offset-2 hover:text-[#13294B]">
      {children}
    </Link>
  )
}

/** Three years of North Carolina at Super 32, computed from every bout (fact-checked 21 Oct 2026). */
const BASELINE = [
  { year: 2023, boys: 95, boysRecord: "83-190 (30%)", boysWinning: 10, boysPlacers: 0, girls: 32, girlsRecord: "20-64 (24%)", girlsWinning: 1, girlsPlacers: 1 },
  { year: 2024, boys: 106, boysRecord: "98-212 (32%)", boysWinning: 14, boysPlacers: 0, girls: 34, girlsRecord: "21-69 (23%)", girlsWinning: 3, girlsPlacers: 2 },
  { year: 2025, boys: 90, boysRecord: "76-180 (30%)", boysWinning: 7, boysPlacers: 1, girls: 40, girlsRecord: "27-82 (25%)", girlsWinning: 4, girlsPlacers: 3 },
]

function BaselineTable({ side }: { side: "boys" | "girls" }) {
  const boys = side === "boys"
  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-slate-200">
      <p className="bg-[#003366] px-3 py-2 text-sm font-black uppercase tracking-[0.12em] text-[#D3B574]">
        {boys ? "Boys" : "Girls"}
      </p>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-[#003366]">
          <tr>
            <th className="px-3 py-2 font-bold">Year</th>
            <th className="px-3 py-2 font-bold">NC {side}</th>
            <th className="px-3 py-2 font-bold">Record</th>
            <th className="px-3 py-2 font-bold">Winning records</th>
            <th className="px-3 py-2 font-bold">Placers</th>
          </tr>
        </thead>
        <tbody>
          {BASELINE.map((r) => (
            <tr key={r.year} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
              <td className="px-3 py-2 font-bold text-[#003366]">{r.year}</td>
              <td className="px-3 py-2">{boys ? r.boys : r.girls}</td>
              <td className="px-3 py-2">{boys ? r.boysRecord : r.girlsRecord}</td>
              <td className="px-3 py-2">{boys ? r.boysWinning : r.girlsWinning}</td>
              <td className="px-3 py-2">{boys ? r.boysPlacers : r.girlsPlacers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClaimAd() {
  return (
    <aside className="not-prose my-10 overflow-hidden rounded-2xl border border-[#D3B574]/40 bg-gradient-to-br from-[#0A1628] via-[#13294B] to-[#0A1628] p-6 text-center shadow-xl sm:p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#D3B574]">RecruitNC profiles</p>
      <p className="mt-3 text-xl font-black leading-snug text-white sm:text-2xl">
        Claim your profile to be seen by more than 100 college coaches across the country.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/75">
        Add a cell number and GPA, and the results, the coach interest and any messages from college coaches come
        straight to you.
      </p>
      <div className="mt-5 flex justify-center">
        <Link
          href="/create-profile"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#D3B574] px-5 text-sm font-extrabold uppercase tracking-[0.12em] text-[#0A1628] no-underline hover:bg-[#e2c98d] sm:w-auto"
        >
          Claim your profile
        </Link>
      </div>
    </aside>
  )
}

function PlanCard({ eyebrow, title, body, href, cta }: { eyebrow: string; title: string; body: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B8963E]">{eyebrow}</p>
      <p className="mt-2 text-lg font-black leading-snug text-[#003366]">{title}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{body}</p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#003366] px-5 py-2 text-center text-sm font-extrabold uppercase tracking-[0.12em] text-white no-underline hover:bg-[#13294B]"
      >
        {cta}
      </Link>
    </div>
  )
}

export function Super32WhatGoodLooksLikeContent() {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h2]:text-[#003366] [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_hr]:my-8 [&_hr]:border-slate-200">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">NC United Wrestling</p>
      <p className="text-base font-medium text-slate-600">Greensboro, N.C. | October 24–25 | By NC United Wrestling</p>

      <p>
        Super 32 is back in Greensboro this weekend, Oct. 24–25 at the Greensboro Coliseum Complex. It is the
        toughest folkstyle tournament of the year, and it is in our backyard. Last year more than 1,500 boys entered
        the high school tournament across 14 weights, and placing means finishing top 8 of the most elite wrestlers in
        the country. The boys wrestle folkstyle; the girls&apos; tournament is freestyle.
      </p>
      <p>
        Every year North Carolina sends well over a hundred wrestlers. So before this weekend, a fair question: what
        does a good Super 32 actually look like for North Carolina? We pulled every bout North Carolina wrestled at the
        last three Super 32s to answer it.
      </p>

      <h2>The baseline: three years of North Carolina at Super 32</h2>
      <BaselineTable side="boys" />
      <BaselineTable side="girls" />
      <p className="text-sm italic text-slate-500">
        North Carolina means wrestlers registered from North Carolina, leaving out the few who attend high school in
        another state. Byes are not counted as wins; forfeits are.
      </p>

      <p>Three things stand out.</p>
      <p>
        <strong>1. About half of North Carolina&apos;s wrestlers go 0-2.</strong> Every year, roughly half the boys and
        well over half the girls leave without a win. That is not a knock on them. It is what a bracket full of state
        champions does to anyone who has not yet wrestled at that level.
      </p>
      <p>
        <strong>2. North Carolina wins about three of every ten matches.</strong> The number has barely moved: 30%, 32%,
        30% for the boys.
      </p>

      <figure className="not-prose my-8">
        <Image
          src={BENTLEY}
          alt="Bentley Sly with his hand raised"
          width={570}
          height={832}
          className="mx-auto h-auto w-full max-w-sm rounded-lg"
        />
        <figcaption className="mt-2 text-center text-sm italic text-slate-500">
          Bentley Sly (Stuart Cramer): four-time state champion and Super 32 All-American.
          <span className="mt-1 block text-xs not-italic text-slate-400">
            Photo:{" "}
            <a href="https://www.instagram.com/rhetthoy_photography/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-600">
              @rhetthoy_photography
            </a>
          </span>
        </figcaption>
      </figure>

      <p>
        <strong>3. The podium has been hard to reach.</strong> In three years, one North Carolina boy has placed:{" "}
        <P href={SLY}>Bentley Sly</P> (Stuart Cramer), fourth at 150 last year, going 8-2. In 2023 and 2024, North
        Carolina boys reached the round of 12, one win from the podium, but none placed. The girls have placed one, two
        and three: <P href={EDWARDS}>Leah Edwards</P> (fifth at 106) in 2023, <P href={EVANS}>Kaylah Evans</P> (seventh
        at 160) and Sumaiya Aamoud (eighth at 148) in 2024, and <P href={BANE}>Faith Bane</P>,{" "}
        <P href={SAMUEL}>Lauren Samuel</P> and <P href={KITCHEN}>Savada Kitchen</P> last year.
      </p>
      <p>
        Two more names worth knowing. Jaclyn Bouzakis won the 100-pound girls&apos; title in both 2024 and 2025; she
        registers as North Carolina, an affiliation we love, but competes for Wyoming Seminary in Pennsylvania. Jack
        Harty also registers as North Carolina but does not currently compete for a North Carolina high school. Neither
        is counted in North Carolina&apos;s numbers in this article.
      </p>

      <h2>This year&apos;s field</h2>
      <p>
        North Carolina&apos;s entry is the biggest of the last three years: 176 wrestlers, 131 boys and 45 girls. On the
        boys&apos; side, 33 are reigning state champions (NCHSAA or NCISAA), more than half placed at states last winter,
        and 61 are seniors. Last year&apos;s top North Carolina finishers, Bentley Sly (fourth) and Faith Bane (sixth),
        have graduated, so the boys&apos; podium hopes rest on a new group.
      </p>
      <p>
        <strong>Boys who have already won at Super 32.</strong> <P href={WHITE}>Aiden White</P> (Weddington) went 4-2
        last year and placed fourth at NHSCA Nationals as a junior. <P href={THOMAS}>Jaxon Thomas</P> (Piedmont) went
        3-2. <P href={MYLES}>Liam Myles</P> (Union Pines), <P href={MAC_JOHNSON}>Mac Johnson</P> (Cape Fear),{" "}
        <P href={CAMBRUZZI}>Colt Cambruzzi</P> (Providence), <P href={REECE}>Connor Reece</P> (Northwest Guilford),{" "}
        <P href={ELLISON}>Aaron Ellison</P> (Lumberton) and <P href={SEDGWICK}>Jekai Sedgwick</P> (Hoke County) each won
        two matches last year.
      </p>
      <p>
        <strong>Boys with national results.</strong> <P href={YATES}>Braylen Yates</P> (Topsail, formerly East Rowan) is
        the reigning NHSCA freshman national champion and placed fourth at Fargo in 16U freestyle.{" "}
        <P href={LOPEZ}>Gavin Lopez</P> (Green Hope) has placed at NHSCA Nationals three years running, fourth as a
        junior, and finished runner-up at the Journeymen Fall Classic this month. <P href={WORRICK}>Carson Worrick</P>{" "}
        (Davie), <P href={TEETER}>Drew Teeter</P> (Mooresville) and <P href={RAPER}>Carson Raper</P> (South Rowan) each
        placed fourth at NHSCA Nationals last spring; <P href={MCNAIR}>Tobin McNair</P> (Wakefield) was fifth. Aaron
        Ellison and <P href={AMIOTT}>Jake Amiott</P> (Topsail) are Fargo placers.
      </p>
      <p>
        <strong>Girls.</strong> Two of last year&apos;s three North Carolina placers are back: Lauren Samuel, seventh at
        124, and Savada Kitchen (Brevard), eighth at 200. <P href={KEZIAH}>Rylynn Keziah</P> (Parkwood) won an NHSCA
        national title last spring and placed seventh at Fargo in the Junior division.{" "}
        <P href={KHIRY_REESE}>Khiry Reese</P> (Rosewood) was third at NHSCA, <P href={TAYLOR}>Ella Taylor</P> (Cary)
        eighth, and <P href={PARDO}>Mia Pardo</P> (Jack Britt) placed fifth at Fargo in 16U.{" "}
        <P href={PADEN}>Riley Paden</P> (South Mecklenburg) won two matches here last year.
      </p>
      <p>
        College coaches are paying attention: more than 50 of the North Carolina wrestlers in this field are on at
        least one college program&apos;s RecruitNC board.
      </p>

      <h2>What &ldquo;good&rdquo; looks like this weekend</h2>
      <p>
        Measured against that baseline, here is what would make this a good Super 32 for North Carolina, and what would
        make it a great one.
      </p>
      <h3>For the boys</h3>
      <ul>
        <li>
          <strong>Good:</strong> two or more placers, and more than 14 wrestlers with winning records (beating the best
          of the last three years).
        </li>
        <li>
          <strong>Great:</strong> three or more placers, and a team winning percentage above a third.
        </li>
        <li>
          <strong>Historic:</strong> a North Carolina boy in a Super 32 final.
        </li>
      </ul>
      <h3>For the girls</h3>
      <ul>
        <li>
          <strong>Good:</strong> four or more placers, one more than North Carolina&apos;s best year.
        </li>
        <li>
          <strong>Great:</strong> five or more placers, and six or more winning records.
        </li>
        <li>
          <strong>Historic:</strong> a North Carolina girls&apos; champion.
        </li>
      </ul>
      <h3>For one wrestler</h3>
      <p>
        A winning record at Super 32 is a strong weekend. Last year only 11 of 130 North Carolina wrestlers managed one.
        Only about half the boys&apos; field wins two matches. Placing takes a deep run through the bracket and the
        consolations: Bentley Sly won eight matches on the way to fourth, and Lauren Samuel won four to place seventh.
      </p>

      <h2>Why it matters beyond the bracket</h2>
      <p>
        College coaches are on RecruitNC this week starring the North Carolina wrestlers they plan to watch in
        Greensboro. Within 24 hours of Sunday&apos;s finals, every coach gets a report on each wrestler they starred:
        placement, record, significant wins and notable losses. A wrestler does not have to place to help his
        recruiting. Two good wins over seeded opponents will be in front of the coaches who asked about him.
      </p>

      <h2>How to follow</h2>
      <p>
        After the event, results will be on RecruitNC, on North Carolina wrestlers&apos; profiles. College coaches from
        programs in more than 20 states recruit on RecruitNC. If your wrestler&apos;s profile isn&apos;t claimed, claim it
        this week.
      </p>
      <ClaimAd />

      <h2>Go deeper</h2>
      <div className="not-prose my-6 grid gap-4 sm:grid-cols-2">
        <PlanCard
          eyebrow="$9.99/month"
          title="See the College Prospect Rankings and which colleges are looking"
          body="North Carolina's College Prospect Rankings by class, men's and women's, and the Top 75 College Ready Prospects, plus the names of the college programs that have viewed your wrestler's profile."
          href="/rankings"
          cta="See the College Prospect Rankings"
        />
        <PlanCard
          eyebrow="$24.99/month"
          title="Interested in wrestling in college? The Recruiting Command Center"
          body="A recruiting plan for your wrestler's grade, every college program on one map with coaching staff and recruiting questionnaires, a college list that tracks every school from interested to offer, coach emails drafted from verified results, and Scout, your recruiting assistant."
          href="/command-center"
          cta="See the Command Center"
        />
      </div>
    </article>
  )
}
