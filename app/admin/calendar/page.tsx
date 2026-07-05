"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { parseCivilDateFromDatabase } from "@/lib/nc-united-calendar/calendar-date"
import type { EventCategory } from "@/lib/nc-united-calendar/types"
import { Calendar, Pencil, Plus, Trash2, Users, X, Loader2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react"
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
  wrestler_dob?: string | null
  wrestler_cell?: string | null
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
  const [showAdvanced, setShowAdvanced] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/calendar/events", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) {
        const msg =
          res.status === 403
            ? "Admin access required."
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
    setShowAdvanced(false)
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
    setShowAdvanced(true)
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
        setError(res.status === 403 ? "Admin access required." : data.error || "Save failed")
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
    if (!confirm("Delete this event?")) return
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
    <div className="min-h-screen bg-[#0A1628]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#13294B] to-[#0A1628] border-b border-[#1e3a5f]">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-[#D3B574]" />
              <div>
                <h1 className="text-2xl font-bold text-white">Calendar Admin</h1>
                <p className="text-sm text-gray-400">Manage events, practices, and tournaments</p>
              </div>
            </div>
            <div className="flex gap-2">
              <HardLink
                href="/calendar"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1e3a5f] text-gray-300 hover:text-white hover:border-gray-500 text-sm font-medium transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View Public
              </HardLink>
              <Button onClick={openCreate} className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-800 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-[#0F1E32] border border-[#1e3a5f]">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Users className="h-4 w-4" />
              Drop-ins
            </div>
            <p className="text-2xl font-bold text-white">{dropInTotals.towardCapacity}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0F1E32] border border-[#1e3a5f]">
            <p className="text-gray-400 text-sm mb-1">Paid</p>
            <p className="text-2xl font-bold text-green-400">{dropInTotals.paid}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0F1E32] border border-[#1e3a5f]">
            <p className="text-gray-400 text-sm mb-1">Awaiting</p>
            <p className="text-2xl font-bold text-amber-400">{dropInTotals.awaitingPayment}</p>
          </div>
        </div>

        {/* Events List */}
        <div className="rounded-xl bg-[#0F1E32] border border-[#1e3a5f] overflow-hidden">
          <div className="p-4 border-b border-[#1e3a5f]">
            <h2 className="font-semibold text-white">Events</h2>
            <p className="text-sm text-gray-500">Sorted by date</p>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#D3B574] mx-auto" />
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No events yet. Click &quot;Add Event&quot; to create one.
            </div>
          ) : (
            <div className="divide-y divide-[#1e3a5f]">
              {events.map((ev) => {
                const st = dropInStatsByEventId[String(ev.id)]
                const max = ev.max_drop_ins ?? null
                const toward = st?.towardCapacity ?? 0
                const startDay = parseCivilDateFromDatabase(ev.start_date)
                return (
                  <div key={String(ev.id)} className="p-4 hover:bg-[#1e3a5f]/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Date */}
                      <div className="flex-shrink-0 w-16 text-center hidden sm:block">
                        <div className="text-xl font-bold text-white">
                          {startDay.getDate()}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">
                          {startDay.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#1e3a5f] text-gray-300">
                            {eventCategories[ev.category as EventCategory]?.label ?? ev.category}
                          </span>
                          <span className="text-xs text-gray-500 sm:hidden">
                            {ev.start_date?.slice(0, 10)}
                          </span>
                        </div>
                        <h3 className="font-medium text-white truncate">{ev.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                          {ev.location && <span className="truncate">{ev.location}</span>}
                          {st && st.total > 0 && (
                            <span>
                              {toward}{max != null ? `/${max}` : ""} drop-ins
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {st && st.total > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDropInDialog(ev)}
                            className="text-gray-400 hover:text-white hover:bg-[#1e3a5f]"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(ev)}
                          className="text-gray-400 hover:text-white hover:bg-[#1e3a5f]"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(String(ev.id))}
                          className="text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDialogOpen(false)} />
          <div className="relative w-full sm:max-w-lg mx-auto bg-[#0F1E32] rounded-t-2xl sm:rounded-2xl border border-[#1e3a5f] max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0F1E32] border-b border-[#1e3a5f] p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "Edit Event" : "Add Event"}
              </h2>
              <button onClick={() => setDialogOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-gray-300">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Blue Practice"
                  className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white placeholder:text-gray-500"
                />
              </div>

              {/* Category */}
              <div>
                <Label className="text-gray-300">Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as EventCategory }))}
                >
                  <SelectTrigger className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F1E32] border-[#1e3a5f]">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="text-gray-300 focus:bg-[#1e3a5f] focus:text-white">
                        {eventCategories[c].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startDate" className="text-gray-300">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-gray-300">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startTime" className="text-gray-300">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="endTime" className="text-gray-300">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location" className="text-gray-300">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Cary Wrestling Center"
                  className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white placeholder:text-gray-500"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-gray-300">Description</Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white placeholder:text-gray-500"
                />
              </div>

              {/* Advanced Options Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <span>Advanced Options</span>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-2 border-t border-[#1e3a5f]">
                  <div>
                    <Label htmlFor="coach" className="text-gray-300">Coach</Label>
                    <Input
                      id="coach"
                      value={form.coach}
                      onChange={(e) => setForm((f) => ({ ...f, coach: e.target.value }))}
                      className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="maxDropIns" className="text-gray-300">Max Drop-ins</Label>
                      <Input
                        id="maxDropIns"
                        type="number"
                        min={1}
                        value={form.maxDropIns}
                        onChange={(e) => setForm((f) => ({ ...f, maxDropIns: e.target.value }))}
                        className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="entryFee" className="text-gray-300">Entry Fee ($)</Label>
                      <Input
                        id="entryFee"
                        type="number"
                        step="0.01"
                        value={form.entryFee}
                        onChange={(e) => setForm((f) => ({ ...f, entryFee: e.target.value }))}
                        className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="externalLink" className="text-gray-300">External Link</Label>
                    <Input
                      id="externalLink"
                      value={form.externalLink}
                      onChange={(e) => setForm((f) => ({ ...f, externalLink: e.target.value }))}
                      placeholder="https://..."
                      className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rsvp"
                      checked={form.rsvpRequired}
                      onCheckedChange={(c) => setForm((f) => ({ ...f, rsvpRequired: c === true }))}
                      className="border-[#1e3a5f] data-[state=checked]:bg-[#D3B574] data-[state=checked]:border-[#D3B574]"
                    />
                    <Label htmlFor="rsvp" className="text-gray-400 font-normal">RSVP required</Label>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-[#0F1E32] border-t border-[#1e3a5f] p-4 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1 border-[#1e3a5f] text-gray-300 hover:text-white hover:bg-[#1e3a5f]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-semibold"
              >
                {saving ? "Saving..." : "Save Event"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Drop-in Dialog */}
      {dropInDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDropInDialogOpen(false)} />
          <div className="relative w-full sm:max-w-2xl mx-auto bg-[#0F1E32] rounded-t-2xl sm:rounded-2xl border border-[#1e3a5f] max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0F1E32] border-b border-[#1e3a5f] p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Drop-in Requests</h2>
                {dropInDialogEvent && (
                  <p className="text-sm text-gray-400">
                    {dropInDialogEvent.title} - {dropInDialogEvent.start_date?.slice(0, 10)}
                  </p>
                )}
              </div>
              <button onClick={() => setDropInDialogOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              {dropInLoading ? (
                <div className="py-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#D3B574] mx-auto" />
                </div>
              ) : dropInRows.length === 0 ? (
                <p className="py-8 text-center text-gray-500">No drop-in requests for this event.</p>
              ) : (
                <div className="space-y-3">
                  {dropInRows.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg bg-[#0A1628] border border-[#1e3a5f]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">
                            {r.wrestler_name}
                            {r.wrestler_dob ? (
                              <span className="text-gray-500"> · DOB {r.wrestler_dob}</span>
                            ) : r.wrestler_age != null ? (
                              <span className="text-gray-500"> ({r.wrestler_age})</span>
                            ) : null}
                          </p>
                          <p className="text-sm text-gray-400">
                            {r.parent_name} - {r.parent_email}
                            {r.wrestler_cell ? ` · ${r.wrestler_cell}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.payment_status === "paid" 
                              ? "bg-green-900/50 text-green-400" 
                              : "bg-amber-900/50 text-amber-400"
                          }`}>
                            {r.payment_status}
                          </span>
                          {r.payment_amount_cents != null && (
                            <p className="text-sm text-gray-400 mt-1">
                              ${(r.payment_amount_cents / 100).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-[#0F1E32] border-t border-[#1e3a5f] p-4">
              <Button
                variant="outline"
                onClick={() => setDropInDialogOpen(false)}
                className="w-full border-[#1e3a5f] text-gray-300 hover:text-white hover:bg-[#1e3a5f]"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
