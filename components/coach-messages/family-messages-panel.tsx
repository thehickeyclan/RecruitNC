"use client"

import Link from "next/link"
import { MessageSquare } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { InboxList } from "./inbox-list"

/**
 * "Coaches who've reached out" on a wrestler's profile - for the wrestler and linked parents.
 *
 * The list endpoint only returns conversations this account is part of, so a stranger or another
 * family gets nothing and the card renders nothing. A coach viewing the profile has their own
 * thread filtered out (`familyOnly`); they reach it from the Message button.
 */
export function FamilyMessagesPanel({ athleteId }: { athleteId: string }) {
  const { user } = useAuth()
  if (!user) return null
  // One card like "College coach views" above it: the heading lives inside the list's frame,
  // and the whole thing renders nothing until a coach has written.
  return (
    <InboxList
      athleteId={athleteId}
      familyOnly
      limit={5}
      empty={null}
      listClassName="divide-y divide-white/10 overflow-hidden rounded-b-sm border border-t-0 border-white/10 bg-[#0f1c2e] px-1"
      header={
        <div className="flex items-center gap-2 rounded-t-sm border border-b-0 border-white/10 bg-[#0f1c2e] px-5 pb-1 pt-5">
          <MessageSquare className="h-4 w-4 text-[#D3B574]" />
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white">Coaches who&apos;ve reached out</h3>
          <Link href="/inbox" className="ml-auto text-xs font-semibold text-[#D3B574] hover:underline">
            All messages →
          </Link>
        </div>
      }
    />
  )
}
