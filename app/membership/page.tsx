import type { Metadata } from "next"
import { RwMembershipPlans } from "@/components/recruiting/rw-membership-plans"

/** RecruitWrestlers' memberships: Insider and the Recruiting Command Center (components/recruiting/rw-membership-plans.tsx). */
export const metadata: Metadata = {
  title: "Membership",
  description: "Insider and the Recruiting Command Center: rankings, profile views and the full recruiting toolkit.",
}

export default function MembershipPage() {
  return (
    <main className="min-h-screen bg-[#0B1426] px-4 py-14 text-white sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#A3E635]">Membership</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Two ways in.</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[#A8B3C5]">
          Every profile is free. Insider adds the rankings and who&apos;s looking; the Command Center adds the whole plan.
        </p>
      </div>
      <div className="mt-10">
        <RwMembershipPlans />
      </div>
    </main>
  )
}
