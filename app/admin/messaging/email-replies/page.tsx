"use client"

import { useEffect, useState } from "react"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HardLink } from "@/components/hard-link"
import { ArrowLeft, Mail, Loader2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

type ThreadRow = {
  id: string
  subject: string
  recipient_user_id: string
  recipient_label: string
  has_unread_inbound: boolean
  last_message_at: string
  created_at: string
}

type MsgRow = {
  id: string
  direction: string
  body_text: string
  body_html: string | null
  from_email: string | null
  created_at: string
}

export default function AdminEmailRepliesPage() {
  const [threads, setThreads] = useState<ThreadRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MsgRow[] | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)

  useEffect(() => {
    setLoadingList(true)
    fetch("/api/admin/messaging/email-replies", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        setThreads(d.threads ?? [])
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoadingList(false))
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setMessages(null)
      return
    }
    setLoadingThread(true)
    fetch(`/api/admin/messaging/email-replies/${selectedId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? [])
        void fetch(`/api/admin/messaging/email-replies/${selectedId}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_read" }),
        })
        setThreads((prev) =>
          prev
            ? prev.map((t) => (t.id === selectedId ? { ...t, has_unread_inbound: false } : t))
            : prev,
        )
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingThread(false))
  }, [selectedId])

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <HardLink href="/admin/messaging">
              <ArrowLeft className="h-4 w-4" />
            </HardLink>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[#003366] md:text-3xl">
              <Mail className="h-8 w-8 text-[#C8102E]" />
              Email replies
            </h1>
            <p className="text-muted-foreground mt-1">
              Inbound replies to admin blasts (requires{" "}
              <code className="rounded bg-muted px-1 text-xs">RECRUITNC_EMAIL_REPLY_DOMAIN</code> + Resend webhook).
            </p>
          </div>
        </div>

        <AdminHeader />

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Threads</CardTitle>
              <CardDescription>Newest activity first.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-auto p-0">
              {loadingList ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
                </div>
              ) : error ? (
                <p className="text-destructive px-6 py-4 text-sm">{error}</p>
              ) : !threads?.length ? (
                <p className="text-muted-foreground px-6 py-8 text-sm">
                  No threads yet — send an email blast with Reply-To configured, then when a user replies it appears
                  here.
                </p>
              ) : (
                <ul className="divide-y">
                  {threads.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className={cn(
                          "flex w-full flex-col gap-1 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/80",
                          selectedId === t.id && "bg-[#003366]/8",
                        )}
                      >
                        <span className="flex items-center gap-2 font-medium text-[#003366]">
                          {t.has_unread_inbound && (
                            <Circle className="h-2 w-2 shrink-0 fill-[#C8102E] text-[#C8102E]" aria-hidden />
                          )}
                          {t.subject || "(no subject)"}
                        </span>
                        <span className="text-muted-foreground text-xs">{t.recipient_label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(t.last_message_at).toLocaleString()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">Conversation</CardTitle>
              <CardDescription>Outbound blast copy + user replies.</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedId ? (
                <p className="text-muted-foreground text-sm">Select a thread.</p>
              ) : loadingThread ? (
                <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
              ) : (
                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                  {(messages ?? []).map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-lg border px-4 py-3 text-sm",
                        m.direction === "outbound"
                          ? "border-[#003366]/25 bg-[#003366]/5"
                          : "border-[#C8102E]/25 bg-white",
                      )}
                    >
                      <div className="text-muted-foreground mb-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
                        <span>{m.direction === "outbound" ? "Admin blast" : "Reply"}</span>
                        <span>{new Date(m.created_at).toLocaleString()}</span>
                        {m.from_email && <span>{m.from_email}</span>}
                      </div>
                      <pre className="font-sans text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                        {m.body_text}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
