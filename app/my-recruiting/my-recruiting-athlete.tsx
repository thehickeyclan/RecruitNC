"use client"

import Link from "next/link"
import { Check, ChevronRight, MessageSquare } from "lucide-react"
import { Conversation } from "@/components/coach-messages/conversation"
import { InboxList } from "@/components/coach-messages/inbox-list"
import { ProfileViewsBlock } from "@/components/profile/profile-views-block"
import type { Completeness } from "@/lib/profile-completeness"

type Athlete = {
  id: string
  name: string
  firstName: string
  classYear: number | null
  highSchool: string | null
  photo: string | null
  completeness: Completeness
}

/** One wrestler on the family's recruiting page (app/my-recruiting): completeness, views, messages. */
export function MyRecruitingAthlete({ athlete }: { athlete: Athlete }) {
  const profile = `/athletes/${athlete.id}`
  const { percent, items } = athlete.completeness
  return (
    <section aria-label={athlete.name}>
      <div className="flex items-center gap-3">
        {athlete.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={athlete.photo} alt="" className="h-12 w-12 rounded-full border border-white/15 object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-black text-white/60">
            {athlete.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-black">{athlete.name}</h2>
          <p className="truncate text-sm text-white/55">
            {[athlete.classYear ? `Class of ${athlete.classYear}` : null, athlete.highSchool].filter(Boolean).join(" · ")}
          </p>
        </div>
        <a href={profile} className="shrink-0 text-xs font-bold text-[#D3B574] hover:underline">
          View profile →
        </a>
      </div>

      <div className="mt-4 rounded-xl border border-[#D3B574]/50 bg-gradient-to-r from-[#D3B574]/15 to-[#D3B574]/5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-base font-bold">What coaches look for</p>
              <p className="text-base font-black">{percent}%</p>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-white/15 bg-[#0A1628]">
              <div className="h-full rounded-full bg-[#D3B574]" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-sm text-white/70">
              {percent === 100 ? "The profile is complete. Keep it current: college coaches read it." : "Finish the profile to get more views from college coaches."}
            </p>
          </div>
          <ul className="space-y-1.5 sm:w-64">
            {items.map((item) => (
              <li key={item.label}>
                {item.done ? (
                  <span className="flex items-center gap-2 text-sm text-white/55">
                    <Check className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden /> {item.label}
                  </span>
                ) : (
                  <a href={`${profile}?edit=${item.edit}`} className="flex items-center gap-2 text-sm font-semibold text-white hover:underline">
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#D3B574]" aria-hidden /> {item.todo}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ProfileViewsBlock athleteId={athlete.id} athleteFirstName={athlete.firstName} className="mt-4" />

      <div className="mt-4">
        <div className="flex items-center gap-2 rounded-t-sm border border-b-0 border-white/10 bg-[#0f1c2e] px-5 pb-1 pt-5">
          <MessageSquare className="h-4 w-4 text-[#D3B574]" />
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white">Coaches who&apos;ve reached out</h3>
          <Link href="/inbox" className="ml-auto text-xs font-semibold text-[#D3B574] hover:underline">
            All messages →
          </Link>
        </div>
        <InboxList
          athleteId={athlete.id}
          familyOnly
          limit={5}
          renderOpen={(id) => <Conversation threadId={id} compact />}
          listClassName="divide-y divide-white/10 overflow-hidden rounded-b-sm border border-t-0 border-white/10 bg-[#0f1c2e] px-1"
          empty={
            <p className="rounded-b-sm border border-t-0 border-white/10 bg-[#0f1c2e] px-5 pb-5 pt-2 text-sm text-white/55">
              No coach has written yet. When one does, the message shows here and you can reply; parents see every message.
            </p>
          }
        />
      </div>
    </section>
  )
}
