import Image from "next/image"
import Link from "next/link"

const CARSON_AND_JAKE = "/images/news/journeymen-fall-classic-2026/carson-and-jake.png"

const profile = (id: string) => `/view-profile?id=${id}`
const RAPER = profile("68696afb-0b22-465c-b22e-82e84913144e")
const AMIOTT = profile("7bb99ea9-a0ff-4cd0-91f8-217327959105")
const MCNAIR = profile("63ea613d-0886-4af0-b64b-1c3d80fe0332")
const RICHARDS = profile("1a2d638e-5978-45d4-b6c8-bc95ba754367")
const LOPEZ = profile("da7e32d2-bbdc-4b0e-ac70-ecb6ac67ed10")
const PADGETT = profile("c30deea8-6e11-4bbd-b95c-6a5bc4d72692")

function P({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-[#003366] underline decoration-[#D3B574] underline-offset-2 hover:text-[#13294B]">
      {children}
    </Link>
  )
}

function ProfileAd() {
  return (
    <aside className="not-prose my-10 overflow-hidden rounded-2xl border border-[#D3B574]/40 bg-gradient-to-br from-[#0A1628] via-[#13294B] to-[#0A1628] p-6 text-center shadow-xl sm:p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#D3B574]">RecruitNC profiles</p>
      <p className="mt-3 text-xl font-black leading-snug text-white sm:text-2xl">
        Every NC wrestler in this story has a RecruitNC profile.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/75">
        Every match, opponent accolades, rankings and a scouting report — all free.
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/prospects/all"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#D3B574] px-5 text-sm font-extrabold uppercase tracking-[0.12em] text-[#0A1628] no-underline hover:bg-[#e2c98d] sm:w-auto"
        >
          Find your wrestler
        </Link>
        <Link
          href="/auth/signup"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/30 px-5 text-sm font-extrabold uppercase tracking-[0.12em] text-white no-underline hover:bg-white/10 sm:w-auto"
        >
          Claim a profile — free
        </Link>
      </div>
      <p className="mt-4 text-xs text-white/60">
        College coach?{" "}
        <Link href="/auth/coach-signup" className="font-semibold text-[#D3B574] underline underline-offset-2">
          Get free access to every profile
        </Link>
      </p>
      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-sm font-bold text-white">Be the first to know.</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-white/75">
          Get the NC United iPhone app and turn on alerts — results, rankings and stories like this one, the moment
          they drop.
        </p>
        <Link
          href="/download"
          className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#D3B574]/60 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#D3B574] no-underline hover:bg-[#D3B574]/10"
        >
          Download the iPhone app
        </Link>
      </div>
    </aside>
  )
}

export function JourneymenFallClassic2026RecapContent() {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h2]:text-[#003366] [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_hr]:my-8 [&_hr]:border-slate-200">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">NC United Wrestling</p>
      <p className="text-base font-medium text-slate-600">Schenectady, N.Y. | October 2–4, 2026 | By NC United Wrestling</p>


      <p>
        The Journeymen Fall Classic has become one of the toughest fall tournaments in the country, and this
        weekend North Carolina made noise in it. Eighteen NC wrestlers took on a main-event field packed with
        the best of the Northeast — New York, Pennsylvania, New Jersey and Connecticut — and came home with
        <strong> five main-event placers</strong> led by a runner-up finish, an <strong>Overflow title</strong>, wins over
        <strong> state champions from Virginia, Massachusetts, Connecticut and Arizona</strong>, and
        <strong> eight wins over All-Americans</strong>.
      </p>

      <h2>A field built to test you</h2>
      <p>
        Journeymen draws from the deepest wrestling states in the country, and it showed. Among the roughly 390
        high school wrestlers in the main event were at least <strong>135 state placers from 24 states</strong> —
        36 from New York and 19 from Pennsylvania alone — along with <strong>44 state champions</strong>, more
        than <strong>50 All-Americans</strong> and nearly <strong>20 nationally ranked wrestlers</strong>. Wyoming
        Seminary, Blair Academy and the top clubs of the Northeast filled the brackets, and the Women&apos;s World
        Classic held alongside it brought national teams from Germany, Italy, Japan and Poland.
      </p>
      <p>
        That is exactly why North Carolina keeps coming. With <strong>Super 32</strong> only weeks away, Journeymen
        is the closest thing to a dress rehearsal: the same caliber of opponent, the same pressure, and an honest
        read on where every wrestler stands before the biggest event of the fall.
      </p>

      <div className="my-8">
        <Image
          src={CARSON_AND_JAKE}
          alt="Carson Raper and Jake Amiott, NC Made Noise at the 2026 Journeymen Fall Classic"
          width={1145}
          height={1374}
          className="mx-auto h-auto w-full max-w-md rounded-lg"
        />
      </div>

      <h2>Lopez reaches the final at 215</h2>
      <p>
        Green Hope senior <P href={LOPEZ}>Gavin Lopez</P> was North Carolina&apos;s best finisher, placing <strong>2nd at
        215</strong>. He swept his pool 3–0 — two pins and a 7–1 decision over Wyoming Seminary — to reach the
        final, where he fell 8–2 to unbeaten <strong>NHSCA All-American and Pennsylvania state placer Sawyer
        Ermigiotti</strong>.
      </p>

      <h2>Padgett places 5th at 215</h2>
      <p>
        Croatan senior <P href={PADGETT}>Luke Padgett</P> joined Lopez on the podium at 215, placing <strong>5th</strong>
        out of the same pool-play bracket. He pinned Greens Farms Academy&apos;s Lincoln Snell and beat Wyoming
        Seminary&apos;s Konrad Kutt 4–1, then closed his weekend with a 13–4 major decision in the 5th-place match over
        New York&apos;s <strong>Landon Lee, a two-time NHSCA All-American</strong>. His only losses were a 4–2 decision to
        Blair Academy&apos;s Thomas Kellas and a 6–1 decision to the unbeaten champion, Sawyer Ermigiotti.
      </p>

      <h2>Raper takes down two state champions</h2>
      <p>
        South Rowan sophomore <P href={RAPER}>Carson Raper</P> placed <strong>5th at 113 pounds</strong> with a 3–1
        weekend. He opened with an 11–0 major decision over <strong>Virginia 5A state champion Cayden Clark</strong>,
        then beat <strong>Massachusetts state champion and NHSCA All-American Sam Winship</strong> 11–4, and won the
        5th-place match 10–4. His only loss came against Nelson Villafane, who went on to win the bracket.
      </p>

      <h2>Amiott battles through the deepest bracket in the building</h2>
      <p>
        Topsail junior <P href={AMIOTT}>Jake Amiott</P> placed <strong>6th at 152</strong>. He opened with a 6–4 win
        over <strong>2026 NHSCA All-American Micah Engelman</strong>, edged <strong>New Jersey state placer Nate
        Keller</strong> 2–1 in tiebreaker, and on the backside beat <strong>Arizona Division I state champion Nick
        Meza</strong> 4–3. Both of his losses came against nationally ranked wrestlers, the last a 6–5 decision in the
        5th-place match against <strong>#25 Matthew McDermott</strong>, a two-time NHSCA All-American and New York
        state runner-up.
      </p>

      <h2>McNair beats a nationally ranked wrestler and a state champ</h2>
      <p>
        Wakefield senior <P href={MCNAIR}>Tobin McNair</P> placed <strong>6th at 170</strong>. He tech-falled
        <strong> Connecticut state champion Vincent Rivera</strong> 19–4, then beat <strong>Devon Weber of Greece, N.Y.,
        ranked No. 16 nationally by MatScouts and No. 20 by Sports Illustrated</strong>, 4–1. Weber placed third in New
        York Division I last season. McNair&apos;s 5th-place match was a one-point loss to an NHSCA All-American.
      </p>

      <ProfileAd />

      <h2>From the Overflow to the main event</h2>
      <p>
        Cardinal Gibbons junior <P href={RICHARDS}>Luke Richards</P> earned his way in. In Friday&apos;s Overflow he
        <strong> won the 130-pound bracket, going 4–0</strong> against a 22-man field and outscoring his opponents
        51–4. That run included two tech falls and a 12–3 major decision over <strong>New Hampshire state champion
        and NHSCA All-American Francisco Juvera</strong>, and he won the final 7–1 over Pennsylvania&apos;s Zaine
        Campbell. Luke kept rolling in the main event, going 2–1 in his pool with a 17–2 tech fall over a Blair
        Academy wrestler. NC United&apos;s Stephen Cross also beat Juvera in the Overflow, 8–2.
      </p>

      <h2>Around the brackets</h2>
      <ul>
        <li>
          Davie senior <strong>Carson Worrick</strong> major-decisioned <strong>Rhode Island state runner-up Anthony
          Lombardi</strong> 13–2.
        </li>
        <li>
          Hough junior <strong>Adrian Feliciano</strong> beat <strong>2025 NHSCA All-American Jake Schiavone</strong> 4–3.
        </li>
        <li>
          Piedmont senior <strong>Jaxon Thomas</strong> beat <strong>Georgia 6A state placer Brighton Prine</strong> 8–6.
        </li>
        <li>
          New Bern teammates <strong>Jacob Perry</strong> and <strong>Xavier Bernthal</strong> each went 3–2 with wins over
          New York state placers.
        </li>
        <li>
          Topsail sophomore <strong>Braylen Yates</strong> went 2–2, falling 1–0 to <strong>Virginia 6A state champion
          Dustin Kohn</strong>.
        </li>
      </ul>
      <p>
        Also competing for North Carolina: Aiden Campbell (Havelock), Vincent Valentino (Laney), Aidan Szewczyk (Davie),
        Holt Quincy (North East Carolina Prep), Coy Deel (West Craven) and 2026 NCISA state champion Max McNeer
        (Charlotte Christian).
      </p>

      <hr />
      <p>
        Every match from the weekend, with opponent accolades, is on each wrestler&apos;s{" "}
        <Link href="/prospects/all" className="font-semibold text-[#003366] underline decoration-[#D3B574] underline-offset-2">
          RecruitNC profile
        </Link>
        . Next stop: Super 32.
      </p>
    </article>
  )
}
