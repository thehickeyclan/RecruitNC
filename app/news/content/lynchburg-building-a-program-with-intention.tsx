import Image from "next/image"

const COACH_BARBER_IMAGE = "/images/lynchburg-vincent-barber-coach.png"
const PROSPECT_DAY_MARCH_IMAGE = "/images/lynchburg-prospect-day-march-2026.png"
const FACILITY_INTERIOR_IMAGE = "/images/lynchburg-wrestling-facility-interior.png"
const FACILITY_CONDITIONING_IMAGE = "/images/lynchburg-facility-conditioning-turf.png"

/**
 * Lynchburg (DIII) — facility, NC pipeline, Class of 2026 recruiting story.
 */
export function LynchburgBuildingAProgramWithIntentionContent() {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_hr]:my-8 [&_hr]:border-slate-200">
      <p className="text-slate-600 font-medium">
        Under head coach <strong>Vincent Barber</strong> and assistant coach <strong>Sammy Hillegas</strong>, Lynchburg is
        standing up a new Division III program — its <strong>first official varsity season</strong> is still ahead — with
        clear structure, investment, and alignment. On RecruitNC&apos;s Class of 2026 ledger for North Carolina, Lynchburg
        lists <strong>five</strong> in-state commits — about <strong>2×</strong> the total of the{" "}
        <strong>next-closest</strong> program on that ledger for NC recruits in this class — and we&apos;re hearing more
        North Carolina names may be announced soon.
      </p>

      <p className="mt-6 text-slate-700">
        <strong>Here&apos;s why</strong> that recruiting pace matches what families see on a visit: the through-line starts
        with infrastructure — the part of the story you can walk through before Lynchburg&apos;s first official varsity
        season even opens.
      </p>

      <h2>A facility that stands out</h2>
      <p>
        The university recently unveiled a <strong>stand-alone wrestling facility of more than 13,000 square feet</strong>,
        one of the largest in NCAA wrestling. The space includes more than <strong>7,200 square feet of mat space</strong> with four
        full collegiate mats, along with a fully equipped weight room featuring Olympic platforms, multiple racks, and
        conditioning equipment. The facility also includes a team lounge, locker rooms, and a dedicated athletic training
        and recovery area.
      </p>
      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
        <Image
          src={FACILITY_INTERIOR_IMAGE}
          alt="Lynchburg Hornets wrestling facility: competition mats, Lynchburg Hornets wall branding, and training space"
          width={1400}
          height={788}
          className="h-auto w-full object-cover"
          sizes="(max-width: 768px) 100vw, 42rem"
        />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Inside Lynchburg&apos;s stand-alone wrestling facility — mat space, branding, and a layout built for daily
          training and recruiting visits.
        </figcaption>
      </figure>
      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
        <Image
          src={FACILITY_CONDITIONING_IMAGE}
          alt="Lynchburg wrestling facility strength and conditioning area: turf runway, air bikes, racks, and Lynchburg Wrestling banner"
          width={1400}
          height={788}
          className="h-auto w-full object-cover object-center"
          sizes="(max-width: 768px) 100vw, 42rem"
        />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Strength and conditioning space — turf, cardio, and racks under the same roof as the mats.
        </figcaption>
      </figure>
      <p>
        This level of infrastructure is uncommon at the <strong>Division III</strong> level and has quickly become a major
        differentiator in recruiting.
      </p>

      <hr />

      <h2>A strong connection to North Carolina</h2>
      <p>
        Lynchburg&apos;s early success in North Carolina is not accidental. The program has maintained a consistent presence
        across the state — attending tournaments, building relationships, and engaging directly with athletes and families.
        Lynchburg has also <strong>hosted NC United practices</strong>, further strengthening its connection to the
        development pipeline within North Carolina.
      </p>
      <p>
        In addition, the program has worked alongside <strong>RecruitNC</strong> in helping support and grow the platform —
        aligning itself with data, visibility, and modern recruiting tools.
      </p>

      <blockquote className="my-6 rounded-xl border border-[#003366]/20 bg-[#003366]/5 p-5 md:p-6">
        <p className="my-0 text-lg font-semibold leading-relaxed text-[#003366]">
          &ldquo;Lynchburg has embraced North Carolina wrestling the right way — showing up, building real relationships,
          and investing in the athletes and the ecosystem. That matters.&rdquo;
        </p>
        <footer className="mt-3 text-sm font-medium text-slate-600">Matt Hickey — NC United / RecruitNC</footer>
      </blockquote>

      <hr />

      <h2>Expanding nationally through relentless effort</h2>
      <p>
        Lynchburg&apos;s early success is not limited to North Carolina. The program is already attracting nationally ranked
        wrestlers, state champions, and state placers from multiple states, signaling a recruiting footprint that extends
        well beyond the region.
      </p>
      <p>
        Over the past year, the coaching staff has shown relentless effort on the road — attending <strong>15+ tournaments</strong>
        , visiting club practices, and consistently engaging with athletes and coaches across the country.
      </p>

      {/* Coach photo beside Vincent Barber quote — image left on md+ (he faces into the quote), stacked on mobile */}
      <div className="my-8 flex flex-col gap-5 md:flex-row md:items-stretch md:gap-6">
        <figure className="relative mx-auto w-full max-w-md shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm md:mx-0 md:max-w-none md:w-[min(100%,380px)]">
          <Image
            src={COACH_BARBER_IMAGE}
            alt="Lynchburg head wrestling coach Vincent Barber"
            width={760}
            height={520}
            className="h-auto w-full object-cover object-center"
            sizes="(max-width: 768px) 100vw, 380px"
          />
          <figcaption className="border-t border-slate-200 bg-white px-3 py-2 text-center text-xs text-slate-500">
            Vincent Barber — Lynchburg head coach
          </figcaption>
        </figure>
        <blockquote className="flex flex-1 flex-col justify-center rounded-xl border border-[#C20017]/20 bg-red-50/80 p-5 md:p-6">
          <p className="my-0 text-lg font-semibold leading-relaxed text-[#003366]">
            &ldquo;We&apos;re going to go where the best wrestlers are. Recruiting is about relationships and showing up
            consistently — and that&apos;s what we&apos;re committed to doing.&rdquo;
          </p>
          <footer className="mt-4 text-sm font-medium text-slate-600">Vincent Barber — Head Coach, Lynchburg Wrestling</footer>
        </blockquote>
      </div>

      <p>
        The reach is national — and the approach is built on hustle.
      </p>

      <hr />

      <h2>Location matters</h2>
      <p>
        Lynchburg&apos;s location is a major advantage. Situated within approximately <strong>three hours</strong> of much
        of North Carolina, the program aligns with one of the strongest trends in RecruitNC data: the majority of wrestlers
        from North Carolina compete within the <strong>NC / VA / SC</strong> region. For many families, that combination of
        proximity and opportunity is a deciding factor.
      </p>

      <hr />

      <h2>The Class of 2026: a foundation group</h2>
      <p>
        Lynchburg&apos;s 2026 class out of North Carolina reflects a well-balanced group — highlighted by high-level
        performers and long-term upside.
      </p>
      <ul>
        <li>
          <strong>Jacob Reigel</strong> (Mount Pleasant) — finished his senior season undefeated, state champion, All-American
          honors at NHSCA Nationals.
        </li>
        <li>
          <strong>Cameron Gue</strong> (Mount Pleasant) — two-time state champion and three-time state finalist; one loss as
          a senior on the way to another state title.
        </li>
        <li>
          <strong>Fares Alkurdasi</strong> (Jordan) — 2026 NCHSAA state champion at 175 pounds; 102 career wins.
        </li>
        <li>
          <strong>Cody Bui</strong> (Hough) — state placer with 130+ career wins.
        </li>
        <li>
          <strong>Josh Brezac</strong> (Green Level) — state qualifier who made a significant jump last season with continued
          upside.
        </li>
      </ul>
      <p>
        We&apos;re hearing from the Lynchburg staff that <strong>additional North Carolina names</strong> may be announced
        soon as the first roster comes together. Among the in-state athletes connected to the program ahead of formal
        announcements are <strong>Xander McAnaw</strong> (prep), <strong>Joe Ricci</strong> (Hough), and{" "}
        <strong>Jojo Trahan</strong> (Trinity). We&apos;ll update this story as commitments and signings are made public.
      </p>

      <hr />

      <h2>Momentum backed by action</h2>
      <p>
        Lynchburg&apos;s recruiting momentum extends beyond commitments. At their most recent <strong>Prospect Day in March</strong>
        , the program hosted <strong>over 100 wrestlers</strong>, drawing athletes from across the country and reinforcing
        national interest in what is being built.
      </p>
      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
        <Image
          src={PROSPECT_DAY_MARCH_IMAGE}
          alt="Prospect camp at Lynchburg’s wrestling facility: wrestlers in a circle on the mats for instruction, March"
          width={1400}
          height={788}
          className="h-auto w-full object-cover"
          sizes="(max-width: 768px) 100vw, 42rem"
        />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          March Prospect Day — instruction on the mats inside Lynchburg&apos;s stand-alone facility.
        </figcaption>
      </figure>
      <p>As the roster continues to grow, Lynchburg is not just adding numbers — it is building a competitive foundation.</p>

      <hr />

      <h2>A different recruiting approach</h2>
      <p>Lynchburg&apos;s rise reflects a shift that combines:</p>
      <ul>
        <li>Regional focus</li>
        <li>Facility investment</li>
        <li>Early relationship-building</li>
        <li>Consistent in-person presence</li>
      </ul>
      <p>
        There is no decades-old wrestling tradition to lean on yet — for a program this new, traction comes from the
        facility, repeated in-person presence, and relationships with families and clubs. That is the blueprint Lynchburg is
        running, and it matches how recruiting actually moves in 2026.
      </p>

      <hr />

      <h2>Takeaway</h2>
      <p>
        The numbers above track <strong>Class of 2026</strong> commitments from North Carolina to four-year programs — the
        same lens RecruitNC uses across the site. Leading the state with five NC signees — about <strong>2×</strong> the
        next program on the ledger — before year one
        on the mat lines up with the facility, the travel
        schedule, and the work in front of families.
      </p>
    </article>
  )
}
