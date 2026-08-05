import Image from "next/image"
import Link from "next/link"

export function NcUnitedNcMatOfficialMediaPartnerContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>
          <strong>APEX, N.C.</strong> — NC United Wrestling is proud to announce <strong>The NC Mat</strong> as the
          official media partner of the 2026 <strong>Tournament of Champions</strong>, North Carolina&apos;s premier high
          school wrestling invitational, taking place September 18–19 in Apex.
        </p>
        <p>
          As the tournament&apos;s official media partner, <strong>Rhett Hoy</strong> and <strong>Ryan Mitchell</strong> of
          The NC Mat will play a central role in the event experience, including athlete and bracket announcements,
          collaboration on tournament seeding, event coverage, and live commentary throughout the weekend.
        </p>
        <p>
          The partnership brings together two organizations committed to growing and promoting wrestling across
          North Carolina while providing athletes with an exceptional championship experience.
        </p>
        <blockquote>
          <p>
            “If we&apos;re bringing together the best wrestlers in North Carolina, they deserve the best coverage as
            well,” said <strong>Matt Hickey, Co-Founder of NC United Wrestling</strong>. “Rhett and Ryan have become
            trusted voices within our wrestling community, and their passion for the sport is evident in everything
            they do. Their involvement will elevate the Tournament of Champions while helping showcase our athletes
            to wrestling fans and college coaches across the state.”
          </p>
        </blockquote>
      </section>

      <section>
        <div className="not-prose mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <Image
            src="/images/news/nc-mat-media-partnership/nc-mat-logo.png"
            alt="The NC Mat"
            width={534}
            height={374}
            className="mx-auto h-auto w-full max-w-sm"
          />
        </div>
        <h2>About The NC Mat</h2>
        <p>
          Founded to serve North Carolina&apos;s wrestling community, <strong>The NC Mat</strong> has become one of the
          state&apos;s leading media outlets, providing rankings, news, event coverage, interviews, and storytelling that
          highlights athletes, coaches, and programs from across North Carolina.
        </p>
        <blockquote>
          <p>
            “We&apos;re excited to partner with NC United on an event that shares our vision of celebrating the very best
            of North Carolina wrestling,” said <strong>Rhett Hoy of The NC Mat</strong>. “The Tournament of Champions
            brings together outstanding athletes, and we&apos;re looking forward to helping tell their stories while
            delivering first-class coverage throughout the weekend.”
          </p>
        </blockquote>
      </section>

      <section>
        <h2>About the Tournament of Champions</h2>
        <p>
          The Tournament of Champions is an invite-only event featuring <strong>88 of North Carolina&apos;s top high
          school wrestlers</strong> competing in <strong>11 eight-man brackets</strong> at college weight classes. In
          addition to elite competition, the tournament will feature 14 college programs, custom championship awards,
          premium production, and a first-class spectator experience.
        </p>
        <p>
          Tournament updates, athlete announcements, and event information are updated daily at:
        </p>
        <p>
          <Link href="/tournament-of-champions">Visit the Tournament of Champions event page</Link>
        </p>
      </section>
    </div>
  )
}
