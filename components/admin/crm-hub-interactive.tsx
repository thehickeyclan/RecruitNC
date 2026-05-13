"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"

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
      toast({ title: "Saved", description: "Triage settings updated." })
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
      toast({ title: "Note empty", description: "Enter note text.", variant: "destructive" })
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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Triage</h2>
        <p className="text-sm text-muted-foreground mb-4">Assigned staff and priority (CRM-only; does not change the user account).</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Assigned admin</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
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
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
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
          <Button type="button" onClick={() => void saveSettings()} disabled={savingSettings}>
            {savingSettings ? "Saving…" : "Save triage"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Add note</h2>
        <p className="text-sm text-muted-foreground mb-4">Internal notes for staff. Visible on this hub only.</p>
        <div className="space-y-4">
          <Textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Call summary, follow-up, billing context…"
            rows={5}
            className="resize-y min-h-[120px]"
          />
          <div className="flex items-center gap-2">
            <Switch id="crm-pin" checked={notePinned} onCheckedChange={setNotePinned} />
            <Label htmlFor="crm-pin" className="font-normal cursor-pointer">
              Pin (sorts to top)
            </Label>
          </div>
          <Button type="button" onClick={() => void saveNote()} disabled={savingNote}>
            {savingNote ? "Saving…" : "Add note"}
          </Button>
        </div>
      </div>
    </div>
  )
}
