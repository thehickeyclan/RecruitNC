"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { UserCog, Send, StickyNote } from "lucide-react"
import { cn } from "@/lib/utils"

type Assignee = { user_id: string; label: string }

export function CrmHubInteractive({
  contactUserId,
  assignees,
  settingsInitial,
}: {
  contactUserId: string
  assignees: Assignee[]
  settingsInitial: { assigned_admin_user_id: string | null; priority: string | null } | null
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [savingSettings, setSavingSettings] = useState(false)
  const [noteBody, setNoteBody] = useState("")
  const [notePinned, setNotePinned] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  const [assignee, setAssignee] = useState<string>(
    settingsInitial?.assigned_admin_user_id ?? "__unassigned__",
  )
  const [priority, setPriority] = useState<string>(settingsInitial?.priority ?? "__none__")

  useEffect(() => {
    setAssignee(settingsInitial?.assigned_admin_user_id ?? "__unassigned__")
    setPriority(settingsInitial?.priority ?? "__none__")
  }, [settingsInitial?.assigned_admin_user_id, settingsInitial?.priority, contactUserId])

  async function saveSettings() {
    setSavingSettings(true)
    try {
      const res = await fetch(`/api/admin/crm/users/${encodeURIComponent(contactUserId)}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_admin_user_id: assignee === "__unassigned__" ? null : assignee,
          priority: priority === "__none__" ? null : priority,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Save failed")
      }
      toast({ title: "Saved", description: "Triage updated for this contact." })
      router.refresh()
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Save failed",
        variant: "destructive",
      })
    } finally {
      setSavingSettings(false)
    }
  }

  async function saveNote() {
    const body = noteBody.trim()
    if (!body) {
      toast({ title: "Note empty", description: "Enter something to save.", variant: "destructive" })
      return
    }
    setSavingNote(true)
    try {
      const res = await fetch(`/api/admin/crm/users/${encodeURIComponent(contactUserId)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, pinned: notePinned }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not save note")
      }
      toast({ title: "Note added" })
      setNoteBody("")
      setNotePinned(false)
      router.refresh()
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Could not save note",
        variant: "destructive",
      })
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-md",
          "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/[0.04] before:to-transparent",
        )}
      >
        <div className="relative flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <UserCog className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight">Ownership & priority</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Internal CRM fields only — does not change the user&apos;s RecruitNC account.
            </p>
          </div>
        </div>
        <div className="relative mt-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Assigned teammate</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="h-11 rounded-xl border-border/70 bg-background/80">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">Unassigned</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-11 rounded-xl border-border/70 bg-background/80">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            className="h-11 w-full rounded-xl font-medium shadow-sm sm:w-auto"
            onClick={() => void saveSettings()}
            disabled={savingSettings}
          >
            {savingSettings ? "Saving…" : "Save triage"}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-md",
          "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-[#D3B574]/[0.07] before:to-transparent",
        )}
      >
        <div className="relative flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D3B574]/15 text-[#8a7040] dark:text-[#e8d5a8]">
            <StickyNote className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight">Log a note</h2>
            <p className="mt-1 text-sm text-muted-foreground">Visible to staff on this hub only. Use Timeline to read history.</p>
          </div>
        </div>
        <div className="relative mt-5 space-y-4">
          <Textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Call recap, billing context, follow-up promise…"
            rows={5}
            className="min-h-[140px] resize-y rounded-xl border-border/70 bg-background/80 text-base"
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Switch id="crm-pin" checked={notePinned} onCheckedChange={setNotePinned} />
              <Label htmlFor="crm-pin" className="cursor-pointer font-normal text-sm">
                Pin to top of list
              </Label>
            </div>
            <Button
              type="button"
              className="h-11 gap-2 rounded-xl bg-[#0a1628] text-white hover:bg-[#0f2847] dark:bg-primary dark:hover:bg-primary/90"
              onClick={() => void saveNote()}
              disabled={savingNote}
            >
              <Send className="h-4 w-4" />
              {savingNote ? "Saving…" : "Add note"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
