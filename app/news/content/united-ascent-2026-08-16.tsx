import Image from "next/image"
import Link from "next/link"
import { UnitedAscentSubscribeCta } from "@/components/news/united-ascent-subscribe-cta"

function StoryImage({
  src,
  alt,
  caption,
  portrait = false,
}: {
  src: string
  alt: string
  caption?: string
  portrait?: boolean
}) {
  return (
    <figure className="not-prose my-7 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <div className={portrait ? "relative aspect-[4/5] w-full sm:aspect-[16/10]" : "relative aspect-[16/9] w-full"}>
        <Image
          src={src}
          alt={alt}
          fill
          className={portrait ? "object-contain" : "object-cover"}
          sizes="(max-width: 896px) 100vw, 800px"
        />
      </div>
      {caption ? <figcaption className="bg-white px-4 py-3 text-sm text-slate-600">{caption}</figcaption> : null}
    </figure>
  )
}

export function UnitedAscent20260816Content() {
  return (
    <div className="space-y-10">
      <div className="not-prose rounded-xl border border-[#D3B574]/50 bg-[#13294B] p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D3B574]">United Ascent</p>
        <p className="mt-2 text-lg font-semibold">Vol. 1, No. 5 · Sunday, August 16, 2026</p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          The people, performances and progress driving North Carolina wrestling forward.
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
        <h2>The NC Mat to Begin Athlete Announcements</h2>
        <p>
          The NC Mat, official media partner of the Tournament of Champions, will begin announcing athletes by weight
          class, starting at <strong>117 pounds</strong>.
        </p>
        <p>
          Athletes will be announced alphabetically across several updates during the next two weeks. The announcements
          will introduce the field without revealing seeds or complete brackets.
        </p>
        <p>
          Weight classes from 117 through 157 pounds, along with 174 pounds, have been finalized. With{" "}
          <strong>71 of 88 athletes registered</strong>, a final round of invitations is being sent as organizers work to
          complete the remaining weights. Athletes who have not received an invitation may still submit the interest
          form on the Tournament of Champions page.
        </p>
        <StoryImage
          src="/images/toc/finals-announcements.png"
          alt="Tournament of Champions athlete and finals announcement presentation"
          caption="The NC Mat will reveal the Tournament of Champions field by weight class, beginning at 117 pounds."
        />
        <p>
          <Link href="/tournament-of-champions#road">Follow athlete announcements and Tournament of Champions updates</Link>
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Tournament Partners</p>
        <h2>Three New Sponsors Join the Tournament of Champions</h2>
        <p>
          <strong>Defense Soap, Cronin Customs and Invictus Wrestling Co.</strong> have joined the growing group of
          sponsors supporting North Carolina&apos;s Tournament of Champions.
        </p>
        <p>
          Defense Soap has donated products to help athletes protect their skin and remain mat-ready throughout the
          event. Cronin Customs will donate several pairs of its distinctive wrestling shoes for the Tournament of
          Champions Giveaway Hour, while Invictus Wrestling Co. will bring limited-edition gear and featured apparel to
          Apex.
        </p>
        <p>
          The Wrestling Guild will also provide its previously announced <strong>$1,000 in training credits</strong>.
          Anyone who creates a free account at WrestlingGuild.com during the eligibility period will have an opportunity
          to win private or small-group training sessions.
        </p>
        <div className="not-prose my-7 grid gap-4 sm:grid-cols-2">
          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-black sm:col-span-2">
            <div className="relative aspect-[4/3]">
              <Image
                src="/images/toc/sponsors/cronin-customs-premier-sponsor.png"
                alt="Cronin Customs, premier sponsor of the Tournament of Champions"
                fill
                className="object-contain"
                sizes="(max-width: 896px) 100vw, 800px"
              />
            </div>
          </figure>
          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-[#060f1f]">
            <div className="relative aspect-[4/3]">
              <Image
                src="/images/toc/sponsors/defense-soap-products.png"
                alt="Defense Soap products donated for Tournament of Champions athletes"
                fill
                className="object-contain"
                sizes="(min-width: 640px) 400px, 100vw"
              />
            </div>
          </figure>
          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-[#e9dfc5]">
            <div className="relative aspect-[4/3]">
              <Image
                src="/images/toc/sponsors/invictus-wrestling-co.png"
                alt="Invictus Wrestling Co., Tournament of Champions sponsor"
                fill
                className="object-cover"
                sizes="(min-width: 640px) 400px, 100vw"
              />
            </div>
          </figure>
        </div>
        <p>
          <Link href="/tournament-of-champions#sponsors">Meet the Tournament of Champions partners</Link>
          {" · "}
          <Link href="/news/nc-united-wrestling-guild-premier-partner">Read the Wrestling Guild partnership story</Link>
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Caden Perry Warrior Scholarship</p>
        <h2>Nominations Remain Open Through August 30</h2>
        <p>
          <em>“The future is bright for those who refuse to quit.”</em>
        </p>
        <p>
          Caden Perry embodied what wrestling is supposed to build: courage, resilience, discipline, heart and an
          unwavering refusal to quit. The inaugural award will provide <strong>$1,000 in wrestling support</strong> to one
          North Carolina wrestler whose response to genuine adversity reflects that same warrior spirit.
        </p>
        <p>
          This is not an award for rankings, records, championships, recruiting status or academic achievement. The
          recipient does not have to compete in the Tournament of Champions. NC United committed the first $1,000, and
          community donations will help expand the award&apos;s impact.
        </p>
        <StoryImage
          src="/scholarships/caden-perry/warrior-scholarship-share-card-wide.png"
          alt="The Caden Perry Warrior Scholarship"
          caption="Nominations for the inaugural Caden Perry Warrior Scholarship remain open through August 30."
        />
        <p>
          <Link href="/news/caden-perry-warrior-scholarship-announced">Read Caden&apos;s story and learn about the scholarship</Link>
          {" · "}
          <Link href="/fundraising/scholarships/caden-perry/apply">Nominate a wrestler</Link>
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Darkhorse Weekend</p>
        <h2>NC United Heads to Charlotte</h2>
        <p>
          NC United will pause regular practice during the final weekend of August and support two days of wrestling at
          the Darkhorse facility in Charlotte.
        </p>
        <p>
          <strong>Weekend Wars</strong> will take place Saturday, August 29, followed by the{" "}
          <strong>Super 32 Prep Series</strong> on Sunday, August 30. Current NC United members receive free admission,
          and all members are strongly encouraged to attend.
        </p>
        <p>
          NC United will coordinate travel from the Triangle and other areas for athletes who need transportation. The
          attendance form also allows wrestlers to indicate whether they are open to carpooling.
        </p>
        <StoryImage
          src="/images/events/weekend-wars-super32-prep.png"
          alt="Weekend Wars and Super 32 Prep Series at Darkhorse Wrestling in Charlotte"
          caption="Weekend Wars is August 29, followed by the Super 32 Prep Series on August 30."
          portrait
        />
        <p>
          <Link href="/weekend-wars">View the weekend details and register your attendance</Link>
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">College Programs</p>
        <h2>Duke, Gardner-Webb, Ferrum and Newberry Join the Tournament of Champions</h2>
        <p className="text-xl font-semibold">19 college programs. One state. One community.</p>
        <p>
          Duke, Gardner-Webb, Ferrum and Newberry are the newest college wrestling programs supporting North Carolina&apos;s
          Tournament of Champions, bringing the event&apos;s total to <strong>19 programs</strong>.
        </p>
        <p>
          On September 18–19, 88 of North Carolina&apos;s elite wrestlers will compete as individuals in Apex, with college
          coaches on hand to support the event, engage with athletes and families, and strengthen their connection with
          the state&apos;s wrestling community.
        </p>
        <StoryImage
          src="/images/toc/tournament-of-champions-venue-arena.png"
          alt="Tournament of Champions competition venue in Apex"
          caption="Nineteen college programs are now expected to be represented at the Tournament of Champions."
        />
        <p>
          <Link href="/tournament-of-champions#college-coaches">See the college programs attending</Link>
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Community</p>
        <h2>Caleb Smith Gives Back at Greensboro RTC</h2>
        <p>
          On August 13, two-time NCAA Division I All-American <strong>Caleb Smith</strong> chose to spend part of his time
          home leading Greensboro RTC practice at Greensboro College.
        </p>
        <p>
          Smith demonstrated, drilled and wrestled with athletes throughout the room, giving young wrestlers an
          opportunity to experience the pace, work ethic and attention to detail required to compete at the highest
          levels of the sport. He closed practice by speaking about his faith, the opportunities wrestling has provided
          and the importance of remembering the people and communities that helped make those opportunities possible.
        </p>
        <StoryImage
          src="/images/news/caleb-smith-gives-back/greensboro-rtc-group.jpeg"
          alt="Caleb Smith with wrestlers following Greensboro RTC practice"
          caption="Caleb Smith returned home and gave a Greensboro RTC room his time, experience and full attention."
        />
        <p>
          <Link href="/news/caleb-smith-gives-back">Read the full Caleb Smith feature</Link>
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">College Wrestling</p>
        <h2>Greensboro College Strengthens Its Roster With Three Transfers</h2>
        <p>
          Greensboro College is adding three accomplished transfers as the program continues building momentum.{" "}
          <strong>Sammy Aponte</strong>, a three-time North Carolina state champion, transfers from Roanoke College.{" "}
          <strong>Eli Pendergrass</strong>, a North Carolina state champion and two-time finalist, arrives from the
          University of Mount Olive. <strong>Cayden Glass</strong>, a two-time North Carolina state finalist, transfers
          from King University.
        </p>
        <p>
          The additions bring proven experience and deep connections to North Carolina wrestling into a room already
          gaining energy through Greensboro RTC and stronger statewide engagement.
        </p>
        <StoryImage
          src="/images/news/caleb-smith-gives-back/greensboro-rtc-huddle.jpg"
          alt="Wrestlers gathered in a huddle inside the Greensboro College wrestling room"
          caption="Greensboro College continues building momentum around its roster and RTC room."
          portrait
        />
        <p>
          <Link href="/news/caleb-smith-gives-back#greensboro-momentum">Read more about the momentum building in Greensboro</Link>
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Super 32</p>
        <h2>Early Registration Opens August 17</h2>
        <p>
          Early registration for the 2026 Super 32 Challenge opens Monday, August 17. Wrestlers and families planning
          to register should review the qualifying criteria in advance and be prepared when registration opens.
        </p>
        <p>
          The event&apos;s early-entry process verifies qualifying credentials before acceptance, so families should have
          the relevant result information ready.
        </p>
        <figure className="not-prose my-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex min-h-52 items-center justify-center p-8">
            <Image
              src="/images/events/super32-logo.png"
              alt="Super 32 Challenge logo"
              width={215}
              height={148}
              className="h-auto w-full max-w-[260px]"
            />
          </div>
        </figure>
        <p>
          <a href="https://www.super32.com/early">Review the complete Super 32 early-registration criteria</a>
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">The Ascent Continues</p>
        <h2>North Carolina Wrestling Keeps Moving Forward</h2>
        <p>
          Athlete reveals are beginning, the Tournament of Champions field and partner roster continue to grow, and 19
          college programs are preparing to support the event. Caleb Smith gave back to the room that helped shape him,
          Greensboro College added proven North Carolina talent, and wrestlers across the state are preparing for the
          opportunities ahead.
        </p>
        <p>
          <strong>North Carolina wrestling is ascending—and we&apos;re covering every step.</strong>
        </p>
      </section>

      <UnitedAscentSubscribeCta />
    </div>
  )
}
