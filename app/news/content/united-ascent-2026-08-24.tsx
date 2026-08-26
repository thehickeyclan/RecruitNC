import Image from "next/image"
import Link from "next/link"
import { UnitedAscentSubscribeCta } from "@/components/news/united-ascent-subscribe-cta"

function StoryImage({ src, alt, caption, aspect = "video" }: { src: string; alt: string; caption?: string; aspect?: "video" | "blue" | "college" | "field" | "logo" | "portrait" | "scholarship" | "ticket" }) {
  return (
    <figure className={`not-prose my-7 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${aspect === "portrait" ? "mx-auto max-w-sm" : aspect === "scholarship" ? "mx-auto max-w-xl" : ""}`}>
      <div className={`relative w-full ${aspect === "ticket" ? "aspect-[579/181]" : aspect === "blue" ? "aspect-[461/310]" : aspect === "college" ? "aspect-[311/131]" : aspect === "field" ? "aspect-[659/442]" : aspect === "logo" ? "aspect-[617/324]" : aspect === "portrait" ? "aspect-[169/254]" : aspect === "scholarship" ? "aspect-[547/590]" : "aspect-[16/9]"}`}>
        <Image src={src} alt={alt} fill className="object-cover" sizes="(max-width: 896px) 100vw, 800px" />
      </div>
      {caption ? <figcaption className="bg-white px-4 py-3 text-sm text-slate-600">{caption}</figcaption> : null}
    </figure>
  )
}

export function UnitedAscent20260824Content() {
  return (
    <div className="space-y-10">
      <div className="not-prose rounded-xl border border-[#D3B574]/50 bg-[#13294B] p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D3B574]">United Ascent</p>
        <p className="mt-2 text-lg font-semibold">Vol. 1, No. 6 · Monday, August 24, 2026</p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          The people, performances and progress driving North Carolina wrestling forward.
        </p>
        <Link href="/news/united-ascent" className="mt-4 inline-flex rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-semibold text-[#13294B] no-underline">
          View every United Ascent issue
        </Link>
      </div>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Field Reveal</p>
        <h2>The NC Mat Unveils the First Tournament of Champions Athletes</h2>
        <p>
          The NC Mat began its official Tournament of Champions athlete reveals this week with the 117, 125 and 133-pound fields—and the first three weights offer an early look at the depth coming to Apex.
        </p>
        <p>
          Across the first <strong>25 athletes announced</strong>, the field includes <strong>13 state champions, 23 state placers and two All-Americans</strong>.
        </p>
        <h3>117 pounds</h3>
        <p>Carson Raper, Jaxon Thomas, Liam Myles, Xavier Benthall, Matthew Akins, Alexander Moody, Tommy Kishpaugh and Kristopher Kerr Jr.</p>
        <h3>125 pounds</h3>
        <p>Jekai Sedgwick, Mason Brown, Luke Richards, Aiden Burkholder, Adam Walker, Daniel McDermott, Paxton Kearns and Devin Hord.</p>
        <h3>133 pounds</h3>
        <p>Mac Johnson, Ayden Sumners, Holt Quincy, Aidan Szewczyk, Stephen Cross, Abdul-Jamil Zaggout, Cooper Mathon, Ashton Tennessee and Caleb Edwards.</p>
        <p>The NC Mat will continue revealing the field weight by weight as we build toward September 18–19.</p>
        <StoryImage
          src="/images/united-ascent/2026-08-24-field-announcement.png"
          alt="The NC Mat Tournament of Champions field announcements for 117, 125 and 133 pounds"
          caption="The first three Tournament of Champions weights include 13 state champions, 23 state placers and two All-Americans."
          aspect="field"
        />
        <p><Link href="/tournament-of-champions#field">Explore the Tournament of Champions field</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Tickets</p>
        <h2>Tournament of Champions Tickets Go on Sale Friday</h2>
        <p>
          Public ticket sales for the Tournament of Champions open <strong>Friday, August 28 at 9:00 AM Eastern</strong> through GoFan.
        </p>
        <p>
          Seating is limited, and families of competing athletes will receive first access before the public sale. A Saturday ticket includes the full tournament—from two-mat bracket competition through the single-mat championship Finals.
        </p>
        <p>
          <strong>September 18–19 · Hope Community Church · Apex, North Carolina</strong>
        </p>
        <StoryImage
          src="/images/united-ascent/2026-08-24-tickets-gofan.png"
          alt="GoFan listing for the 2026 NC United Tournament of Champions"
          caption="Public tickets go on sale Friday, August 28 at 9:00 AM Eastern. Seating is limited."
          aspect="ticket"
        />
        <p><Link href="/tournament-of-champions#families">View ticket and spectator information</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">College Presence</p>
        <h2>22 Programs. 44 College Coaches.</h2>
        <p>
          <strong>UNC Pembroke, Randolph College and Allen University</strong> registered to support the Tournament of Champions this week, bringing the current total to <strong>22 college wrestling programs and 44 registered college coaches</strong>.
        </p>
        <p>
          That growing presence creates an opportunity for North Carolina wrestlers to compete in a high-level environment while connecting with college programs and coaches from across the region.
        </p>
        <StoryImage
          src="/images/united-ascent/2026-08-24-college-programs.png"
          alt="Tournament of Champions graphic announcing 22 college wrestling programs"
          caption="Twenty-two college programs and 44 coaches are now registered for the Tournament of Champions."
          aspect="college"
        />
        <p><Link href="/tournament-of-champions#college-coaches">See the college programs attending</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Weekend Wars</p>
        <h2>NC United Heads to Darkhorse This Weekend</h2>
        <p>
          Weekend Wars returns August 29–30 at Darkhorse Wrestling in Charlotte, centering two days on high-level competition and Super 32 preparation.
        </p>
        <p>
          Quality rounds, different styles and strong partners give wrestlers an opportunity to test themselves outside their regular rooms. <strong>There will be no regular NC United Sunday practice this weekend.</strong>
        </p>
        <StoryImage
          src="/images/united-ascent/2026-08-24-darkhorse-wrestling.png"
          alt="Darkhorse Wrestling"
          caption="Weekend Wars · August 29–30 · Darkhorse Wrestling · Charlotte, North Carolina."
          aspect="logo"
        />
        <p><Link href="/weekend-wars">View Weekend Wars details</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">NC United Blue</p>
        <h2>Blue Turns Up the Competition</h2>
        <p>
          The next chapter of NC United Blue began Sunday at UNC with a simple focus: bring great wrestlers together and let them wrestle. The session centered on sparring, situational wrestling and live competition with different partners and styles.
        </p>
        <p>
          UNC Head Coach <strong>Rob Koll</strong> was joined by Tar Heel wrestlers <strong>Collin Carrigan and Aidan Schlett</strong>, giving NC United athletes another opportunity to train in a Division I environment alongside people competing and coaching at the collegiate level.
        </p>
        <p>
          Blue will be held twice each month, concentrating strong partners into fewer, higher-level sessions while continuing to create opportunities inside the UNC and NC State wrestling programs.
        </p>
        <p><strong>More sparring. More live wrestling. Better partners. College rooms.</strong></p>
        <StoryImage
          src="/images/united-ascent/2026-08-24-nc-united-blue.png"
          alt="North Carolina United Blue program"
          caption="NC United Blue brings accomplished wrestlers together for high-level sparring, situational work and live competition."
          aspect="blue"
        />
        <p><Link href="/blue">Learn more about NC United Blue</Link> · <Link href="/calendar">View the training calendar</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">College Commitments</p>
        <h2>Four More Off the Board</h2>
        <p>Four more accomplished North Carolina wrestlers have made their college decisions.</p>
        <h3>Class of 2026</h3>
        <p><strong>Elijah Oakley → Washington &amp; Lee</strong><br />The Piedmont senior is a 2026 state champion and 2025 state runner-up with a 200–41 career record, 4.62 GPA and 34 ACT.</p>
        <p><strong>Jose Trejo → Campbell University</strong><br />The Surry Central senior captured a 2026 state championship after placing fourth in 2025 and third in 2024.</p>
        <h3>Class of 2027</h3>
        <p><strong>Josh Stonebraker → NC State</strong><br />Stonebraker is a three-time NCISAA state champion and five-time state finalist pursuing state championship No. 4.</p>
        <p><strong>Ayden Sumners → VMI</strong><br />The Wheatmore standout is a two-time state champion and three-time state placer with a 129–10 career record.</p>
        <p><Link href="/commits">Explore North Carolina college commitments</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Tournament of Champions</p>
        <h2>Introducing the Giving Hour</h2>
        <p>
          Tournament of Champions sponsors do not pay sponsorship fees to NC United. Instead, partners put their commitments directly back into the wrestling community through gear, products, training, services and experiences.
        </p>
        <p>
          One hour before the Finals, every paid spectator will receive free raffle tickets at the door. Fans can place them into designated partner boxes for the items or experiences they most want to win. There is <strong>no additional purchase, auction or bidding</strong>.
        </p>
        <p>
          Participating partners already include <strong>Adidas Wrestling, Cronin Customs, Funky Flickr Boyz, Wrestling Mindset, Triangle Wrestling Academy, The Wrestling Guild and V1G1L Wrestling</strong>.
        </p>
        <p><strong>All free. All going back to the wrestling community.</strong></p>
        <div className="not-prose my-7">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">Supporting partners</p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <a
              href="https://www.cronincustoms.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-xl border border-slate-200 bg-black no-underline"
              aria-label="Visit Cronin Customs"
            >
              <div className="relative aspect-square w-full p-5">
                <Image
                  src="/images/united-ascent/2026-08-24-partner-cronin-customs.png"
                  alt="Cronin Customs"
                  fill
                  className="object-contain p-5 transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 260px"
                />
              </div>
              <p className="bg-white px-4 py-3 text-center font-semibold text-slate-900">Cronin Customs</p>
            </a>
            <a
              href="https://funkyflickrboyzgear.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-xl border border-slate-200 bg-black no-underline"
              aria-label="Visit Funky Flickr Boyz"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src="/images/united-ascent/2026-08-24-partner-funky-flickr-boyz.png"
                  alt="Funky Flickr Boyz"
                  fill
                  className="object-contain p-5 transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 260px"
                />
              </div>
              <p className="bg-white px-4 py-3 text-center font-semibold text-slate-900">Funky Flickr Boyz</p>
            </a>
            <a
              href="https://www.wrestlingmindset.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-xl border border-slate-200 bg-black no-underline"
              aria-label="Visit Wrestling Mindset"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src="/images/united-ascent/2026-08-24-partner-wrestling-mindset.png"
                  alt="Wrestling Mindset"
                  fill
                  className="object-contain p-5 transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 260px"
                />
              </div>
              <p className="bg-white px-4 py-3 text-center font-semibold text-slate-900">Wrestling Mindset</p>
            </a>
            <a
              href="https://www.wrestlingguild.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-xl border border-slate-200 bg-black no-underline"
              aria-label="Visit The Wrestling Guild"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src="/images/sponsors/the-guild-logo.jpg"
                  alt="The Wrestling Guild"
                  fill
                  className="object-contain p-5 transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 260px"
                />
              </div>
              <p className="bg-white px-4 py-3 text-center font-semibold text-slate-900">The Wrestling Guild</p>
            </a>
            <a
              href="https://trianglewrestlingacademy.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-xl border border-slate-200 bg-black no-underline"
              aria-label="Visit Triangle Wrestling Academy"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src="/images/united-ascent/2026-08-24-partner-triangle-wrestling-academy.jpg"
                  alt="Triangle Wrestling Academy"
                  fill
                  className="object-contain p-5 transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 260px"
                />
              </div>
              <p className="bg-white px-4 py-3 text-center font-semibold text-slate-900">Triangle Wrestling Academy</p>
            </a>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
              <div className="relative aspect-square w-full">
                <Image
                  src="/images/united-ascent/2026-08-24-partner-v1g1l-wrestling.png"
                  alt="V1G1L Wrestling"
                  fill
                  className="object-contain p-5"
                  sizes="(max-width: 640px) 100vw, 260px"
                />
              </div>
              <p className="bg-white px-4 py-3 text-center font-semibold text-slate-900">V1G1L Wrestling</p>
            </div>
          </div>
        </div>
        <p><Link href="/tournament-of-champions#sponsors">Meet the Tournament of Champions partners</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">The Wrestling Guild</p>
        <h2>The Guild Launches Its iPhone App</h2>
        <p>
          The Wrestling Guild is officially available on the Apple App Store. Wrestlers and families can find current and former NCAA athletes, view availability and book private, partner and small-group training directly from their phones.
        </p>
        <p><strong>Find a coach. Book a session. Get to work.</strong></p>
        <a
          href="https://apps.apple.com/us/app/the-wrestling-guild/id6792125037"
          target="_blank"
          rel="noopener noreferrer"
          className="not-prose my-7 block overflow-hidden rounded-xl border border-slate-200"
          aria-label="Download The Wrestling Guild from the Apple App Store"
        >
          <div className="relative aspect-[15/2] w-full">
            <Image src="/images/united-ascent/2026-08-24-wrestling-guild-app.png" alt="The Wrestling Guild app is here — Download now" fill className="object-cover" sizes="(max-width: 896px) 100vw, 800px" />
          </div>
        </a>
        <p><a href="https://apps.apple.com/us/app/the-wrestling-guild/id6792125037" target="_blank" rel="noopener noreferrer">Download The Wrestling Guild on the App Store</a></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Officials</p>
        <h2>Elite College Officials Set for the Tournament of Champions</h2>
        <p>
          Chief of Officials <strong>Jonathan Sutton</strong> will lead an experienced crew built for high-level competition alongside <strong>Titus Godbolt, Paul Crouse and J.R. Powell</strong>.
        </p>
        <p>
          The crew brings extensive NCAA Division I, major-conference and postseason experience, providing consistency and professionalism from the opening round through the championship Finals.
        </p>
        <StoryImage
          src="/images/united-ascent/2026-08-24-officials-jonathan-sutton.png"
          alt="Tournament of Champions Chief of Officials Jonathan Sutton"
          caption="Jonathan Sutton will lead the Tournament of Champions collegiate officiating crew."
          aspect="portrait"
        />
        <p><Link href="/tournament-of-champions#officials">Meet the officiating crew</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Caden Perry Warrior Scholarship</p>
        <h2>Nominations Remain Open</h2>
        <p>
          The $1,000 wrestling-support award will recognize a North Carolina wrestler in grades 6–12 who has demonstrated exceptional character and perseverance in the face of adversity.
        </p>
        <p>
          The scholarship is not based on wrestling accomplishments. It may support club dues, training, private lessons, camps, tournament fees, travel, lodging, shoes, gear and equipment. The inaugural recipient will be recognized at the 2026 Tournament of Champions.
        </p>
        <StoryImage
          src="/images/united-ascent/2026-08-24-caden-perry-scholarship.png"
          alt="The Caden Perry Warrior Scholarship — $1,000 wrestling-support award"
          caption="Know a wrestler whose story deserves to be heard? Nominations remain open."
          aspect="scholarship"
        />
        <p><Link href="/fundraising/scholarships/caden-perry/apply">Nominate a wrestler</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">The Ascent Continues</p>
        <h2>North Carolina Wrestling Keeps Moving Forward</h2>
        <p>
          The Tournament of Champions field is being revealed, public ticket sales open Friday, 44 college coaches are preparing to support the event, Blue has raised the competitive standard, four more wrestlers have made their college decisions and partners are investing directly back into the wrestling community.
        </p>
        <p><strong>North Carolina wrestling is ascending—and we&apos;re covering every step.</strong></p>
      </section>

      <UnitedAscentSubscribeCta />
    </div>
  )
}
