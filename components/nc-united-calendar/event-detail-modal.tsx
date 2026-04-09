"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { X, Calendar, MapPin, Clock, Users, ExternalLink } from 'lucide-react'
import type { CalendarEvent } from "@/lib/nc-united-calendar/types"
import { parseCivilDateFromDatabase } from "@/lib/nc-united-calendar/calendar-date"
import { EventShare } from "./event-share"
import { DropInForm } from "./drop-in-form"
import { formatTime } from "@/lib/nc-united-calendar/time-utils"
import type { DropInRequest } from "@/lib/nc-united-calendar/drop-in-types"
import { supabase } from "@/lib/supabase"

interface EventDetailModalProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
}

export function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  const [showDropInForm, setShowDropInForm] = useState(false)
  const [dropInRequests, setDropInRequests] = useState<DropInRequest[]>([])
  const [dropInLoading, setDropInLoading] = useState(false)

  useEffect(() => {
    if (event?.id && (event.category === "blue-practice" || event.category === "gold-practice")) {
      loadDropInRequests()
    }
  }, [event?.id])

  const loadDropInRequests = async () => {
    setDropInLoading(true)
    try {
      const { data } = await supabase
        .from("drop_in_requests")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false })

      setDropInRequests((data as DropInRequest[]) || [])
    } catch (error) {
      console.error("Error loading drop-in requests:", error)
      setDropInRequests([])
    } finally {
      setDropInLoading(false)
    }
  }

  if (!event) return null

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "tournament":
        return "bg-red-100 text-red-800 border-red-200"
      case "practice":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "camp":
        return "bg-green-100 text-green-800 border-green-200"
      case "meeting":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const formatEventDate = (value: Date | string) => {
    try {
      const date = value instanceof Date ? value : parseCivilDateFromDatabase(value)
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return String(value)
    }
  }

  const formatTimeRange = (startTime?: string, endTime?: string) => {
    if (!startTime && !endTime) return ""
    if (!endTime) return formatTime(startTime!)
    return `${formatTime(startTime!)} - ${formatTime(endTime!)}`
  }

  const capacity = event.maxDropIns ?? 10
  const activeDropIns = dropInRequests.filter((request) =>
    ["paid", "pending"].includes(request.payment_status ?? "unpaid"),
  )
  const paidDropIns = dropInRequests.filter((request) => request.payment_status === "paid")
  const remainingSlots = Math.max(capacity - activeDropIns.length, 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0 !translate-x-[-50%] !translate-y-[-50%]">
        <DialogTitle className="sr-only">Event details: {event.title}</DialogTitle>
        <DialogDescription className="sr-only">
          {formatEventDate(event.date)}
          {event.location ? ` · ${event.location}` : ""}
        </DialogDescription>
        {/* Header - Fixed */}
        <div className="relative flex-shrink-0" style={{ backgroundColor: "#002147" }}>
          <div className="flex justify-between items-start p-6">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              {event.logoUrl && (
                <img
                  src={event.logoUrl || "/placeholder.svg"}
                  alt={`${event.title} logo`}
                  className="w-24 h-24 object-contain"
                />
              )}
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">{event.title}</h2>
                <Badge className={`${getCategoryColor(event.category)} border`}>{event.category}</Badge>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              <EventShare event={event} />
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content - Scrollable with Mobile Touch Support */}
        <div
          className="flex-1 overflow-y-auto touch-pan-y overscroll-contain"
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
        >
          <div className="p-6 space-y-6">
            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-semibold">{formatEventDate(event.date)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-semibold">{event.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {(event.startTime || event.endTime) && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Time</p>
                        <p className="font-semibold">{formatTimeRange(event.startTime, event.endTime)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {event.externalLink && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <ExternalLink className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm text-gray-600">Registration</p>
                        <a
                          href={event.externalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-600 hover:text-blue-800 underline"
                        >
                          Register Now
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* Drop-in Requests Section */}
            {(event.category === "blue-practice" || event.category === "gold-practice") && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold">Drop-in Requests ({dropInRequests.length})</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-800">
                        {paidDropIns.length} paid • {capacity} capacity
                      </Badge>
                      <Badge className={remainingSlots > 0 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>
                        {remainingSlots > 0 ? `${remainingSlots} slots left` : "At capacity"}
                      </Badge>
                      <Button
                        onClick={() => setShowDropInForm(true)}
                        size="sm"
                        disabled={remainingSlots <= 0}
                        style={{
                          background: remainingSlots > 0 ? "#002147" : "#94a3b8",
                        }}
                        className="text-white"
                      >
                        {remainingSlots > 0 ? "Secure Drop-in" : "Join Waitlist"}
                      </Button>
                    </div>
                  </div>

                  {dropInRequests.length > 0 ? (
                    <div className="space-y-3">
                      {dropInRequests.map((request) => (
                        <Card key={request.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{request.wrestler_name}</p>
                                <p className="text-sm text-gray-600">
                                  Age: {request.wrestler_age}{" "}
                                  {request.wrestler_weight && `| Weight: ${request.wrestler_weight}`}
                                </p>
                                <p className="text-sm text-gray-600">Parent: {request.parent_name}</p>
                                <p className="text-sm text-gray-600">Email: {request.parent_email}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Paid amount: ${(request.payment_amount_cents ?? 0) / 100} • {request.payment_status}
                                </p>
                              </div>
                              <Badge className={`${getStatusColor(request.status)} border`}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-4">No drop-in requests yet.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Drop-in Form Modal */}
        {showDropInForm && (
          <Dialog open={showDropInForm} onOpenChange={setShowDropInForm}>
            <DialogContent className="!flex max-h-[min(90vh,900px)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 !translate-x-[-50%] !translate-y-[-50%] sm:max-w-2xl">
              <DialogTitle className="sr-only">NC United drop-in registration</DialogTitle>
              <DialogDescription className="sr-only">
                Enter wrestler and parent information to continue to Stripe checkout for this practice.
              </DialogDescription>
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y [scrollbar-gutter:stable]"
                style={{
                  WebkitOverflowScrolling: "touch",
                  touchAction: "pan-y",
                }}
              >
                <DropInForm
                  eventId={event.id}
                  eventTitle={event.title}
                  onClose={() => {
                    setShowDropInForm(false)
                    loadDropInRequests()
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
