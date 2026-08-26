import type { Metadata } from "next"
import { CornerCoachForm } from "@/components/toc/corner-coach-form"

/**
 * Where a family names their wrestler's corner coaches.
 *
 * The wrestler is found by searching the whole RecruitNC directory, not the TOC field. A search
 * limited to invited athletes would answer "is this wrestler going to the TOC?" for anyone who
 * typed a name; searching everybody reveals nothing about who is in it.
 */

export const metadata: Metadata = {
  title: "Corner coaches — Tournament of Champions",
  description: "Name the coaches who will corner your wrestler at the NC United Tournament of Champions.",
  robots: { index: false, follow: false },
}

export default function CornerCoachesPage() {
  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">
          Tournament of Champions
        </p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Name your corner coaches</h1>
        <p className="mt-4 text-base leading-relaxed text-[#A8BBD1]">
          Each wrestler may designate up to two coaches. We credential them and contact them
          directly — coaches buy the same ticket as everyone else, and collect a coaching lanyard
          at check-in for floor access and floor seating.
        </p>
        <CornerCoachForm />
      </div>
    </main>
  )
}
