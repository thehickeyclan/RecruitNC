"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2, Plus, Copy, Check, Mail } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

type InviteRow = {
  id: string
  token: string
  email: string | null
  expires_at: string
  used_at: string | null
  created_at: string
  notes: string | null
}

export default function AdminBlueInvitesPage() {
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newInviteeName, setNewInviteeName] = useState("")
  const [newPersonalNote, setNewPersonalNote] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null)
  const [copiedDraftPart, setCopiedDraftPart] = useState<"subject" | "body" | "all" | null>(null)
  const { toast } = useToast()

  function buildDraftEmail(registerUrl: string, inviteeName: string, personalNote: string): { subject: string; body: string } {
    const name = inviteeName.trim() || "there"
    const greeting = `Hi ${name},`
    let body = `${greeting}

You're invited to join NC United Blue — our invite-only wrestling program.

Use the link below to complete registration and payment. The link is private and will expire in 14 days.

${registerUrl}
`
    if (personalNote.trim()) {
      body += `\n${personalNote.trim()}\n\n`
    }
    body += `Questions? Reply to this email or contact info@ncwrestlingunited.com`
    return {
      subject: "You're invited to join NC United Blue",
      body,
    }
  }

  const loadInvites = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/blue/invites", { credentials: "include" })
      const data = await res.json()
      if (res.ok) setInvites(data.invites ?? [])
    } catch {
      toast({ title: "Failed to load invites", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvites()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch("/api/admin/blue/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: newEmail.trim() || undefined,
          notes: newNotes.trim() || undefined,
          expiresInDays: 14,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error || "Failed to create invite", variant: "destructive" })
        setCreating(false)
        return
      }
      if (data.emailSent && newEmail.trim()) {
        toast({ title: "Invite created and sent", description: `Email sent to ${newEmail.trim()}.` })
      } else {
        toast({ title: "Invite created", description: "Copy the email draft below or use the link." })
      }
      if (data.registerUrl) {
        setEmailDraft(buildDraftEmail(data.registerUrl, newInviteeName, newPersonalNote))
        setCopiedUrl(data.registerUrl)
        try {
          await navigator.clipboard.writeText(data.registerUrl)
          setTimeout(() => setCopiedUrl(null), 2000)
        } catch {}
      }
      setNewEmail("")
      setNewInviteeName("")
      setNewPersonalNote("")
      setNewNotes("")
      loadInvites()
    } catch {
      toast({ title: "Failed to create invite", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url)
      toast({ title: "Link copied to clipboard" })
      setTimeout(() => setCopiedUrl(null), 2000)
    })
  }

  const copyDraft = (part: "subject" | "body" | "all") => {
    if (!emailDraft) return
    const text = part === "subject" ? emailDraft.subject : part === "body" ? emailDraft.body : `${emailDraft.subject}\n\n${emailDraft.body}`
    navigator.clipboard.writeText(text).then(() => {
      setCopiedDraftPart(part)
      toast({ title: part === "all" ? "Subject and body copied" : part === "subject" ? "Subject copied" : "Body copied" })
      setTimeout(() => setCopiedDraftPart(null), 2000)
    })
  }

  const sendInvite = async (inv: InviteRow, toEmail?: string) => {
    const to = toEmail?.trim() || inv.email?.trim()
    if (!to) {
      const entered = window.prompt("Enter email address to send invite to:")
      if (!entered?.trim()) return
      return sendInvite(inv, entered)
    }
    setSendingId(inv.id)
    try {
      const res = await fetch("/api/admin/blue/invites/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inviteId: inv.id, to: to || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: "Invite sent", description: `Email sent to ${data.sentTo}.` })
      } else {
        toast({ title: data.error || "Failed to send", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to send", variant: "destructive" })
    } finally {
      setSendingId(null)
    }
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/blue"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#13294B]">Blue program invites</h1>
            <p className="text-sm text-gray-600">Create private registration links for new Blue members.</p>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create invite</CardTitle>
            <CardDescription>Generate a link to send to a parent. They’ll use it to register their athlete for Blue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2 min-w-[200px]">
                  <Label htmlFor="newInviteeName">Invitee name (for email greeting)</Label>
                  <Input
                    id="newInviteeName"
                    value={newInviteeName}
                    onChange={(e) => setNewInviteeName(e.target.value)}
                    placeholder="e.g. John"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2 min-w-[200px]">
                  <Label htmlFor="newEmail">Email (optional)</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="parent@example.com"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2 min-w-[200px]">
                  <Label htmlFor="newNotes">Internal notes (optional)</Label>
                  <Input
                    id="newNotes"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="e.g. Smith family"
                    disabled={creating}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPersonalNote">Personal note for email (optional)</Label>
                <Input
                  id="newPersonalNote"
                  value={newPersonalNote}
                  onChange={(e) => setNewPersonalNote(e.target.value)}
                  placeholder="e.g. We'd love to have your wrestler join us this season."
                  disabled={creating}
                  className="max-w-xl"
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="ml-2">Create invite & get email draft</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {emailDraft && (
          <Card className="mb-8 border-[#13294B]/20">
            <CardHeader>
              <CardTitle className="text-lg">Email draft — copy and paste into your email</CardTitle>
              <CardDescription>Use your own email (Gmail, etc.) to send this. Variables are already filled in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Subject</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={emailDraft.subject} className="font-medium" />
                  <Button variant="outline" size="sm" onClick={() => copyDraft("subject")}>
                    {copiedDraftPart === "subject" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-1">Copy</span>
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Body</Label>
                <div className="flex gap-2">
                  <textarea
                    readOnly
                    value={emailDraft.body}
                    rows={12}
                    className="flex-1 min-w-0 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-mono"
                  />
                  <Button variant="outline" size="sm" className="self-start shrink-0" onClick={() => copyDraft("body")}>
                    {copiedDraftPart === "body" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-1">Copy body</span>
                  </Button>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => copyDraft("all")}>
                {copiedDraftPart === "all" ? <Check className="h-4 w-4 text-green-600 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy subject + body (paste into new email)
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Invites</CardTitle>
            <CardDescription>Links expire in 14 days. Used invites cannot be reused.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#13294B]" />
              </div>
            ) : invites.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No invites yet. Create one above.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((inv) => {
                      const url = `${baseUrl}/blue/register?invite=${encodeURIComponent(inv.token)}`
                      const used = !!inv.used_at
                      const expired = new Date(inv.expires_at) < new Date()
                      return (
                        <TableRow key={inv.id}>
                          <TableCell>{inv.email || "—"}</TableCell>
                          <TableCell className="max-w-[120px] truncate text-gray-600" title={inv.notes ?? undefined}>{inv.notes || "—"}</TableCell>
                          <TableCell>
                            {used ? <span className="text-amber-600">Used</span> : expired ? <span className="text-red-600">Expired</span> : <span className="text-green-600">Active</span>}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{new Date(inv.expires_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm text-gray-600">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {!used && !expired && (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => copyUrl(url)}>
                                  {copiedUrl === url ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                  <span className="ml-1">Copy</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => sendInvite(inv)}
                                  disabled={sendingId === inv.id}
                                  title={inv.email ? `Send to ${inv.email}` : "Send to… (enter email)"}
                                >
                                  {sendingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                  <span className="ml-1">Send</span>
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
