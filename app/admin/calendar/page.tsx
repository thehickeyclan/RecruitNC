"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HardLink } from "@/components/hard-link"
import { eventCategories } from "@/lib/nc-united-calendar/calendar-config"
import type { EventCategory } from "@/lib/nc-united-calendar/types"
import { Calendar, Pencil, Plus, Trash2, Users } from "lucide-react"
import type { EventDropInStats } from "@/lib/nc-united-calendar/aggregate-drop-in-stats"

type DbEvent = {
  id: number | string
  title: string
  start_date: string
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  category: string
  location?: string | null
  description?: string | null
  coach?: string | null
  registration_deadline?: string | null
  entry_fee?: number | null
  travel_info?: string | null
  weight_classes?: string[] | null
  rsvp_required?: boolean | null
  external_link?: string | null
  logo_url?: string | null
  drop_in_registration_link?: string | null
  max_drop_ins?: number | null
}

type DropInRequestRow = {
  id: string
  wrestler_name: string
  wrestler_age?: number | null
  parent_name: string
  parent_email: string
  parent_phone?: string | null
  status: string
  payment_status: string
  payment_amount_cents: number | null
  created_at: string
}

const CATEGORIES = Object.keys(eventCategories) as EventCategory[]

function emptyForm() {
  return {
    title: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    category: "blue-practice" as EventCategory,
    location: "",
    description: "",
    coach: "",
    registrationDeadline: "",
    entryFee: "",
    travelInfo: "",
    weightClasses: "",
    rsvpRequired: false,
    externalLink: "",
    logoUrl: "",
    dropInRegistrationLink: "",
    maxDropIns: "10",
  }
}

export default function AdminCalendarPage() {
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<DbEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [dropInStatsByEventId, setDropInStatsByEventId] = useState<Record<string, EventDropInStats>>({})
  const [dropInDialogOpen, setDropInDialogOpen] = useState(false)
  const [dropInDialogEvent, setDropInDialogEvent] = useState<DbEvent | null>(null)
  const [dropInRows, setDropInRows] = useState<DropInRequestRow[]>([])
  const [dropInLoading, setDropInLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/calendar/events", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) {
        const msg =
          res.status === 403
            ? "Admin access required. Ask an owner to set is_admin on your account in user_profiles."
            : res.status === 401
              ? "Sign in to manage calendar events."
              : data.error || "Failed to load events"
        setError(msg)
        setEvents([])
        setDropInStatsByEventId({})
        return
      }
      setEvents(data.events || [])
      setDropInStatsByEventId(data.dropInStatsByEventId || {})
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setEvents([])
      setDropInStatsByEventId({})
    } finally {
      setLoading(false)
    }
  }, [])

  const dropInTotals = useMemo(() => {
    let paid = 0
    let awaitingPayment = 0
    let towardCapacity = 0
    for (const s of Object.values(dropInStatsByEventId)) {
      paid += s.paid
      awaitingPayment += s.awaitingPayment
      towardCapacity += s.towardCapacity
    }
    return { paid, awaitingPayment, towardCapacity }
  }, [dropInStatsByEventId])

  const openDropInDialog = async (ev: DbEvent) => {
    setError(null)
    setDropInDialogEvent(ev)
    setDropInDialogOpen(true)
    setDropInRows([])
    setDropInLoading(true)
    try {
      const res = await fetch(`/api/admin/calendar/events/${ev.id}/drop-ins`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to load drop-in requests")
        return
      }
      setDropInRows((data.requests || []) as DropInRequestRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drop-ins")
    } finally {
      setDropInLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditingId(null)
      setForm(emptyForm())
      setDialogOpen(true)
    }
  }, [searchParams])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  function openEdit(ev: DbEvent) {
    setEditingId(String(ev.id))
    setForm({
      title: ev.title,
      startDate: ev.start_date?.slice(0, 10) || "",
      endDate: ev.end_date?.slice(0, 10) || "",
      startTime: ev.start_time || "",
      endTime: ev.end_time || "",
      category: (ev.category as EventCategory) || "blue-practice",
      location: ev.location || "",
      description: ev.description || "",
      coach: ev.coach || "",
      registrationDeadline: ev.registration_deadline?.slice(0, 10) || "",
      entryFee: ev.entry_fee != null ? String(ev.entry_fee) : "",
      travelInfo: ev.travel_info || "",
      weightClasses: Array.isArray(ev.weight_classes) ? ev.weight_classes.join(", ") : "",
      rsvpRequired: !!ev.rsvp_required,
      externalLink: ev.external_link || "",
      logoUrl: ev.logo_url || "",
      dropInRegistrationLink: ev.drop_in_registration_link || "",
      maxDropIns: ev.max_drop_ins != null ? String(ev.max_drop_ins) : "10",
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.startDate) {
      setError("Title and start date are required.")
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      title: form.title.trim(),
      startDate: form.startDate,
      endDate: form.endDate || null,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      category: form.category,
      location: form.location || undefined,
      description: form.description || undefined,
      coach: form.coach || undefined,
      registrationDeadline: form.registrationDeadline || null,
      entryFee: form.entryFee ? Number.parseFloat(form.entryFee) : null,
      travelInfo: form.travelInfo || undefined,
      weightClasses: form.weightClasses,
      rsvpRequired: form.rsvpRequired,
      externalLink: form.externalLink || undefined,
      logoUrl: form.logoUrl || undefined,
      dropInRegistrationLink: form.dropInRegistrationLink || undefined,
      maxDropIns: form.maxDropIns ? Number.parseInt(form.maxDropIns, 10) : null,
    }
    try {
      const url = editingId ? `/api/admin/calendar/events/${editingId}` : "/api/admin/calendar/events"
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(
          res.status === 403
            ? "Admin access required to save."
            : data.error || "Save failed",
        )
        return
      }
      setDialogOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event? Drop-in requests for this event will be removed (cascade).")) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/calendar/events/${id}`, { method: "DELETE", credentials: "include" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Delete failed")
        return
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-[#003366] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">NC United Calendar</h1>
              <p className="text-sm text-blue-100">
                Add events, edit any row, delete when needed. Blue/Gold practices use Stripe drop-ins; see counts below.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <HardLink href="/calendar" className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#003366]">
              View public calendar
            </HardLink>
            <Button type="button" onClick={openCreate} className="bg-amber-500 text-white hover:bg-amber-600">
              <Plus className="mr-1 h-4 w-4" />
              New event
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <AdminHeader />

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                Drop-ins (toward cap)
              </div>
              <p className="mt-1 text-2xl font-bold text-[#003366]">{dropInTotals.towardCapacity}</p>
              <p className="text-xs text-muted-foreground">Pending Stripe checkout + paid</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-600">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">Paid registrations</p>
              <p className="mt-1 text-2xl font-bold text-green-800">{dropInTotals.paid}</p>
              <p className="text-xs text-muted-foreground">payment_status = paid</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-600">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">Awaiting payment</p>
              <p className="mt-1 text-2xl font-bold text-amber-900">{dropInTotals.awaitingPayment}</p>
              <p className="text-xs text-muted-foreground">Checkout started, not completed</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>
              Sorted by start date. Use <strong>New event</strong> or <strong>Edit</strong> on a row. Drop-in usage counts toward{" "}
              <strong>max drop-ins</strong> (pending + paid). Open <strong>Drop-ins</strong> for full request details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600">Loading…</p>
            ) : events.length === 0 ? (
              <p className="text-gray-600">No events yet. Click “New event”.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Location</th>
                      <th className="py-2 pr-4">Drop-in usage</th>
                      <th className="py-2 pr-4">Max</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => {
                      const st = dropInStatsByEventId[String(ev.id)]
                      const max = ev.max_drop_ins ?? null
                      const toward = st?.towardCapacity ?? 0
                      const paid = st?.paid ?? 0
                      const awaiting = st?.awaitingPayment ?? 0
                      return (
                        <tr key={String(ev.id)} className="border-b border-gray-100">
                          <td className="py-2 pr-4 whitespace-nowrap">{ev.start_date?.slice(0, 10) ?? ev.start_date}</td>
                          <td className="py-2 pr-4 font-medium">{ev.title}</td>
                          <td className="py-2 pr-4">{eventCategories[ev.category as EventCategory]?.label ?? ev.category}</td>
                          <td className="py-2 pr-4 max-w-[180px] truncate">{ev.location || "—"}</td>
                          <td className="py-2 pr-4 text-xs">
                            {st && st.total > 0 ? (
                              <span>
                                <span className="font-semibold text-[#003366]">
                                  {toward}
                                  {max != null ? ` / ${max}` : ""}
                                </span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  cap · {paid} paid · {awaiting} awaiting pay
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-4">{max ?? "—"}</td>
                          <td className="py-2 text-right whitespace-nowrap">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="mr-1"
                              onClick={() => openDropInDialog(ev)}
                            >
                              Drop-ins
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="mr-1" onClick={() => openEdit(ev)}>
                              <Pencil className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-red-700"
                              onClick={() => handleDelete(String(ev.id))}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit event" : "New event"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Blue practice"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="startDate">Start date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="startTime">Start time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as EventCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {eventCategories[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="coach">Coach</Label>
              <Input id="coach" value={form.coach} onChange={(e) => setForm((f) => ({ ...f, coach: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="maxDropIns">Max drop-ins (practices)</Label>
              <Input
                id="maxDropIns"
                type="number"
                min={1}
                value={form.maxDropIns}
                onChange={(e) => setForm((f) => ({ ...f, maxDropIns: e.target.value }))}
              />
              <p className="mt-1 text-xs text-muted-foreground">Caps pending + paid Stripe drop-ins for this session.</p>
            </div>
            <div>
              <Label htmlFor="dropInRegistrationLink">Drop-in registration link (optional)</Label>
              <Input
                id="dropInRegistrationLink"
                value={form.dropInRegistrationLink}
                onChange={(e) => setForm((f) => ({ ...f, dropInRegistrationLink: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="registrationDeadline">Registration deadline</Label>
                <Input
                  id="registrationDeadline"
                  type="date"
                  value={form.registrationDeadline}
                  onChange={(e) => setForm((f) => ({ ...f, registrationDeadline: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="entryFee">Entry fee ($)</Label>
                <Input
                  id="entryFee"
                  type="number"
                  step="0.01"
                  value={form.entryFee}
                  onChange={(e) => setForm((f) => ({ ...f, entryFee: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="travelInfo">Travel info</Label>
              <Textarea
                id="travelInfo"
                rows={2}
                value={form.travelInfo}
                onChange={(e) => setForm((f) => ({ ...f, travelInfo: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="weightClasses">Weight classes (comma-separated)</Label>
              <Input
                id="weightClasses"
                value={form.weightClasses}
                onChange={(e) => setForm((f) => ({ ...f, weightClasses: e.target.value }))}
                placeholder="106, 113, 120"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="rsvp"
                checked={form.rsvpRequired}
                onCheckedChange={(c) => setForm((f) => ({ ...f, rsvpRequired: c === true }))}
              />
              <Label htmlFor="rsvp" className="font-normal">
                RSVP required
              </Label>
            </div>
            <div>
              <Label htmlFor="externalLink">External link</Label>
              <Input
                id="externalLink"
                value={form.externalLink}
                onChange={(e) => setForm((f) => ({ ...f, externalLink: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={form.logoUrl}
                onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dropInDialogOpen}
        onOpenChange={(open) => {
          setDropInDialogOpen(open)
          if (!open) setDropInDialogEvent(null)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Drop-in requests</DialogTitle>
            {dropInDialogEvent && (
              <p className="text-sm text-muted-foreground">
                {dropInDialogEvent.title} · {dropInDialogEvent.start_date?.slice(0, 10) ?? dropInDialogEvent.start_date}
              </p>
            )}
          </DialogHeader>
          {dropInLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : dropInRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drop-in requests for this event.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-3">Wrestler</th>
                    <th className="py-2 pr-3">Parent</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Payment</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {dropInRows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2 pr-3">
                        {r.wrestler_name}
                        {r.wrestler_age != null ? ` (${r.wrestler_age})` : ""}
                      </td>
                      <td className="py-2 pr-3">{r.parent_name}</td>
                      <td className="py-2 pr-3 break-all">{r.parent_email}</td>
                      <td className="py-2 pr-3">{r.status}</td>
                      <td className="py-2 pr-3">{r.payment_status}</td>
                      <td className="py-2 pr-3">
                        {r.payment_amount_cents != null
                          ? `$${(r.payment_amount_cents / 100).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="py-2 whitespace-nowrap text-xs text-muted-foreground">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDropInDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
