import Image from "next/image"
import Link from "next/link"
import { UnitedAscentSubscribeCta } from "@/components/news/united-ascent-subscribe-cta"

export function UnitedAscent20260725Content() {
  return (
    <div className="space-y-10">
      <figure className="not-prose overflow-hidden rounded-xl border border-stone-300 bg-[#e8ddc8] shadow-sm">
        <Image
          src="/images/united-ascent/2026-07-25-cover.png"
          alt="United Ascent, July 25, 2026 — North Carolina wrestling news"
          width={1024}
          height={1536}
          className="h-auto w-full"
          priority
        />
        <figcaption className="px-4 py-3 text-center text-xs text-stone-600">
          United Ascent · Vol. 1, No. 2 · July 25, 2026
        </figcaption>
      </figure>

      <div className="not-prose rounded-xl border border-[#D3B574]/50 bg-[#13294B] p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D3B574]">United Ascent</p>
        <p className="mt-2 text-lg font-semibold">Inside the people, performances and progress driving North Carolina wrestling forward.</p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          This week: Tournament of Champions, Pan-American gold, Journeymen applications, Wrestling Guild growth, varsity jackets and a North Carolina coaching legend.
        </p>
        <Link
          href="/news/united-ascent"
          className="mt-4 inline-flex rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-semibold text-[#13294B] no-underline"
        >
          View every United Ascent issue
        </Link>
      </div>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Tournament of Champions</p>
        <h2>A Historic New Stage for North Carolina Wrestling</h2>
        <p>
          North Carolina wrestling is carrying historic momentum. Participation is growing. Athletes are succeeding nationally and internationally. College programs are paying closer attention. Across the state, wrestlers have more talent, access and opportunity than ever before.
        </p>
        <p>Now, North Carolina’s elite will have a stage built specifically for them.</p>
        <p>
          The <strong>NC United Tournament of Champions</strong> will bring together elite wrestlers from across the state for invite-only, eight-man brackets at college weight classes—plus 117 pounds.
        </p>
        <h3>One State. Elite Eight. Two Mats. One Champion.</h3>
        <p>
          The tournament begins Friday night and continues Saturday, culminating in a single-mat championship round. Wrestlers will compete with college coaches from every division seated mat-side.
        </p>
        <p>
          <strong>Apex, North Carolina</strong><br />
          <strong>September 18–19, 2026</strong>
        </p>
        <p>
          <Link href="/news/tournament-of-champions-announced">Read the official Tournament of Champions announcement</Link>
          <br />
          <Link href="/tournament-of-champions">Visit the event page for field reveals and ticket updates</Link>
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Championship Tradition</p>
        <h2>The Jacket You Cannot Buy</h2>
        <p>
          Three wrestlers from each Tournament of Champions weight class will reach the podium. Only one will leave wearing the jacket.
        </p>
        <p>
          The official <strong>Tournament of Champions jacket</strong> is navy with <strong>NORTH CAROLINA</strong> across the chest and <strong>CHAMPION</strong> across the back. Red, white and navy sleeve stripes complete a design created to commemorate the year its owner proved himself against North Carolina’s elite.
        </p>
        <p>
          It will never be offered as merchandise. It cannot be ordered, purchased or given away. It must be earned by winning an eight-man bracket filled with elite North Carolina wrestlers.
        </p>
        <p>
          <strong>Eleven brackets. Eleven winners. Eleven jackets earned.</strong>
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">International Wrestling</p>
        <h2>Lauren Samuel Rules the Americas</h2>
        <p>
          Lauren Samuel delivered a dominant performance at the <strong>2026 Pan-American Championships</strong>, winning the 58-kilogram title.
        </p>
        <p>
          Samuel earned a technical fall or pin in every match and completed the tournament without conceding a single point.
        </p>
        <p>
          She returns home with a Pan-American gold medal—and another significant international accomplishment for North Carolina wrestling.
        </p>
        <p><strong>Best in the Americas—and only getting started.</strong></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">National Competition</p>
        <h2>Journeymen Fall Classic Applications Open</h2>
        <p>
          The <strong>Journeymen Fall Classic</strong> returns October 3–4 in Schenectady, New York.
        </p>
        <p>
          The invite-only tournament attracts accomplished wrestlers from across the country and uses a round-robin format, providing athletes with multiple opportunities to compete against elite national opposition.
        </p>
        <p>
          Journeymen is among the preseason events with the greatest potential recruiting impact for North Carolina wrestlers. A long list of the state’s best—including <strong>Bentley Sly</strong> and <strong>Lorenzo Alston</strong>—have found success at the event in recent years.
        </p>
        <p>Applications opened July 1. Wrestlers interested in being considered should email <a href="mailto:info@journeymenwrestling.com">info@journeymenwrestling.com</a> and include:</p>
        <ul>
          <li>Desired division</li>
          <li>Wrestler’s name and current grade</li>
          <li>Highest wrestling accolades and achievements</li>
          <li>Whether each accomplishment was earned at the elementary, middle-school or high-school level</li>
        </ul>
        <p>
          <strong>Schenectady, New York</strong><br />
          <strong>October 3–4, 2026</strong>
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">The Wrestling Guild</p>
        <h2>The Guild Surpasses 350 Bookings</h2>
        <p>
          The Wrestling Guild has officially surpassed <strong>350 bookings</strong>, another significant milestone for a platform built to connect young wrestlers with current and former college athletes.
        </p>
        <p>
          The Guild is expanding into the <strong>Greensboro and Winston-Salem areas</strong>, creating more opportunities for wrestlers across the state to receive private, partner and small-group instruction.
        </p>
        <h3>Josh Wilson Joins the Guild</h3>
        <p>
          Josh Wilson made history as <strong>Greensboro College’s first NCAA Division III national champion</strong> and now serves as a volunteer assistant coach with the program.
        </p>
        <ul>
          <li>NCAA Division III national champion</li>
          <li>Five-time NCAA All-American</li>
          <li>2018 NCHSAA state champion</li>
          <li>2020 NCHSAA state runner-up</li>
          <li>Four-time NCHSAA state placer</li>
        </ul>
        <h3>Ethan Oakley Joins the Guild</h3>
        <p>Three-time NCAA qualifier Ethan Oakley has also joined the Guild coaching roster.</p>
        <ul>
          <li>Southern Conference champion</li>
          <li>ACC third-place finisher</li>
          <li>Three-time high-school state champion</li>
          <li>Super 32 All-American</li>
          <li>NHSCA Junior Nationals third-place finisher</li>
        </ul>
        <p>
          The Guild now features <strong>24 coaches across nine North Carolina cities</strong>, with continued expansion ahead.
        </p>
        <p><a href="https://www.wrestlingguild.com/">Create a free account and book a session</a></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Wrestling Culture</p>
        <h2>Should Varsity Jackets Make a Comeback?</h2>
        <p>
          Maybe we are old school. But there is something special about wearing the varsity letter you earned.
        </p>
        <p>
          The jacket does not define the accomplishment—it honors it. School colors. Your letter. Your team across your back. A piece of your wrestling career that can remain with you long after your final match.
        </p>
        <p>
          NC United recently began imagining what wrestling varsity jackets could look like for programs across the state, including Trinity, Davie County, Cardinal Gibbons, New Bern, Union Pines, Hoke County and Jack Britt.
        </p>
        <p><strong>Which North Carolina wrestling program would have the best one?</strong></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">North Carolina Legends</p>
        <h2>WIN Magazine to Feature Jerry Winterton</h2>
        <p>
          A new <strong>WIN Magazine Coach’s Corner</strong> feature will spotlight recent Hall of Fame inductee Jerry Winterton.
        </p>
        <p>
          Winterton led Cary High School wrestling for more than 40 years and became the winningest coach in North Carolina history. His influence, however, extended far beyond victories and championships.
        </p>
        <p>
          In the upcoming feature, Winterton discusses his coaching philosophy, training methods and relentless commitment to finding students in Cary’s hallways who needed wrestling—and recruiting them into the program.
        </p>
        <p>
          The story will appear in <strong>WIN Magazine’s Volume 32, Issue 10</strong>, scheduled for release next Friday.
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">The Ascent Continues</p>
        <h2>More Access. More Recognition. More Opportunity.</h2>
        <p>
          The stories in this week’s edition are connected: a North Carolina wrestler stands atop an international podium, a legendary coach receives national recognition, college athletes are creating new training opportunities, elite wrestlers are preparing for national competition and an unprecedented tournament is being built to place North Carolina’s elite on one stage.
        </p>
        <p>
          <strong>North Carolina wrestling is ascending—and we are just getting started.</strong>
        </p>
      </section>

      <UnitedAscentSubscribeCta />
    </div>
  )
}
