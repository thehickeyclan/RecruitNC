"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Props = {
  targetType?: string
  targetId?: string
  className?: string
}

export default function GreenRedButtons({
  targetType = "athlete",
  targetId = "demo",
  className,
}: Props) {
  const supabase = createClient()
  const [status, setStatus] = useState<string>("")
  const [pending, setPending] = useState<"green" | "red" | null>(null)
  const [signedIn, setSignedIn] = useState<boolean>(false)
  const [pageUrl, setPageUrl] = useState<string>("")

  useEffect(() => {
    setPageUrl(typeof window !== "undefined" ? window.location.href : "")
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session?.access_token))
    })
  }, [supabase])

  async function send(action: "green" | "red") {
    setStatus("")
    setPending(action)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setStatus("Please sign in first.")
        return
      }

      const res = await fetch("/api/actions/log", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType,
          targetId,
          action,
          pageUrl,
          pageTitle: typeof document !== "undefined" ? document.title : undefined,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const full = [json?.error, json?.details, json?.hint, json?.code]
          .filter(Boolean)
          .join(" | ")
        setStatus(full || "Request failed")
      } else {
        setStatus("Recorded ✔")
      }
    } catch (e: any) {
      setStatus(e?.message || "Network error")
    } finally {
      setPending(null)
    }
  }

  return (
    <Card className={`max-w-md w-full ${className ?? ""}`}>
      <CardContent className="p-5 flex flex-col gap-4">
        <div className="text-sm text-muted-foreground">
          Target: <span className="font-mono">{targetType}</span> /{" "}
          <span className="font-mono">{targetId}</span>
        </div>

        <div className="flex gap-3">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={pending !== null}
            onClick={() => send("green")}
          >
            {pending === "green" ? "Saving..." : "All Good (Green)"}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={pending !== null}
            onClick={() => send("red")}
          >
            {pending === "red" ? "Saving..." : "Needs Fix (Red)"}
          </Button>
        </div>

        {!signedIn && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Not signed in. <a className="underline" href="/auth/signin">Sign in</a> to record clicks.
          </div>
        )}

        {status && (
          <div
            className={`text-sm rounded px-3 py-2 break-words ${
              status === "Recorded ✔"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {status}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
