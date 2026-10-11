"use client"

import { AuthGuard } from "@/components/auth-guard"
import { InboxPanes } from "@/components/coach-messages/inbox-panes"

/** Recruiting messages: coaches and the families they wrote to. See lib/coach-messages.ts. */
export default function InboxPage() {
  return (
    <AuthGuard>
      <InboxPanes />
    </AuthGuard>
  )
}
