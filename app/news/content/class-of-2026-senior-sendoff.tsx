import Image from "next/image"
import { HardLink } from "@/components/hard-link"

/** Featured image: same asset as `lib/news.ts` for previews; article page does not duplicate it above the card (see `app/news/[slug]/page.tsx`). */

const SENDOFF_HERO_SRC = "/images/class-of-2026-senior-sendoff-hero.png"

export function ClassOf2026SeniorSendoffContent() {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h2]:text-[#003366] [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_hr]:my-8 [&_hr]:border-slate-200">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">NC United Wrestling</p>
      <h2 className="!mt-2 !mb-2 text-[#003366]">
        <span className="text-[#003366]">Final Class of 2026 Rankings: A Senior Sendoff</span>
      </h2>
      <p className="text-base font-medium text-slate-600">
        Celebrating North Carolina&apos;s Class of 2026 as they transition to the next level. The 2026 board is now
        archived as RecruitNC focuses public rankings on active recruiting classes.
      </p>
      <p className="text-sm text-slate-600">
        <HardLink
          href="/public-rankings"
          className="inline-flex items-center rounded-md border-2 border-[#C20017] bg-transparent px-4 py-2 text-sm font-semibold text-[#C20017] transition-colors hover:bg-[#C20017] hover:text-white"
        >
          Open current prospect rankings →
        </HardLink>
      </p>

      <figure className="my-8 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
        <div className="relative mx-auto aspect-[387/463] w-full max-h-[min(72vh,560px)] min-h-[240px]">
          <Image
            src={SENDOFF_HERO_SRC}
            alt="North Carolina Class of 2026 — senior celebration"
            fill
            className="object-contain object-center p-2 sm:p-4"
            sizes="(max-width: 768px) 100vw, 48rem"
            priority
          />
        </div>
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2 text-center text-sm text-slate-600">
          Class of 2026 — thank you for representing North Carolina.
        </figcaption>
      </figure>

      <p>
        The Class of 2026 has officially closed the chapter on their high school wrestling careers. Last weekend at
        NHSCA High School Nationals in Virginia Beach, seven seniors earned All-American honors in their final national
        tournament — a fitting end to a class that has made North Carolina proud at every level of competition.
      </p>
      <p>
        This group leaves behind a legacy that extends far beyond the mat. Seven NHSCA All-Americans. A Super 32
        All-American. An IronMan All-American. Three four-time state champions. College open champions, finalists, and
        placers who competed against Division I athletes during their pre-season and in-season competition as part of a
        relatively new movement in high school wrestling. Scholars who balanced excellence in the classroom with
        dominance on the mat.
      </p>

      <hr />

      <h2>A Legacy of Excellence</h2>
      <p>This class didn&apos;t just compete — they dominated at every level.</p>
      <ul>
        <li>
          <strong>Three Four-Time State Champions:</strong> Wrestlers who won state titles in four consecutive years, a
          feat achieved by only a select few in North Carolina history.
        </li>
        <li>
          <strong>National Tournament Success:</strong> Beyond NHSCA, this class earned All-American honors at Super 32
          and IronMan, proving themselves against the best in the country.
        </li>
        <li>
          <strong>College Open Champions, Finalists, and Placers:</strong> This class was part of a relatively new
          movement of high school athletes competing in college opens during pre-season and in-season competition.
          Multiple wrestlers not only placed at college opens — they won championships and reached finals, competing
          against Division I athletes and proving they belonged at the next level before even graduating high school.
        </li>
        <li>
          <strong>Scholars:</strong> These athletes didn&apos;t sacrifice academics for athletics. Many carry GPAs above
          3.5, with several above 4.0, proving that excellence in the classroom and excellence on the mat can coexist.
        </li>
      </ul>

      <hr />

      <h2>The Next Level</h2>
      <p>
        The Class of 2026 will compete at the next level across NCAA Division I, Division II, Division III, and NAIA
        programs. Twenty-four male athletes from the Class of 2026 have committed to continue their wrestling careers
        in college:
      </p>
      <ul>
        <li>
          <strong>11 NCAA Division I commits</strong> — Taking their talents to the highest level of college wrestling,
          including programs like NC State, Duke, Appalachian State, Campbell, Davidson, Binghamton, Citadel,
          Gardner-Webb, and Mercyhurst.
        </li>
        <li>
          <strong>4 NCAA Division II commits</strong> — Competing in one of the most competitive divisions in college
          athletics at programs including Ferrum, UNC Pembroke, and Belmont Abbey.
        </li>
        <li>
          <strong>7 NCAA Division III commits</strong> — Continuing their wrestling careers at some of the
          nation&apos;s top academic institutions including Lynchburg (4), Roanoke, Averett, and Case Western Reserve.
        </li>
        <li>
          <strong>1 NAIA commit</strong> — Building programs and competing at the national level at Reinhardt.
        </li>
        <li>
          <strong>1 club program</strong> — Liberty.
        </li>
      </ul>
      <p>
        These athletes will represent North Carolina in college wrestling rooms across the country, carrying the
        lessons learned on North Carolina mats to new challenges and new opportunities.
      </p>

      <hr />

      <h2>Grateful and Proud</h2>
      <p>
        Watching these athletes develop from middle schoolers to state champions, from regional competitors to national
        All-Americans, has been one of the great privileges of North Carolina wrestling.
      </p>
      <p>
        None of this happens without the support systems behind these athletes. To the families who drove to countless
        tournaments, sacrificed weekends, and supported their wrestlers through wins and losses — thank you. To the club
        coaches who developed these athletes from youth wrestlers into national competitors — thank you. To the high school
        coaches who pushed them daily, built championship programs, and prepared them for the next level — thank you.
      </p>
      <p>
        It&apos;s always emotional to see a senior class move on. There&apos;s pride in what they&apos;ve accomplished
        and excitement for what comes next, but also the bittersweet reality that their high school careers are over.
      </p>
      <p>
        To the Class of 2026: Thank you for making North Carolina proud. Thank you for the early morning practices, the
        weekend tournaments, the sacrifices you made to be great. Thank you for representing this state with excellence,
        humility, and toughness.
      </p>
      <p>
        We&apos;re grateful to have been part of your journey. We can&apos;t wait to see what you do next.
      </p>
      <p className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-slate-700">
        <HardLink
          href="/public-rankings"
          className="font-semibold text-[#003366] underline underline-offset-2 hover:no-underline"
        >
          Current RecruitNC rankings
        </HardLink>{" "}
        — public boards for current recruiting classes.
      </p>
    </article>
  )
}
