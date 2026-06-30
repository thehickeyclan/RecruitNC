"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { TOC_JACKET_SIZES, defaultTocWeightForAthlete } from "@/lib/toc/invitations"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import {
  formatTocRegistrationFee,
  registrationPaymentDueDisplay,
  tocConfirmRegistrationCheckboxLabel,
  tocConfirmRegistrationDisclosure,
} from "@/lib/toc/registration-policy"

type Props = {
  athleteId: string
  athleteWeightClass: string | number | null
  invitedWeightClass: number | null
  onSuccess: (weightClass: number) => void
}

export function ConfirmationForm({ athleteId, athleteWeightClass, invitedWeightClass, onSuccess }: Props) {
  const defaultWeight =
    invitedWeightClass ??
    defaultTocWeightForAthlete(athleteWeightClass)

  const [weightClass, setWeightClass] = useState(String(defaultWeight))
  const [jacketSize, setJacketSize] = useState<string>("")
  const [medicalNotes, setMedicalNotes] = useState("")
  const [attendance, setAttendance] = useState(false)
  const [weightAck, setWeightAck] = useState(false)
  const [usaw, setUsaw] = useState(false)
  const [photoRelease, setPhotoRelease] = useState(false)
  const [feeAck, setFeeAck] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!jacketSize) {
      setError("Select a champion jacket size.")
      return
    }
    if (!attendance || !weightAck || !usaw || !photoRelease || !feeAck) {
      setError("All acknowledgments are required.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/toc/athlete-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          weightClass: Number(weightClass),
          jacketSize,
          medicalNotes: medicalNotes.trim() || null,
          attendanceAcknowledgment: true,
          weightAcknowledgment: true,
          usawAcknowledgment: true,
          photoReleaseAccepted: true,
          registrationFeeAcknowledgment: true,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Confirmation failed")
      }
      onSuccess(Number(weightClass))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 border-t border-[#0B1D3A]/10 pt-8">
      <div>
        <h2 className="text-xl font-bold text-[#0B1D3A] uppercase tracking-wide">Confirm your spot</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Just a few tournament-specific details — we already have your profile. Confirm below to lock in your spot; payment can wait.
        </p>
      </div>

      <p className="text-sm text-[#0B1D3A]/85 leading-relaxed rounded-sm border border-[#0B1D3A]/10 bg-[#f8f9fb] px-4 py-3">
        {tocConfirmRegistrationDisclosure()}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="toc-weight">Weight class for this tournament</Label>
          <Select value={weightClass} onValueChange={setWeightClass}>
            <SelectTrigger id="toc-weight" className="h-11">
              <SelectValue placeholder="Select weight" />
            </SelectTrigger>
            <SelectContent>
              {TOC_WEIGHT_CLASSES.map((w) => (
                <SelectItem key={w} value={String(w)}>
                  {w} lbs
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="toc-jacket">Champion jacket fit (in case you take it home)</Label>
          <Select value={jacketSize} onValueChange={setJacketSize}>
            <SelectTrigger id="toc-jacket" className="h-11">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {TOC_JACKET_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="toc-medical">Allergies / medical notes (optional)</Label>
        <Textarea
          id="toc-medical"
          value={medicalNotes}
          onChange={(e) => setMedicalNotes(e.target.value)}
          placeholder="Anything our staff should know on event weekend"
          rows={3}
          maxLength={2000}
        />
      </div>

      <div className="space-y-4 rounded-sm border border-[#0B1D3A]/10 bg-[#f8f9fb] p-4">
        <AckCheckbox
          id="toc-attendance"
          checked={attendance}
          onCheckedChange={setAttendance}
          label="I commit to Friday weigh-in (4:00 PM) and Saturday competition."
        />
        <AckCheckbox
          id="toc-weight"
          checked={weightAck}
          onCheckedChange={setWeightAck}
          label="I understand there is no Saturday weight allowance — single weigh-in, college weights."
        />
        <AckCheckbox
          id="toc-usaw"
          checked={usaw}
          onCheckedChange={setUsaw}
          label="My USA Wrestling membership is current for 2026."
        />
        <AckCheckbox
          id="toc-photo"
          checked={photoRelease}
          onCheckedChange={setPhotoRelease}
          label="I grant NC United photo and video release for tournament coverage and promotion."
        />
        <AckCheckbox
          id="toc-fee"
          checked={feeAck}
          onCheckedChange={setFeeAck}
          label={tocConfirmRegistrationCheckboxLabel()}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <Button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto min-h-11 bg-[#CC0000] hover:bg-[#a80000] px-8 text-base font-semibold uppercase tracking-wide"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming…
            </>
          ) : (
            "Confirm my spot"
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        After you confirm, you can pay the {formatTocRegistrationFee()} registration fee anytime before{" "}
        {registrationPaymentDueDisplay()} — optional link on the next screen.
      </p>
    </form>
  )
}

function AckCheckbox({
  id,
  checked,
  onCheckedChange,
  label,
}: {
  id: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} className="mt-0.5" />
      <Label htmlFor={id} className="text-sm leading-relaxed font-normal cursor-pointer">
        {label}
      </Label>
    </div>
  )
}
