"use client"

import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"
import { InboxEmpty, InboxList } from "@/components/coach-messages/inbox-list"

/** Recruiting messages: coaches and the families they wrote to. See lib/coach-messages.ts. */
export default function InboxPage() {
  return (
    <AuthGuard>
      <Inbox />
    </AuthGuard>
  )
}

function Inbox() {
  const { profile } = useAuth()
  const coach = String((profile as { role?: string | null } | null)?.role ?? "").toLowerCase().replace(/[\s-]+/g, "_") === "college_coach"
  return (
    <main className="min-h-screen bg-[#0A1628] text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">RecruitNC</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Messages</h1>
          {coach ? (
            <Link href="/my-recruits" className="text-sm font-semibold text-[#D3B574] hover:underline">
              My Recruits →
            </Link>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-white/60">
          {coach
            ? "Conversations you started with wrestlers. Their linked parents see them too."
            : "College coaches who have reached out. Only coaches can start a conversation; you can reply."}
        </p>
        <div className="mt-6">
          <InboxList empty={<InboxEmpty coach={coach} />} />
        </div>
      </div>
    </main>
  )
}
