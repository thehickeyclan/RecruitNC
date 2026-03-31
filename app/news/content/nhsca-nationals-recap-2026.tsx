import Image from "next/image"

const NHSCA_RECAP_IMAGE = "/images/nhsca-nationals-recap-2026-team-photo.png"
const NHSCA_RECAP_JUNIORS_IMAGE = "/images/nhsca-nationals-recap-2026-juniors-photo.png"
const NHSCA_RECAP_SIGN_IMAGE = "/images/nhsca-nationals-recap-2026-sign.png"
const NHSCA_RECAP_VENUE_IMAGE = "/images/nhsca-nationals-recap-2026-venue.png"

export function NhscaNationalsRecap2026Content() {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_hr]:my-8 [&_hr]:border-slate-200">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        NC United Wrestling
      </p>
      <h2 className="!mt-2 !mb-2 text-[#003366]">NHSCA Nationals 2026 Recap</h2>
      <p className="text-base font-medium text-slate-600">
        Virginia Beach, Va. | March 2026 | By NC United Wrestling
      </p>

      <div className="my-6">
        <Image
          src={NHSCA_RECAP_IMAGE}
          alt="North Carolina wrestlers gathered at the 2026 NHSCA Nationals in Virginia Beach"
          width={1200}
          height={900}
          className="w-full h-auto rounded-lg object-cover"
        />
        <p className="mt-2 text-center text-sm italic text-slate-500">
          North Carolina athletes at the 2026 NHSCA Nationals in Virginia Beach.
        </p>
      </div>

      <p>
        North Carolina&apos;s wrestling program left the 2026 NHSCA High School Nationals with
        <strong> 18 All-Americans across four divisions</strong> — a performance that ranks
        <strong> eighth nationally</strong> and <strong>fourth in state history</strong>.
      </p>
      <p>
        The result validates something that has been quietly building for years. A state that once
        sent a handful of wrestlers to Virginia Beach and hoped for the best now arrives as a real
        national program, one capable of producing champions, multi-time placers, and college-bound
        wrestlers at every level of competition. At NHSCA, that matters more than anywhere else.
        This is the event where college coaches look for the next class, and this year they found
        North Carolina athletes everywhere they looked.
      </p>
      <p>
        One national title. One runner-up. Two third-place finishes. Five fourth-place finishes.
        Nine more wrestlers grinding their way to 5th through 8th place. Eighteen names on a list
        that grows more impressive every year. And seven of those eighteen arrived in Virginia
        Beach without a seed.
      </p>
      <p>
        That detail matters. Seeds exist to reward proven national performers. Going unseeded and
        still placing top eight means beating wrestlers the bracket expected to finish ahead of
        you. North Carolina did that seven times.
      </p>

      <div className="my-8 grid gap-4 md:grid-cols-[0.9fr_1.6fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <Image
            src={NHSCA_RECAP_SIGN_IMAGE}
            alt="NHSCA sign inside the tournament venue"
            width={1024}
            height={768}
            className="h-auto w-full rounded-md object-cover"
          />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <Image
            src={NHSCA_RECAP_VENUE_IMAGE}
            alt="Wide view of the mats and crowd at the 2026 NHSCA Nationals"
            width={1024}
            height={768}
            className="h-auto w-full rounded-md object-cover"
          />
        </div>
      </div>
      <p className="mt-2 text-center text-sm italic text-slate-500">
        Inside the 2026 NHSCA Nationals in Virginia Beach, where North Carolina produced 18
        All-Americans across four divisions.
      </p>

      <div className="my-8 grid gap-4 md:grid-cols-2">
        <blockquote className="rounded-xl border border-[#003366]/15 bg-[#003366]/5 p-5">
          <p className="my-0 text-lg font-semibold leading-relaxed text-[#003366]">
            &ldquo;Eighteen All-Americans and eighth in the country — that does not happen without
            years of work from a lot of people. What makes this class special is the depth across
            every division. The seniors who came back and delivered, the freshmen who showed up to
            Virginia Beach for the first time and placed. This is what NC wrestling looks like when
            the pipeline is working.&rdquo;
          </p>
          <footer className="mt-4 text-sm font-medium text-slate-600">
            Michael Macchiavello, Co-Founder, NC United Wrestling
          </footer>
        </blockquote>

        <blockquote className="rounded-xl border border-[#CBAF5D]/50 bg-[#CBAF5D]/10 p-5">
          <p className="my-0 text-lg font-semibold leading-relaxed text-[#003366]">
            &ldquo;Being in that corner all weekend, you see things the scoreboard does not show.
            These kids competed. They did not flinch in tough moments, they did not back down from
            hard draws, and they represented North Carolina the right way. I am proud of every one
            of them — the All-Americans and the ones who walked away with something to prove next
            year.&rdquo;
          </p>
          <footer className="mt-4 text-sm font-medium text-slate-600">
            Colton Palmer, Co-Founder &amp; Coach, NC United Wrestling
          </footer>
        </blockquote>
      </div>

      <hr />

      <h2>The Champion</h2>
      <p>
        No NC wrestler had a more dominant weekend than <strong>Braylen Yates</strong> of East
        Rowan. The freshman, seeded No. 4, went <strong>5-0 at 170 pounds</strong> to claim the
        Freshman national title without dropping a match. A clean run at this level sets a new
        benchmark for what North Carolina&apos;s developmental pipeline can produce at the freshman
        level.
      </p>

      <hr />

      <h2>The Senior Class Carries the Load</h2>
      <p>
        If one division defined NC&apos;s 2026 showing, it was the <strong>Senior</strong> class.
        North Carolina placed <strong>fifth nationally with seven Senior All-Americans</strong>,
        the most of any NC division. The context makes it even more impressive: this same class
        produced just two All-Americans as juniors in 2025. From two to seven in one year. That
        kind of jump comes from national experience, unfinished business, and a class arriving at
        its final season ready to deliver.
      </p>
      <p>
        <strong>Bentley Sly</strong> of Stuart Cramer authored one of the most important weekends
        of any NC wrestler. The 152-pound senior went <strong>6-1</strong>, reached the national
        final, finished runner-up, and cemented himself as a <strong>3x All-American</strong>{" "}
        (2024, 2025, 2026). His path included a win over the No. 3 seed N. Bull, and he leaves for
        Appalachian State as one of the most accomplished NHSCA competitors in state history.
      </p>
      <p>
        At 160 pounds, <strong>Dominic Blue</strong> of Union Pines finished
        <strong> 3rd</strong>, going <strong>5-1</strong> with <strong>three wins over seeded
        opponents</strong>. A 2x All-American (2023, 2026), Blue turned one of the best weekends
        of his career into a result that will command attention from college programs.
      </p>
      <p>
        <strong>Cael Dunn</strong> of South Davidson placed <strong>7th at 195</strong> with a
        6-2 record and wins over the No. 4 and No. 8 seeds. Heading to Campbell, Dunn exits as a
        2x All-American and one of the state&apos;s most tenacious upper-weight wrestlers.
        <strong> Andrew Meadows</strong> of Mount Airy added another Senior podium finish by taking
        7th at 170 before heading to The Citadel.
      </p>
      <p>
        <strong>Samuel Gantt</strong> of Pine Forest placed <strong>8th at 138</strong> with a
        win over a seeded opponent and heads to Roanoke College. <strong>Jacob Reigel</strong> of
        Uwharrie Charter placed <strong>8th at 182</strong> after going 4-3 with one seeded win
        and continues to Lynchburg. <strong>Avery Rhymer</strong> of St. Stephens capped his NHSCA
        career with an <strong>8th-place finish at 285</strong>, going 5-3 with
        <strong> three wins over seeded opponents</strong> before joining Sly at Appalachian State.
      </p>

      <hr />

      <h2>The Junior Class: Four AAs, Two at 160</h2>
      <p>
        The Junior division told a story of unusual depth at a single weight class. North Carolina
        put <strong>two All-Americans on the podium at 160 pounds</strong>.
      </p>
      <p>
        <strong>Carson Worrick</strong> of Davie entered unseeded and finished
        <strong> 4th</strong> after going <strong>7-2</strong> with
        <strong> four wins over seeded opponents</strong>, including victories over the No. 3, No.
        4, No. 5, and No. 9 seeds. It was one of the most impressive unseeded runs of the entire
        tournament.
      </p>
      <p>
        Alongside him, <strong>Tobin McNair</strong> of Wakefield, seeded No. 5, placed
        <strong> 5th at the same weight</strong> and earned his second All-American finish. Two NC
        wrestlers, same weight, same national event, both on the podium.
      </p>
      <p>
        <strong>Aiden White</strong> of Weddington went <strong>9-2</strong> and placed
        <strong> 4th at 132</strong> despite entering unseeded. He beat the No. 3 and No. 5 seeds
        in one of the deepest brackets in the tournament. <strong>Gavin Lopez</strong> of Green
        Hope finished <strong>4th at 220</strong> as the No. 6 seed, capping a
        <strong> 3x All-American</strong> career (2024, 2025, 2026) that puts him among the most
        accomplished NC juniors in NHSCA history.
      </p>

      <div className="my-6">
        <Image
          src={NHSCA_RECAP_JUNIORS_IMAGE}
          alt="North Carolina juniors at the 2026 NHSCA Nationals in Virginia Beach"
          width={900}
          height={1200}
          className="mx-auto h-auto w-full max-w-xl rounded-lg object-cover"
        />
        <p className="mt-2 text-center text-sm italic text-slate-500">
          North Carolina juniors during the 2026 NHSCA Nationals weekend in Virginia Beach.
        </p>
      </div>

      <hr />

      <h2>The Sophomore Class: Pipeline on Display</h2>
      <p>
        Three Sophomore All-Americans show that NC&apos;s national depth does not start and stop
        with upperclassmen.
      </p>
      <p>
        <strong>Garrett Young</strong> of Franklin placed <strong>3rd at 220</strong>. Entering as
        the No. 2 seed, Young went <strong>5-1</strong> with wins over the No. 5 seed M. Garno and
        the No. 10 seed. <strong>Drew Teeter</strong> of Mooresville placed
        <strong> 4th at 182</strong> with a win over the No. 2 seed D. Deshotels, and
        <strong> Ryan Thompson</strong> of Cardinal Gibbons earned
        <strong> 7th at 170</strong>, securing his second All-American finish.
      </p>

      <hr />

      <h2>The Freshman Class: A Foundation Built in Real Time</h2>
      <p>
        Four Freshman All-Americans, including a national champion, is the kind of class that
        shifts expectations for a state program.
      </p>
      <p>
        <strong>Carson Raper</strong> of South Rowan went <strong>8-2</strong> to place
        <strong> 4th at 106</strong>, the most wins of any NC freshman in the tournament.
        <strong> Isaac Young</strong> of Pisgah placed <strong>6th at 152</strong>, and
        <strong> Landon Gallagher</strong> of Charlotte Catholic finished
        <strong> 7th at 195</strong>. All three, along with Yates, return next year with national
        podium experience most of their peers will not have.
      </p>

      <hr />

      <h2>What It Means</h2>
      <p>
        Eighteen All-Americans. Eighth in the country. Fourth in state history.
      </p>
      <p>
        The headline numbers tell only part of the story. Six of NC&apos;s 18 All-Americans are
        multi-time honorees, building the kind of long-term national reputations that elevate an
        entire state. Five seniors now move on to college programs including Appalachian State,
        Campbell, Roanoke, The Citadel, and Lynchburg. And seven freshmen and sophomores who placed
        top eight now know what it takes to succeed on the biggest stage in high school wrestling.
      </p>
      <p>
        North Carolina is not arriving. It has arrived. And it is not finished.
      </p>

      <div className="my-8 rounded-xl border border-[#003366]/15 bg-[#003366]/5 p-5">
        <p className="my-0 text-sm font-semibold uppercase tracking-wide text-[#003366]">
          Explore the full dashboard
        </p>
        <p className="mb-0 mt-2">
          Full 2026 results, historical data, wrestler profiles, bracket results, and state
          rankings are live at{" "}
          <a
            href="/nhsca/2026"
            className="font-semibold text-[#003366] underline underline-offset-2"
          >
            app.ncwrestlingunited.com/nhsca/2026
          </a>
          .
        </p>
      </div>

      <hr />

      <h2>Inaugural NC United Most Outstanding Wrestler Awards</h2>
      <p>
        In recognition of NHSCA&apos;s place as the most influential tournament on NC athlete
        futures, NC United Wrestling is introducing the inaugural
        <strong> Most Outstanding Wrestler Award</strong> for the top performer in each division at
        NHSCA Nationals.
      </p>
      <ul>
        <li>
          <strong>Freshman:</strong> Braylen Yates (East Rowan, 170) — national champion, seeded
          No. 4
        </li>
        <li>
          <strong>Sophomore:</strong> Drew Teeter (Mooresville, 182) — 4th place, seeded No. 12,
          beat the No. 2 seed
        </li>
        <li>
          <strong>Junior co-winners:</strong> Aiden White (Weddington, 132) and Carson Worrick
          (Davie, 160) — both unseeded, both 4th place, both among the most disruptive runs of the
          tournament
        </li>
        <li>
          <strong>Senior:</strong> Bentley Sly (Stuart Cramer, 152) — national runner-up, 3x
          All-American
        </li>
      </ul>
    </article>
  )
}
