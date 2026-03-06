"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { HardLink } from "@/components/hard-link"
import { useAuth } from "@/contexts/auth-context"
import { Users, Loader2 } from "lucide-react"

type Preview = {
  valid: boolean
  error?: string
  group_name?: string
  group_id?: string
  expires_at?: string
  uses_left?: number
}

export default function InvitePage() {
  const params = useParams()
  const code = params.code as string
  const { user, isLoading } = useAuth()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return
    fetch(`/api/forum/invite/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then(setPreview)
      .catch(() => setPreview({ valid: false, error: "Could not load invite" }))
  }, [code])

  async function handleJoin() {
    if (!code || joining || !preview?.valid) return
    setError(null)
    setJoining(true)
    try {
      const res = await fetch(`/api/forum/invite/${encodeURIComponent(code)}/join`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to join")
      const channelId = data.channel_id
      const groupId = data.group_id
      if (groupId && channelId) {
        window.location.href = `/forum/groups/${groupId}/channels/${channelId}`
      } else {
        window.location.href = "/forum"
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setJoining(false)
    }
  }

  if (!preview) {
    return (
      <div className="min-h-screen bg-[#0B2545] flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-[#C8A94A]" />
      </div>
    )
  }

  if (!preview.valid) {
    return (
      <div className="min-h-screen bg-[#0B2545] flex items-center justify-center p-6">
        <div className="bg-white/10 rounded-xl p-8 max-w-md text-center">
          <p className="text-white/90 text-lg font-semibold mb-2">Invalid or expired link</p>
          <p className="text-white/70 text-sm mb-6">{preview.error ?? "This invite link is no longer valid."}</p>
          <HardLink href="/forum" className="text-[#C8A94A] hover:underline font-medium">
            Go to Community →
          </HardLink>
        </div>
      </div>
    )
  }

  const returnTo = `/invite/${code}`

  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-[#0B2545] flex items-center justify-center p-6">
        <div className="bg-white/10 rounded-xl p-8 max-w-md text-center">
          <Users className="w-14 h-14 text-[#C8A94A] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Join {preview.group_name}</h1>
          <p className="text-white/70 text-sm mb-6">
            Sign in or create a RecruitNC account to join this group.
          </p>
          <HardLink
            href={`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`}
            className="inline-block px-6 py-3 rounded-lg bg-[#C8A94A] text-[#0B2545] font-semibold hover:bg-[#E2C46A]"
          >
            Sign in
          </HardLink>
          <p className="text-white/50 text-xs mt-4">
            No account? <HardLink href={`/auth/signup?returnTo=${encodeURIComponent(returnTo)}`} className="text-[#C8A94A] hover:underline">Sign up</HardLink>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B2545] flex items-center justify-center p-6">
      <div className="bg-white/10 rounded-xl p-8 max-w-md text-center">
        <Users className="w-14 h-14 text-[#C8A94A] mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Join {preview.group_name}</h1>
        <p className="text-white/70 text-sm mb-4">
          You’re signed in. Click below to join this community group.
        </p>
        {preview.uses_left != null && (
          <p className="text-white/50 text-xs mb-4">{preview.uses_left} invite uses remaining</p>
        )}
        {error && <p className="text-red-300 text-sm mb-4">{error}</p>}
        <button
          type="button"
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-3 rounded-lg bg-[#C8A94A] text-[#0B2545] font-semibold hover:bg-[#E2C46A] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {joining ? "Joining…" : "Join group"}
        </button>
      </div>
    </div>
  )
}
