import Image from "next/image"
import Link from "next/link"

const profileHref = (id: string) => `/view-profile?id=${encodeURIComponent(id)}`

export function UnitedAscent20260718Content() {
  return (
    <div className="space-y-10">
      <figure className="not-prose overflow-hidden rounded-xl border border-stone-300 bg-[#e8ddc8] shadow-sm">
        <Image
          src="/images/united-ascent/2026-07-18-cover.webp"
          alt="United Ascent, July 18, 2026 — North Carolina wrestling news"
          width={1086}
          height={1448}
          className="h-auto w-full"
          priority
        />
        <figcaption className="px-4 py-3 text-center text-xs text-stone-600">
          United Ascent promotional cover · July 18, 2026
        </figcaption>
      </figure>

      <div className="not-prose rounded-xl border border-[#D3B574]/50 bg-[#13294B] p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D3B574]">United Ascent</p>
        <p className="mt-2 text-lg font-semibold">North Carolina wrestling is ascending—and we’re covering every step.</p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          United Ascent is RecruitNC’s weekly record of the people, performances and progress moving North Carolina wrestling forward.
        </p>
        <Link
          href="/news/united-ascent"
          className="mt-4 inline-flex rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-semibold text-[#13294B] no-underline"
        >
          View every United Ascent issue
        </Link>
      </div>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Fargo 2026</p>
        <h2>Seven North Carolina Wrestlers Earn Fargo All-American Honors</h2>
        <p>
          Seven North Carolina wrestlers reached the podium at the 2026 Fargo Championships, adding another national achievement to the state’s growing wrestling résumé.
        </p>
        <p>Congratulations to:</p>
        <ul>
          <li><Link href={profileHref("bd029099-2487-4c18-8c8c-fd5b6e05e3e7")}>Cam Johnson</Link></li>
          <li><Link href={profileHref("cfd61be9-da05-49f5-ba93-5d62df3862da")}>Braylen Yates</Link></li>
          <li><Link href={profileHref("7bb99ea9-a0ff-4cd0-91f8-217327959105")}>Jake Amiott</Link></li>
          <li><Link href={profileHref("a3a2b693-504f-4f28-b31a-30952fcd3722")}>Iyanna Crawford</Link></li>
          <li>Mia Pardo</li>
          <li>Devin Hord</li>
          <li>Rylynn Keziah</li>
        </ul>
        <p>
          Fargo brings together many of the country’s top wrestlers in freestyle and Greco-Roman competition. Reaching the podium on that stage is a significant national accomplishment.
        </p>
        <p><Link href="/fargo">View the 2026 Fargo results on RecruitNC</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Commitment Watch</p>
        <h2>Eli Horton Commits to Roanoke College</h2>
        <p>
          One of North Carolina’s top Class of 2026 wrestlers is headed to the next level. <Link href={profileHref("45e7dc80-aafb-43c5-9e27-92cc85b1b64b")}>Elijah “Eli” Horton</Link> has committed to continue his academic and wrestling career at Roanoke College.
        </p>
        <p>Congratulations to Eli, his family and his coaches. RecruitNC wishes him continued success at the next level.</p>
        <p><Link href="/athletes">View North Carolina college commitments</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Recruiting</p>
        <h2>RecruitNC Athletes Can Track—and Share—Their Profiles</h2>
        <p>
          Every RecruitNC athlete profile has a unique link that athletes and families can share with college coaches by email, text or social media. Coaches do not need to log in to view the public portion of a profile.
        </p>
        <p>
          Sensitive information—including GPA, contact information and other protected recruiting details—is available only to college coaches signed into verified accounts.
        </p>
        <h3>New: Who’s Viewing You</h3>
        <p>Athletes with claimed profiles now have a private analytics section showing:</p>
        <ul>
          <li>Total profile views and unique signed-in viewers</li>
          <li>Views from verified coaches</li>
          <li>Distinct coaches and college coaches viewing the profile</li>
          <li>Activity during the past 30 days</li>
        </ul>
        <p>
          Only the athlete who owns the profile can see these statistics. Individual coach names and schools remain private so coaches can continue researching prospects freely.
        </p>
        <h3>RecruitNC Recruiting Activity</h3>
        <ul>
          <li><strong>33 coaches</strong> have viewed athlete profiles</li>
          <li><strong>336</strong> coach-generated profile views</li>
          <li><strong>124</strong> different athlete profiles viewed by coaches</li>
          <li><strong>13 college coaches</strong> generating <strong>189 views</strong></li>
          <li><strong>88</strong> different profiles viewed by college coaches</li>
          <li><strong>32</strong> coach-generated views during the past 30 days</li>
        </ul>
        <p><em>Activity through July 18, 2026.</em></p>
        <p><Link href="/submit-profile">Claim or create your RecruitNC profile</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Technology</p>
        <h2>North Carolina Wrestling History—Now Searchable with AI</h2>
        <p>
          For decades, North Carolina wrestling history has been scattered across old websites, PDFs, spreadsheets, brackets and archived record books. Finding information often meant knowing where to look—and manually searching through years of documents.
        </p>
        <p><strong>Data Dawg changes that.</strong></p>
        <p>
          RecruitNC is bringing North Carolina’s wrestling history into one searchable AI assistant. Instead of digging through PDFs and legacy websites, athletes, families, coaches and fans can ask a question in plain language and receive an answer in seconds.
        </p>
        <p>Search across generations of available RecruitNC records, including:</p>
        <ul>
          <li>Athlete career histories, state results and national accomplishments</li>
          <li>State qualifiers, placers and champions</li>
          <li>High school wrestling history and notable alumni</li>
          <li>Fargo, NHSCA, Super 32 and NCHSAA results</li>
          <li>College commitments by class, gender and division</li>
          <li>Career wins leaders, awards and historical records</li>
          <li>Upcoming NC United Blue practices and calendar details</li>
        </ul>
        <h3>Try These Searches</h3>
        <ul>
          <li>“Tell me about Bentley Sly.”</li>
          <li>“Who are Cary High’s state champions?”</li>
          <li>“Show me the 2026 Fargo results.”</li>
          <li>“Show me North Carolina’s NHSCA All-Americans from 2019.”</li>
          <li>“Show all men’s Division I college commits from 2025.”</li>
          <li>“Who has the most career wins in North Carolina history?”</li>
          <li>“When is the next Blue practice?”</li>
        </ul>
        <p>
          Found something incorrect or incomplete? Tell Data Dawg: <strong>“Hey Data Dawg, you have this wrong…”</strong> RecruitNC will review the information and typically correct verified issues within hours.
        </p>
        <p><Link href="/">Explore North Carolina wrestling history with Data Dawg 2.0</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Athlete Development</p>
        <h2>What Drives Rapid Improvement?</h2>
        <p>
          Why do some wrestlers suddenly make significant competitive jumps? Jim Bernthal explored that question through a survey of wrestling parents, athletes and coaches conducted over several months.
        </p>
        <p>
          Despite the different perspectives represented, the responses were surprisingly consistent. This five-minute feature examines the factors that separate gradual development from rapid improvement.
        </p>
        <p><Link href="/news/jumping-levels-what-drives-rapid-improvement">Read “Jumping Levels: What Drives Rapid Improvement?”</Link></p>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">Weekend Notebook</p>
        <h2>Several UNC Wrestlers Expected at Blue Practice</h2>
        <p>
          NC United Blue practice will be held Sunday, July 19, from <strong>11:45 a.m. to 1:45 p.m.</strong> at Fetzer Hall, 210 South Road, Chapel Hill. Several UNC wrestlers are expected to be in the room.
        </p>
        <p>
          Eligible wrestlers who are not monthly members can register for an individual drop-in practice through the NC United calendar.
        </p>
        <p>
          <Link href="/calendar">View the calendar and register</Link><br />
          <a href="https://www.google.com/maps/search/?api=1&query=210%20South%20Road%2C%20Chapel%20Hill%2C%20NC%2027599">Open the practice location in Google Maps</a>
        </p>
        <h3>Wrestling Guild Sessions</h3>
        <ul>
          <li><strong>Cam Stinson — 10:45 a.m.</strong> Openings remain. <a href="https://www.wrestlingguild.com/sessions/8b6aa8fd-ca58-4161-99f9-3166019685af/register">Register for Cam’s session</a>.</li>
          <li><strong>Colton Palmer — 10:30 a.m.</strong> This session is full.</li>
        </ul>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C20017]">On Deck</p>
        <h2>NC United Plans Major Announcement</h2>
        <p>
          NC United expects to share major news this week. The announcement represents the largest development in the organization’s history—and potentially one of the most significant developments for North Carolina’s wrestling ecosystem.
        </p>
        <p><strong>Stay tuned. The ascent continues.</strong></p>
      </section>
    </div>
  )
}
