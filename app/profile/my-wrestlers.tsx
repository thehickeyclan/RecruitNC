import Link from "next/link"
import { ArrowRight, Search, UserPlus } from "lucide-react"
import { isPlaceholderAthletePhoto } from "@/lib/recruiting-profile-photo"

export type MyWrestler = {
  id: string
  name: string
  classYear: number | null
  school: string | null
  photo: string | null
  relationship: "self" | "parent"
}

/**
 * The top of /profile: the wrestler this account belongs to, one tap from his profile.
 *
 * Nine in ten people who open /profile are after a wrestler's profile, not their account (Matt,
 * 14 October 2026). Over three weeks 125 people opened it - 54 athletes and 44 parents, 50 of them
 * owning a profile and 52 linked to one as a parent - and the most common thing they did next was
 * open a wrestler's profile. So the page leads with theirs, and the account settings follow.
 */
export function MyWrestlers({ wrestlers }: { wrestlers: MyWrestler[] }) {
  return (
    <section className="bg-[#0A1628] px-4 pb-6 pt-6 text-white" aria-labelledby="my-wrestlers">
      <div className="mx-auto max-w-3xl">
        <h1 id="my-wrestlers" className="text-2xl font-black tracking-tight sm:text-3xl">
          {wrestlers.length > 1 ? "Your wrestlers" : wrestlers.length === 1 ? (wrestlers[0]!.relationship === "self" ? "Your profile" : "Your wrestler") : "Find your profile"}
        </h1>

        {wrestlers.length ? (
          <ul className="mt-4 grid min-w-0 grid-cols-1 gap-3">
            {wrestlers.map((w) => (
              <li key={w.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-[#0f1c2e] p-3 sm:gap-4 sm:p-4">
                <Link href={`/view-profile?id=${encodeURIComponent(w.id)}`} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={w.photo && !isPlaceholderAthletePhoto(w.photo) ? w.photo : "/wrestler-silhouette.png"}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg bg-[#13294B] object-cover sm:h-20 sm:w-20"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-black">{w.name}</span>
                    <span className="block truncate text-sm text-white/60">
                      {[w.classYear ? `Class of ${w.classYear}` : null, w.school].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/view-profile?id=${encodeURIComponent(w.id)}`}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-[#D3B574] px-3 text-sm font-bold sm:px-4 text-[#0A1628] hover:bg-[#e2c98d]"
                  >
                    Open<span className="hidden sm:inline">&nbsp;profile</span> <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
            <p className="text-sm text-white/70">Your account is not linked to a wrestler yet. Find the profile and claim it, or create one.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/prospects/all" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#D3B574] px-4 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]">
                <Search className="h-4 w-4" /> Find a profile
              </Link>
              <Link href="/create-profile" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/25 px-4 text-sm font-bold text-white hover:border-[#D3B574] hover:text-[#D3B574]">
                <UserPlus className="h-4 w-4" /> Create a profile
              </Link>
            </div>
          </div>
        )}

        <Link href="/prospects/all" className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[#D3B574] hover:underline">
          <Search className="h-4 w-4" /> Looking for another wrestler? Browse every athlete <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
