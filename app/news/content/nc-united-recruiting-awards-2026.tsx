/**
 * Editors: drop hero/athlete/logo assets under public/images/recruiting-awards-2026/
 * (see IMAGE_PATHS in lib/content/recruiting-awards-2026.ts). Missing files show navy/gold placeholders.
 *
 * RECRUITING_AWARDS_EDITORIAL_RULES:
 * - Bentley Sly is a 4× state champion, 3× NHSCA All-American, Ironman All-American, and App State Open runner-up.
 *   He is the ONLY NC wrestler to place at Super 32 in recent years — do NOT attribute Super 32 to anyone else.
 * - Andrew Meadows, Dominic Hittepole, Avery Rhymer, and Jacob Reigel are NHSCA All-Americans (NOT Super 32).
 * - Jacob Reigel's high school is Mount Pleasant.
 * - All commit and ranking counts are male-only.
 * - Use "ecosystem," never "pipeline," in body framing ("Emerging Pipeline" is the award proper noun).
 * - Lynchburg is in Virginia — no "coming home" / "stays in-state" framing; use Carolinas-and-Virginia corridor.
 */

import type { ReactNode } from "react"
import Image from "next/image"
import { AwardCard } from "@/components/news/award-card"
import { HardLink } from "@/components/hard-link"
import {
  RecruitingAwardsAthleteLandscapeFigure,
  RecruitingAwardsAthletePortraitFigure,
  RecruitingAwardsFloatSection,
  RecruitingAwardsProgramFigure,
} from "@/components/news/recruiting-awards-figure"
import { PullQuote } from "@/components/news/pull-quote"
import {
  RecruitingAwardsCommitsByCollegeChart,
  RecruitingAwardsDivisionDonutChart,
} from "@/components/news/recruiting-awards-article-graphics"
import { AWARD_WINNERS, IMAGE_PATHS } from "@/lib/content/recruiting-awards-2026"
import { recruitingAwardsProfileHref } from "@/lib/content/recruiting-awards-profile-ids"

const athleteLinkClass =
  "font-semibold text-[#003366] underline decoration-[#003366]/40 underline-offset-2 hover:decoration-[#003366]"

function AthleteLink({
  name,
  school,
  profileIdMap,
  children,
}: {
  name: string
  school: string
  profileIdMap: Record<string, string>
  children?: ReactNode
}) {
  return (
    <a href={recruitingAwardsProfileHref(name, school, profileIdMap)} className={athleteLinkClass}>
      {children ?? name}
    </a>
  )
}

export function NcUnitedRecruitingAwards2026Content({
  profileIdMap = {},
  collegeLogoMap = {},
}: {
  profileIdMap?: Record<string, string>
  collegeLogoMap?: Record<string, string>
}) {
  return (
    <article className="min-w-0 max-w-none overflow-x-hidden text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h2]:text-[#13294B] [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_hr]:my-8 [&_hr]:border-slate-200">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">NC United Wrestling</p>
      <p className="text-slate-600 font-medium">By NC United · May 2026</p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <div className="relative aspect-[16/9] w-full bg-[#13294B]">
          <Image
            src={IMAGE_PATHS.hero}
            alt="NC United Recruiting Awards — Class of 2026"
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 48rem"
            priority
          />
        </div>
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2 text-center text-sm text-slate-600">
          NC United Recruiting Awards — Class of 2026 male commits.
        </figcaption>
      </figure>

      <p>
        The signing season for North Carolina&apos;s Class of 2026 is in the books, and the picture it paints is one of a
        deepening ecosystem. Forty-nine wrestlers from across the state have committed to wrestle at the next level — from
        Division I rosters to NJCAA programs hunting for immediate contributors — and the pattern of where they landed
        tells you as much about the colleges doing the recruiting as it does about the talent leaving North Carolina&apos;s
        mats. See every ranked senior on the{" "}
        <HardLink href="/public-rankings/2026" className={athleteLinkClass}>
          Class of 2026 prospect rankings
        </HardLink>
        .
      </p>
      <p>
        Below, we hand out four awards to the colleges that did the most recruiting North Carolina&apos;s Class of 2026.
        The criteria are simple: who took home the volume, who took home the top end, who found the most value, and who
        built the most promising new path into the state.
      </p>

      <RecruitingAwardsCommitsByCollegeChart />
      <RecruitingAwardsDivisionDonutChart />

      <div className="my-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#003366]">NC United Recruiting Awards</p>
        <h3 className="mt-1 text-lg font-bold text-[#13294B]">The Four Winners — Class of 2026</h3>
        <div className="not-prose mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
          {AWARD_WINNERS.map((winner) => (
            <AwardCard
              key={winner.award}
              award={winner.award}
              college={winner.college}
              stat={winner.stat}
              logoUrl={collegeLogoMap[winner.college]}
              featuredAthletes={winner.featuredAthletes.map((athlete) => ({
                name: athlete.name,
                rank: athlete.rank,
                href: recruitingAwardsProfileHref(athlete.name, athlete.school, profileIdMap),
              }))}
            />
          ))}
        </div>
      </div>

      <hr />

      <h2>Top Haul: UNC Pembroke</h2>
      <RecruitingAwardsProgramFigure
        src={IMAGE_PATHS.uncpProgram}
        alt="UNC Pembroke Braves wrestling room"
        caption="UNC Pembroke Braves wrestling room"
      />
      <p>
        It wasn&apos;t close. UNC Pembroke walked away with seven North Carolina commits — Deyari El-Amin, Gavin Yow,
        James Campos, Cameron Massey, Abe Rodriguez, Kaulton Kuddie, and Imon Freeman — more than any other program in
        the state, regardless of division.
      </p>
      <p>
        What makes the haul matter is that the Braves didn&apos;t just win on volume. The Braves landed three ranked
        wrestlers in the process.{" "}
        <AthleteLink name="Imon Freeman" school="Montgomery Central" profileIdMap={profileIdMap}>
          Imon Freeman
        </AthleteLink>
        , ranked #11 in the class, is a two-time state champion who closed out his senior season with a 5A title at
        Montgomery Central.{" "}
        <AthleteLink name="Gavin Yow" school="A.L. Brown" profileIdMap={profileIdMap}>
          Gavin Yow
        </AthleteLink>
        , #13, finished his senior season at A.L. Brown with a 7A title at 190 and a 4.3 GPA to match the production on
        the mat. And the volume runs deep across weights, from Abe Rodriguez at 126 up through Kaulton Kuddie at 190 —
        exactly the kind of full-lineup recruiting that builds a sustainable program from the ground up.
      </p>
      <p>
        Seven commits from a single class is a statement. UNC Pembroke made North Carolina its backyard, and the backyard
        delivered.
      </p>

      <hr />

      <h2>Best Top-End Class: Appalachian State</h2>
      <RecruitingAwardsProgramFigure
        src={IMAGE_PATHS.appStateProgram}
        alt="Appalachian State wrestling at Barker Arena"
        caption="Appalachian State wrestling — Barker Arena"
      />
      <RecruitingAwardsFloatSection>
        <RecruitingAwardsAthletePortraitFigure
          src={IMAGE_PATHS.bentleySly}
          alt="Bentley Sly, Stuart Cramer, App State commit"
          caption="Bentley Sly — Stuart Cramer, App State commit"
        />
        <p>
          If UNC Pembroke won on volume, Appalachian State won on ceiling. The Mountaineers landed the consensus #1 wrestler
          in the entire class —{" "}
          <AthleteLink name="Bentley Sly" school="Stuart Cramer" profileIdMap={profileIdMap}>
            Bentley Sly
          </AthleteLink>{" "}
          — along with #12{" "}
          <AthleteLink name="Avery Rhymer" school="St. Stephens" profileIdMap={profileIdMap}>
            Avery Rhymer
          </AthleteLink>
          , giving them the most decorated single haul of the class.
        </p>
        <p>
          Sly&apos;s résumé is the kind that doesn&apos;t come around often. The Stuart Cramer star is a four-time state
          champion, a three-time NHSCA All-American, and an Ironman All-American — and as a senior he took second at the App
          State Open, a college tournament loaded with Division I hammers. Beating that level of competition before
          he&apos;s even set foot on campus tells you exactly what App State is getting. He is, by any reasonable measure,
          the crown jewel of North Carolina&apos;s 2026 class, and he&apos;s staying in-state to wrestle Division I at App
          State.
        </p>
        <p>
          Rhymer wasn&apos;t simply a supporting piece. He finished his career as a state champion, NHSCA All-American, and
          one of the most consistent upper-weight performers in North Carolina. Two Division I signees, one of them the best
          wrestler in the state — that&apos;s how you win the top-end award. Quality over quantity, and the quality here is
          undeniable.
        </p>
      </RecruitingAwardsFloatSection>
      <PullQuote attribution="Appalachian State">
        The most decorated single haul of the class.
      </PullQuote>

      <hr />

      <h2>Best Value Find: Lynchburg</h2>
      <p>
        The value award goes to the program that punched above its recruiting weight, and no one did that better than
        Lynchburg. Here&apos;s the kicker: Lynchburg&apos;s wrestling program doesn&apos;t even exist on a mat yet.
        It&apos;s a net-new program, built from the ground up this year under head coach Vinny Barber and set to debut
        next season. And in its very first recruiting class, with no roster, no results, and no history to sell, it pulled
        six North Carolina commits — Joseph Trahan, Fares Alkurdasi, Cody Bui, Josh Brezac, Jacob Reigel, and Cameron Gue.
      </p>
      <p>
        For facility context and the longer Lynchburg story, see our earlier feature:{" "}
        <HardLink href="/news/lynchburg-building-a-program-with-intention" className={athleteLinkClass}>
          Building a Program with Intention
        </HardLink>
        .
      </p>
      <RecruitingAwardsProgramFigure
        src={IMAGE_PATHS.lynchburgProgram}
        alt="Lynchburg Hornets wrestling"
        caption="Lynchburg Hornets wrestling"
        contain
      />
      <RecruitingAwardsFloatSection>
        <p>
          The headline gets are the two ranked wrestlers.{" "}
          <AthleteLink name="Jacob Reigel" school="Mount Pleasant" profileIdMap={profileIdMap}>
            Jacob Reigel
          </AthleteLink>
          , the #15 wrestler in the class out of Mount Pleasant, is a two-time state runner-up and an NHSCA All-American who
          closed his senior season placing eighth in the country.{" "}
          <AthleteLink name="Cameron Gue" school="Mount Pleasant" profileIdMap={profileIdMap}>
            Cameron Gue
          </AthleteLink>
          , ranked #29, brings a 4A state title and a long history of national-tournament reps dating back multiple seasons.
          Landing two ranked, nationally-tested wrestlers without the recruiting advantages traditionally associated with
          established Division I or Division II programs is the definition of a value find.
        </p>
        <p>
          Six commits, two of them ranked, before the program has wrestled a single match — Barber built a debut class from
          nothing that programs with decades of history would be proud of.
        </p>
      </RecruitingAwardsFloatSection>
      <PullQuote attribution="Lynchburg">
        Six commits, two of them ranked, before the program has wrestled a single match.
      </PullQuote>

      <hr />

      <h2>Emerging Pipeline: The Citadel</h2>
      <RecruitingAwardsProgramFigure
        src={IMAGE_PATHS.citadelProgram}
        alt="The Citadel Bulldogs wrestling at McAlister Field House"
        caption="The Citadel Bulldogs — McAlister Field House"
      />
      <RecruitingAwardsFloatSection>
        <RecruitingAwardsAthleteLandscapeFigure
          src={IMAGE_PATHS.andrewMeadows}
          alt="Andrew Meadows signing day with Mount Airy and The Citadel"
          caption="Andrew Meadows — Mount Airy signing day, The Citadel"
        />
        <p>
          The fourth award recognizes a program building a brand-new path into North Carolina, and The Citadel made the
          most convincing case. The Bulldogs landed two ranked Division I commits —{" "}
          <AthleteLink name="Andrew Meadows" school="Mount Airy" profileIdMap={profileIdMap}>
            Andrew Meadows
          </AthleteLink>{" "}
          (#6) and{" "}
          <AthleteLink name="Dominic Hittepole" school="Wheatmore" profileIdMap={profileIdMap}>
            Dominic Hittepole
          </AthleteLink>{" "}
          (#22) — from a state that hasn&apos;t historically fed their roster.
        </p>
        <p>
          At #6 in the class,{" "}
          <AthleteLink name="Andrew Meadows" school="Mount Airy" profileIdMap={profileIdMap}>
            Meadows
          </AthleteLink>{" "}
          is one of the top-ranked commits in the entire 2026 pool — a three-time state champion out of Mount Airy and an
          NHSCA All-American.{" "}
          <AthleteLink name="Dominic Hittepole" school="Wheatmore" profileIdMap={profileIdMap}>
            Hittepole
          </AthleteLink>{" "}
          brings his own decorated résumé: a two-time state champion at Wheatmore and an NHSCA All-American, with a 4.2
          GPA to match. Two Division I-caliber wrestlers, both ranked, both NHSCA All-Americans — that&apos;s not an
          accident, it&apos;s the start of a new recruiting relationship with the state.
        </p>
      </RecruitingAwardsFloatSection>
      <p>
        What makes this more than a one-off is the leadership now driving it. In May 2026, The
        Citadel named Tim McCall as the Bulldogs&apos; wrestling head coach, and his background explains everything about
        why North Carolina is suddenly in play. McCall is a North Carolina native out of Hope Mills who spent nearly a
        decade at NC State, first as a training center athlete and later as an assistant coach, a stretch in which he
        helped them win four consecutive ACC Championships and aided in the development of 17 ACC Champions. A coach with
        those roots and that résumé knows exactly where the talent is in this state and how to recruit it.
      </p>

      <aside className="my-6 rounded-xl border border-[#003366]/25 bg-[#003366]/5 p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[#003366]">Source</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          The Citadel Athletics, &ldquo;The Citadel Announces Tim McCall as Wrestling Head Coach,&rdquo; May 20, 2026.{" "}
          <a
            href="https://citadelsports.com/news/2026/5/20/the-citadel-announces-tim-mccall-as-wrestling-head-coach.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#003366] underline underline-offset-2"
          >
            Official announcement
          </a>
          . McCall is a Hope Mills, NC native who spent nearly a decade at NC State (RTC athlete, then assistant),
          contributing to four consecutive ACC team titles.
        </p>
      </aside>

      <PullQuote attribution="The Citadel">
        With McCall now leading it, we believe this is only the beginning.
      </PullQuote>
      <p>
        Pulling two of North Carolina&apos;s most accomplished wrestlers in a single class signals a program that has
        decided the state is worth recruiting — and with McCall now leading it, we believe this is only the beginning.
      </p>

      <hr />

      <h2>The Bigger Picture</h2>
      <p>
        What ties these awards together is regional reach. The data has been consistent on this point: the overwhelming
        majority of North Carolina&apos;s college wrestlers choose a school within a few hours of home, and this class
        reinforced it. UNC Pembroke and Appalachian State kept top talent in-state, while regional programs just across
        the border — Lynchburg and Roanoke among them — pulled NC wrestlers into the same tight Carolinas-and-Virginia
        corridor that the state&apos;s families increasingly favor. These programs aren&apos;t competing with the rest
        of the country for this talent so much as competing with each other for athletes who, more often than not, want to
        stay close.
      </p>
      <p>
        That&apos;s the quiet story of the Class of 2026. The ecosystem isn&apos;t just producing wrestlers — it&apos;s
        keeping them in the region, developing them, and feeding them into a network of programs that have learned
        exactly where to look.
      </p>
      <p className="flex flex-wrap gap-3 text-sm text-slate-600">
        <HardLink
          href="/public-rankings/2026"
          className="inline-flex items-center rounded-md border-2 border-[#C20017] bg-transparent px-4 py-2 text-sm font-semibold text-[#C20017] transition-colors hover:bg-[#C20017] hover:text-white"
        >
          Open the Class of 2026 rankings →
        </HardLink>
        <HardLink
          href="/athletes"
          className="inline-flex items-center rounded-md border-2 border-[#003366] bg-transparent px-4 py-2 text-sm font-semibold text-[#003366] transition-colors hover:bg-[#003366] hover:text-white"
        >
          Browse all 2026 commits →
        </HardLink>
      </p>
    </article>
  )
}
