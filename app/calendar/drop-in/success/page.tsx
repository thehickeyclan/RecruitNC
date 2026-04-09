"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Calendar, Clock, MapPin } from "lucide-react"
import { HardLink } from "@/components/hard-link"

export const dynamic = "force-dynamic"

const brand = {
  navy: "#002147",
  red: "#B31B1B",
  gold: "#CBAF5D",
}

interface EventDetails {
  wrestlerName: string
  eventTitle: string
  eventDate: string
  eventTime?: string
  eventEndTime?: string
  eventLocation?: string
  paymentStatus: string
}

function DropInSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams?.get("session_id") || null
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      return
    }

    const fetchEventDetails = async () => {
      try {
        const response = await fetch(`/api/calendar/drop-in/success?session_id=${encodeURIComponent(sessionId)}`)
        if (!response.ok) {
          throw new Error("Failed to fetch event details")
        }
        const data = await response.json()
        setEventDetails(data.dropInRequest)
      } catch (err) {
        console.error("Error fetching event details:", err)
        setError("Unable to load event details")
      } finally {
        setLoading(false)
      }
    }

    fetchEventDetails()
  }, [sessionId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return null
    const [hours, minutes] = timeString.split(":")
    const hour = Number.parseInt(hours, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="mx-auto max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div
          className="px-8 py-6"
          style={{
            background: `linear-gradient(135deg, ${brand.navy}, ${brand.red})`,
          }}
        >
          <p className="text-sm text-white/80 uppercase tracking-wider">NC United Drop-In</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Payment Confirmed</h1>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
            <p className="font-semibold text-emerald-900">Your drop-in spot is secured.</p>
            <p className="text-sm mt-1">
              Thank you for supporting NC United Wrestling. A confirmation email with practice details has been sent to
              your inbox.
            </p>
          </div>

          {loading && <div className="text-center py-8 text-slate-500">Loading event details...</div>}

          {error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm">{error}</div>
          )}

          {eventDetails && (
            <div className="space-y-4">
              <div className="border-t border-b border-slate-200 py-4">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">{eventDetails.eventTitle}</h2>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Date</p>
                      <p className="text-slate-900">{formatDate(eventDetails.eventDate)}</p>
                    </div>
                  </div>

                  {eventDetails.eventTime && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-slate-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Time</p>
                        <p className="text-slate-900">
                          {formatTime(eventDetails.eventTime)}
                          {eventDetails.eventEndTime && ` - ${formatTime(eventDetails.eventEndTime)}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {eventDetails.eventLocation && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-slate-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Location</p>
                        <p className="text-slate-900">{eventDetails.eventLocation}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {sessionId && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 text-center">
              Stripe reference: <span className="font-mono text-slate-600">{sessionId}</span>
            </div>
          )}

          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Looking for more training opportunities? Explore the NC United calendar to lock in additional practices,
              camps, or travel events.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center pt-3 border-t border-slate-200">
            <HardLink
              href="/calendar"
              className="inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-semibold text-white shadow-sm"
              style={{ background: brand.navy }}
            >
              Return to calendar
            </HardLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DropInSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
          <div className="mx-auto max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 py-6 text-center">
              <p className="text-slate-500">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <DropInSuccessContent />
    </Suspense>
  )
}
