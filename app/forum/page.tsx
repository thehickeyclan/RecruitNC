"use client"

import { HardLink } from "@/components/hard-link"
import { MessageCircle } from "lucide-react"

export default function ForumPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <MessageCircle className="w-16 h-16 text-[#C8A94A]/70 mb-4" />
      <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        Community
      </h1>
      <p className="text-white/70 max-w-md mb-6">
        Pick a group and channel from the sidebar, or start a direct message. This replaces GroupMe so your community stays in RecruitNC.
      </p>
      <HardLink
        href="/messages"
        className="text-[#C8A94A] hover:underline font-medium"
      >
        Open existing Messages (inbox) →
      </HardLink>
    </div>
  )
}
