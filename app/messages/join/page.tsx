"use client"

import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function MessagesJoinPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { user, isLoading } = useAuth()
  const [status, setStatus] = useState<"joining" | "done" | "error">("joining")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setErrorMessage("Invalid link. No invite token.")
      return
    }
    if (isLoading || !user) return

    fetch("/api/messaging/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.threadId) {
          setStatus("done")
          window.location.href = `/messages/${data.threadId}`
        } else {
          setStatus("error")
          setErrorMessage(data.error || "Could not join group")
        }
      })
      .catch(() => {
        setStatus("error")
        setErrorMessage("Something went wrong. Try again.")
      })
  }, [token, user, isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
      </div>
    )
  }

  if (!user) {
    const returnTo = `/messages/join${token ? `?token=${encodeURIComponent(token)}` : ""}`
    if (typeof window !== "undefined") {
      window.location.href = `/auth/signin?returnTo=${encodeURIComponent(returnTo)}`
    }
    return null
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-gray-700 font-medium mb-2">Couldn’t join the group</p>
          <p className="text-sm text-gray-500 mb-4">{errorMessage}</p>
          <Button asChild>
            <a href="/messages">Open Messages</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#003366] mx-auto mb-2" />
        <p className="text-gray-600">Joining group…</p>
      </div>
    </div>
  )
}
