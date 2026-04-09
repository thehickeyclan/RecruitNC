"use client"

import type React from "react"
import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface DropInFormProps {
  eventId: string
  eventTitle: string
  onClose: () => void
}

const brand = {
  navy: "#002147",
  red: "#B31B1B",
  gold: "#CBAF5D",
}

export function DropInForm({ eventId, eventTitle, onClose }: DropInFormProps) {
  const [formData, setFormData] = useState({
    wrestlerName: "",
    wrestlerAge: "",
    wrestlerWeight: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    experienceLevel: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capacityError, setCapacityError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    setError(null)
    setCapacityError(null)

    try {
      const response = await fetch("/api/calendar/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          wrestlerName: formData.wrestlerName.trim(),
          wrestlerAge: Number.parseInt(formData.wrestlerAge, 10),
          wrestlerWeight: formData.wrestlerWeight.trim() || undefined,
          parentName: formData.parentName.trim(),
          parentEmail: formData.parentEmail.trim(),
          parentPhone: formData.parentPhone.trim() || undefined,
          experienceLevel: formData.experienceLevel.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setCapacityError(
            data?.error ||
              "This practice has reached its drop-in capacity. Please select another session or contact the coaching staff.",
          )
        } else {
          setError(data?.error || "Unable to start checkout. Please try again.")
        }
        return
      }

      const { sessionId } = data
      const { checkoutUrl } = data

      if (checkoutUrl) {
        window.location.assign(checkoutUrl)
        return
      }

      if (sessionId) {
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        if (!publishableKey) {
          throw new Error("Stripe publishable key missing. Please contact support.")
        }

        const stripe = await loadStripe(publishableKey)
        if (!stripe) {
          throw new Error("Unable to initialize Stripe. Please try again later.")
        }

        const { error: stripeError } = await stripe.checkout.sessions.redirectToCheckout({ sessionId })
        if (stripeError) {
          console.error("Stripe redirect error:", stripeError)
          setError(stripeError.message ?? "Unable to redirect to Stripe Checkout.")
        }
        return
      }

      throw new Error("Checkout session created without redirect information.")
    } catch (err) {
      console.error("Error preparing Stripe checkout:", err)
      setError(err instanceof Error ? err.message : "Unexpected error starting checkout.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
          <div
            className="rounded-xl p-6 text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${brand.navy}, ${brand.red})`,
            }}
          >
            <p className="text-sm uppercase tracking-wider font-semibold" style={{ color: brand.gold }}>
              NC United Drop-In
            </p>
            <h2 className="text-2xl font-bold mt-2">{eventTitle}</h2>
            <p className="text-sm mt-3 text-white/80">
              Secure your wrestler&apos;s spot instantly. Drop-ins are limited to ten athletes per practice.
            </p>
          </div>

          {capacityError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
              {capacityError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 pb-4">
            <section className="space-y-4">
              <header className="space-y-1">
                <h3 className="font-semibold text-lg" style={{ color: brand.navy }}>
                  Wrestler Information
                </h3>
                <p className="text-sm text-gray-500">
                  We use this information to confirm eligibility and communicate with coaching staff.
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wrestlerName">Wrestler Name *</Label>
                  <Input
                    id="wrestlerName"
                    value={formData.wrestlerName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, wrestlerName: e.target.value }))}
                    placeholder="First and last name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wrestlerAge">Age *</Label>
                  <Input
                    id="wrestlerAge"
                    type="number"
                    min="5"
                    max="18"
                    value={formData.wrestlerAge}
                    onChange={(e) => setFormData((prev) => ({ ...prev, wrestlerAge: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wrestlerWeight">Weight (lbs)</Label>
                  <Input
                    id="wrestlerWeight"
                    value={formData.wrestlerWeight}
                    onChange={(e) => setFormData((prev) => ({ ...prev, wrestlerWeight: e.target.value }))}
                    placeholder="e.g., 125"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  <Input
                    id="experienceLevel"
                    value={formData.experienceLevel}
                    onChange={(e) => setFormData((prev) => ({ ...prev, experienceLevel: e.target.value }))}
                    placeholder="Novice, Advanced, State Qualifier..."
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <header className="space-y-1">
                <h3 className="font-semibold text-lg" style={{ color: brand.navy }}>
                  Parent / Guardian Contact
                </h3>
                <p className="text-sm text-gray-500">We send payment receipts and practice updates to this contact.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parentName">Parent / Guardian Name *</Label>
                  <Input
                    id="parentName"
                    value={formData.parentName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, parentName: e.target.value }))}
                    placeholder="Full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentEmail">Email *</Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, parentEmail: e.target.value }))}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentPhone">Phone Number</Label>
                  <Input
                    id="parentPhone"
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, parentPhone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Please share training focus, medical notes, or travel details."
                rows={3}
              />
            </section>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
            )}

            <div
              className={cn(
                "flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 pt-4 mt-2 border-t border-gray-200",
              )}
            >
              <p className="text-sm text-gray-500">
                You&apos;ll be redirected to Stripe to complete the secure $25 drop-in payment.
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="border-none text-white"
                  style={{
                    background: `linear-gradient(135deg, ${brand.navy}, ${brand.red})`,
                  }}
                >
                  {isSubmitting ? "Starting Checkout..." : "Continue to Payment"}
                </Button>
              </div>
            </div>
          </form>
    </div>
  )
}
