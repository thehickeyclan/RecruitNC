"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { InboxList, type InboxThread } from "@/components/messaging/inbox-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"

export default function MessagesPage() {
  const { user, isLoading } = useAuth()
  const [threads, setThreads] = useState<InboxThread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    fetch("/api/messaging/inbox", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setThreads(data.threads ?? []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false))
  }, [user])

  if (isLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-[#003366] font-medium">Loading…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">Sign in to view your messages.</p>
            <Button asChild className="w-full bg-[#003366] hover:bg-[#003366]/90">
              <a href={`/auth/signin?returnTo=${encodeURIComponent("/messages")}`}>Sign in</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-white border-b px-4 py-4">
          <h1 className="text-xl font-bold text-[#003366]">Messages</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your groups. Tap one to open. Search for groups and direct messages coming soon.</p>
        </div>
        <Card className="rounded-none border-x-0 border-b-0 shadow-none">
          <CardContent className="p-0">
            {threads.length > 0 && (
              <div className="px-4 pt-3 pb-1">
                <h2 className="text-sm font-semibold text-gray-700">Your groups</h2>
              </div>
            )}
            <InboxList threads={threads} loading={loading} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
