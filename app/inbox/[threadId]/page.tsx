"use client"

import { use } from "react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { Conversation } from "@/components/coach-messages/conversation"

export default function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params)
  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#0A1628] text-white">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
          <Link href="/inbox" className="text-sm font-semibold text-[#D3B574] hover:underline">
            ← All messages
          </Link>
          <div className="mt-4">
            <Conversation threadId={threadId} />
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}
