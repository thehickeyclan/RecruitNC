"use client"

import { useParams } from "next/navigation"

export default function ForumDmPage() {
  const params = useParams()
  const conversationId = params.conversationId as string

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-white/70">
        DM conversation view coming next. Conversation ID: {conversationId}
      </p>
      <p className="text-white/50 text-sm mt-2">
        Use the existing Messages inbox for direct messages for now.
      </p>
    </div>
  )
}
