"use client"

import { use } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { InboxPanes } from "@/components/coach-messages/inbox-panes"

/** One conversation, open in the inbox (components/coach-messages/inbox-panes.tsx). */
export default function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params)
  return (
    <AuthGuard>
      <InboxPanes initialThreadId={threadId} />
    </AuthGuard>
  )
}
