"use client"

import { ArrowRight, GraduationCap, Heart, Trophy, Users } from "lucide-react"

export type Who = "self" | "parent"

/**
 * "Get started" asks who you are before anything else (Matt, 31 Oct 2026). A parent searching for
 * a son was being asked to tap "That's me"; asking first lets every later step use the right
 * words, sends a college coach to the coach sign-up and anyone else to the ordinary one.
 */
export function WhoStep({ onPick }: { onPick: (who: Who) => void }) {
  const card =
    "flex w-full min-h-[64px] items-center gap-4 rounded-xl border border-white/10 bg-[#0A1628] px-4 py-3 text-left transition-colors hover:border-[#D3B574]/60"
  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f1c2e] p-6 sm:p-8">
      <h2 className="text-2xl font-black text-white sm:text-3xl">Who are you?</h2>
      <div className="mt-5 space-y-2">
        <button type="button" onClick={() => onPick("self")} className={card}>
          <Trophy className="h-5 w-5 shrink-0 text-[#D3B574]" />
          <span className="flex-1">
            <span className="block font-bold text-white">I&apos;m a wrestler</span>
            <span className="block text-sm text-white/55">Find and claim your profile</span>
          </span>
          <ArrowRight className="h-4 w-4 text-white/40" />
        </button>
        <button type="button" onClick={() => onPick("parent")} className={card}>
          <Users className="h-5 w-5 shrink-0 text-[#D3B574]" />
          <span className="flex-1">
            <span className="block font-bold text-white">I&apos;m a parent</span>
            <span className="block text-sm text-white/55">Find and claim your wrestler&apos;s profile</span>
          </span>
          <ArrowRight className="h-4 w-4 text-white/40" />
        </button>
        <a href="/auth/signup?type=college-coach" className={card}>
          <GraduationCap className="h-5 w-5 shrink-0 text-[#D3B574]" />
          <span className="flex-1">
            <span className="block font-bold text-white">I&apos;m a college coach</span>
            <span className="block text-sm text-white/55">Free access to every wrestler</span>
          </span>
          <ArrowRight className="h-4 w-4 text-white/40" />
        </a>
        <a href="/auth/signup" className={card}>
          <Heart className="h-5 w-5 shrink-0 text-[#D3B574]" />
          <span className="flex-1">
            <span className="block font-bold text-white">Fan, or high school or club coach</span>
            <span className="block text-sm text-white/55">Follow rankings, results and commitments</span>
          </span>
          <ArrowRight className="h-4 w-4 text-white/40" />
        </a>
      </div>
    </div>
  )
}
