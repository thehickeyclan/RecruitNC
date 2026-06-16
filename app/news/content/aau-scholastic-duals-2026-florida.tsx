import type { ReactNode } from "react"
import Image from "next/image"
import { HardLink } from "@/components/hard-link"
import { AAU_SCHOLASTIC_DUALS_2026_BANNER } from "@/lib/aau-scholastic-duals-2026-content"
import { AAU_SCHOLASTIC_DUALS_2026_ROSTER } from "@/lib/aau-scholastic-duals-2026-roster"
import { aauScholasticProfileHref } from "@/lib/content/aau-scholastic-duals-2026-profile-ids"

const NHSCA_DUALS_NC_UNITED_MAT = "/images/aau-scholastic-2026-news/nhsca-duals-nc-united-mat.png"
const NHSCA_DUALS_TEAM_SINGLET = "/images/aau-scholastic-2026-news/nhsca-duals-team-singlet.png"

const athleteLinkClass =
  "font-semibold text-[#003366] underline decoration-[#003366]/40 underline-offset-2 hover:decoration-[#003366]"

function AthleteLink({
  name,
  profileIdMap,
  children,
}: {
  name: string
  profileIdMap: Record<string, string>
  children?: ReactNode
}) {
  return (
    <HardLink href={aauScholasticProfileHref(name, profileIdMap)} className={athleteLinkClass}>
      {children ?? name}
    </HardLink>
  )
}

export function AauScholasticDuals2026FloridaContent({
  profileIdMap = {},
}: {
  profileIdMap?: Record<string, string>
}) {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h2]:text-[#003366] [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_h4]:text-base [&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_hr]:my-8 [&_hr]:border-slate-200">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">RecruitNC News · June 2026</p>

      <p>
        Fresh off a Round of 32 finish at the NHSCA National Duals, the NC United National Team will once again
        represent North Carolina on a national stage as it travels to Fort Lauderdale, Florida, for the 2026 AAU
        Scholastic Duals.
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-[#0A1628] shadow-sm">
        <Image
          src={AAU_SCHOLASTIC_DUALS_2026_BANNER}
          alt="North Carolina National Team — AAU Wrestling Scholastic Duals, Fort Lauderdale, June 24–26, 2026"
          width={1200}
          height={675}
          className="block h-auto w-full"
          sizes="(max-width: 768px) 100vw, 48rem"
          priority
        />
        <figcaption className="border-t border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-600">
          NC United National Team — AAU Scholastic Duals · Fort Lauderdale · June 24–26, 2026
        </figcaption>
      </figure>

      <p>
        Held <strong>June 24–26</strong> at the Broward County Convention Center, the AAU Scholastic Duals is one of
        the nation&apos;s premier summer team wrestling events. The tournament brings together approximately 40–50
        elite teams from across the country for three days of folkstyle dual meet competition, providing athletes an
        opportunity to compete against some of the nation&apos;s best wrestlers while gaining valuable exposure in
        front of college coaches and wrestling programs.
      </p>
      <p>
        The event&apos;s dual meet format places an emphasis on team performance, lineup depth, and consistency across
        all weight classes. For many wrestlers, it is one of the most competitive summer opportunities available outside
        of national individual tournaments.
      </p>

      <h2>NC United National Team</h2>
      <p className="text-lg font-medium text-[#13294B]">
        Elite wrestlers representing North Carolina on the national stage.
      </p>
      <p>
        Fort Lauderdale will mark the <strong>fifth national tournament</strong> in which NC United has sent a squad to
        compete as <strong>North Carolina&apos;s National Team</strong> — not a club, not a single high school, but a
        statewide roster wearing Carolina colors against the country&apos;s best programs.
      </p>
      <p>
        Through four completed national-team events — including the 2026 NHSCA National Duals Round of 32 run — the
        program has built a track record worth carrying into Florida:
      </p>
      <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 not-prose">
        <div className="rounded-xl border border-slate-200 bg-[#13294B] px-4 py-5 text-center shadow-sm">
          <p className="text-2xl font-black tabular-nums text-[#D3B574] sm:text-3xl">4</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/90 sm:text-sm">
            National Tournaments
          </p>
          <p className="mt-1 text-[10px] text-white/60 sm:text-xs">Completed · AAU is #5</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-[#13294B] px-4 py-5 text-center shadow-sm">
          <p className="text-2xl font-black tabular-nums text-[#D3B574] sm:text-3xl">38</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/90 sm:text-sm">
            Elite Athletes
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-[#13294B] px-4 py-5 text-center shadow-sm">
          <p className="text-2xl font-black tabular-nums text-[#D3B574] sm:text-3xl">24-8</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/90 sm:text-sm">
            National Team Record
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-[#13294B] px-4 py-5 text-center shadow-sm">
          <p className="text-2xl font-black tabular-nums text-[#D3B574] sm:text-3xl">75%</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/90 sm:text-sm">
            Team Record Win %
          </p>
        </div>
      </div>
      <p className="text-sm text-slate-600">
        Stats reflect the NC United National squad through NHSCA Duals 2026 (Select teams excluded). Full archives,
        schedule, and registration live on the{" "}
        <HardLink href="/national-team" className={athleteLinkClass}>
          National Team hub
        </HardLink>
        .
      </p>
      <p>
        Families can find AAU Scholastic Duals info, roster updates, and checkout on the{" "}
        <HardLink href="/national-team/scholastic-duals-2026" className={athleteLinkClass}>
          AAU Scholastic Duals 2026 team page
        </HardLink>{" "}
        · Fort Lauderdale, June 2026.
      </p>

      <h2>A True North Carolina Team</h2>
      <p>The foundation of this team was built long before the trip to Florida.</p>
      <p>
        Every athlete on the roster is part of <strong>NC United Blue</strong>, North Carolina&apos;s premier high
        school training and competition program. Throughout the year, athletes from across the state train together at
        weekly practices hosted at both <strong>UNC Chapel Hill</strong> and <strong>NC State</strong>, creating a
        unique environment where many of North Carolina&apos;s top wrestlers regularly push each other to improve.
      </p>
      <p>
        Those relationships, training sessions, and shared experiences help create a true statewide team culture when
        national competition arrives.
      </p>
      <p>
        This year&apos;s AAU roster represents <strong>12 different high schools from across North Carolina</strong>{" "}
        and showcases some of the state&apos;s most accomplished athletes.
      </p>
      <p>Collectively, the roster includes:</p>
      <ul>
        <li>
          <strong>5 NHSCA All-American honors</strong>
        </li>
        <li>
          <strong>13 Individual State Championships</strong>
        </li>
        <li>
          <strong>More than 20 State Placements</strong>
        </li>
        <li>
          <strong>Three NCAA Division I commits</strong>
        </li>
      </ul>
      <p>Leading the group are Division I commits:</p>
      <ul>
        <li>
          <strong>
            <AthleteLink name="Tobin McNair" profileIdMap={profileIdMap} />
          </strong>{" "}
          — Binghamton University
        </li>
        <li>
          <strong>
            <AthleteLink name="Mac Johnson" profileIdMap={profileIdMap} />
          </strong>{" "}
          — Appalachian State University
        </li>
        <li>
          <strong>
            <AthleteLink name="Tye Johnson" profileIdMap={profileIdMap} />
          </strong>{" "}
          — Appalachian State University
        </li>
      </ul>
      <p>
        While these athletes represent different schools, clubs, and communities throughout North Carolina, they will
        compete together under one banner as they take on many of the top teams in the country.
      </p>

      <h2>2026 AAU Scholastic Duals Roster</h2>
      <p>
        NC United&apos;s starter lineup for Fort Lauderdale — full weight classes with the +5 lb bump per AAU rules.
        Registration, travel, and team operations details live on the{" "}
        <HardLink
          href="/national-team/scholastic-duals-2026"
          className="font-semibold text-[#003366] underline underline-offset-2 hover:no-underline"
        >
          AAU Scholastic Duals team page
        </HardLink>
        .
      </p>
      <div className="my-6 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[280px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#13294B] text-left text-white">
              <th className="px-4 py-3 font-semibold">Weight</th>
              <th className="px-4 py-3 font-semibold">Wrestler</th>
            </tr>
          </thead>
          <tbody>
            {AAU_SCHOLASTIC_DUALS_2026_ROSTER.map((row, i) => (
              <tr key={row.weightLabel} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                <td className="border-t border-slate-200 px-4 py-2.5 font-semibold tabular-nums text-[#13294B]">
                  {row.weightLabel}
                </td>
                <td className="border-t border-slate-200 px-4 py-2.5 font-medium text-slate-800">
                  {row.openSlot || !row.wrestler.trim() ? (
                    <span className="italic text-slate-400">Open — TBD</span>
                  ) : (
                    <AthleteLink name={row.wrestler} profileIdMap={profileIdMap} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="my-8 grid gap-4 sm:grid-cols-2">
        <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[3/4] w-full">
            <Image
              src={NHSCA_DUALS_NC_UNITED_MAT}
              alt="NC United wrestler between matches at NHSCA National Duals"
              fill
              className="object-cover object-top"
              sizes="(max-width: 640px) 100vw, 24rem"
            />
          </div>
          <figcaption className="border-t border-slate-200 px-3 py-2 text-center text-xs text-slate-600">
            NC United on the mat at NHSCA National Duals.
          </figcaption>
        </figure>
        <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[3/4] w-full">
            <Image
              src={NHSCA_DUALS_TEAM_SINGLET}
              alt="NC United national team singlet at NHSCA National Duals"
              fill
              className="object-cover object-center"
              sizes="(max-width: 640px) 100vw, 24rem"
            />
          </div>
          <figcaption className="border-t border-slate-200 px-3 py-2 text-center text-xs text-slate-600">
            NC United national team gear — same program heading to AAU Scholastic Duals.
          </figcaption>
        </figure>
      </div>

      <h2>Coaching Staff</h2>
      <p>
        NC United&apos;s coaching staff combines current Division I experience with proven leadership and athlete
        development.
      </p>

      <h3>Liam Hickey (NC State)</h3>
      <p>
        Hickey enters the event as an incoming sophomore at NC State after transferring from North Carolina. During his
        redshirt season, he posted an 8–4 record and captured the Appalachian State Open title.
      </p>
      <p>Prior to college, Hickey established himself as one of North Carolina&apos;s most accomplished wrestlers, earning:</p>
      <ul>
        <li>2× NHSCA All-American</li>
        <li>2× NCHSAA State Champion</li>
        <li>4× NCHSAA State Placer</li>
      </ul>
      <p>
        In addition to competing at the Division I level, Hickey is an active coach with The Wrestling Guild and works
        with youth and high school wrestlers throughout North Carolina.
      </p>

      <h3>Jake Dailey (NC State)</h3>
      <p>Dailey enters the summer following a breakout collegiate season that included:</p>
      <ul>
        <li>2026 NCAA Qualifier</li>
        <li>2026 ACC Championship Runner-Up at 184 pounds</li>
        <li>Multiple ranked victories during the season</li>
        <li>NWCA Scholar All-American honors</li>
      </ul>
      <p>
        After qualifying for his first NCAA Championships this past season, Dailey has quickly established himself as
        one of North Carolina&apos;s top young Division I wrestlers.
      </p>

      <hr />

      <h2>Representing North Carolina</h2>
      <p>
        The AAU Scholastic Duals will provide North Carolina&apos;s athletes another opportunity to test themselves
        against elite competition from across the country.
      </p>
      <p>For NC United, however, the mission extends beyond wins and losses.</p>
      <p>
        The program was founded on the belief that North Carolina&apos;s best wrestlers become better when they train
        together, compete together, and represent something larger than themselves.
      </p>
      <p>
        That philosophy has helped create one of the strongest statewide wrestling communities in the country and will
        once again be on display in Fort Lauderdale.
      </p>
      <p>For three days, these athletes won&apos;t represent individual clubs or high schools.</p>
      <p>They&apos;ll represent North Carolina.</p>
      <p className="text-lg font-bold text-[#003366]">Strength in Unity.</p>
    </article>
  )
}
