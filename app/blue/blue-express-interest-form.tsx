"use client"

import { useState, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { formatPhoneInput, normalizePhoneForStorage } from "@/lib/phone-format"

const ACHIEVEMENT_OPTIONS = [
  { value: "all_american", label: "All American" },
  { value: "state_champion", label: "State Champion" },
  { value: "state_placer", label: "State Placer" },
  { value: "state_qualifier", label: "State Qualifier" },
  { value: "na", label: "N/A" },
] as const

const GRADUATION_YEARS = ["2026", "2027", "2028", "2029", "2030"]

const WEIGHT_CLASSES = ["106", "113", "120", "126", "132", "138", "145", "152", "160", "170", "182", "195", "220", "285"]

export function BlueExpressInterestForm() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [cell, setCell] = useState("")
  const [graduationYear, setGraduationYear] = useState("")
  const [highestAchievement, setHighestAchievement] = useState("")
  const [weightClass, setWeightClass] = useState("none")
  const [highSchool, setHighSchool] = useState("")
  const [club, setClub] = useState("")
  const [comments, setComments] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    setStatus("idle")

    if (!firstName.trim()) {
      setErrorMessage("First name is required")
      return
    }
    if (!lastName.trim()) {
      setErrorMessage("Last name is required")
      return
    }
    if (!cell.trim()) {
      setErrorMessage("Cell phone is required")
      return
    }
    if (!graduationYear) {
      setErrorMessage("Graduation year is required")
      return
    }
    if (!highestAchievement) {
      setErrorMessage("Highest level achievement is required")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/blue/express-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          cell: normalizePhoneForStorage(cell.trim()),
          graduationYear,
          highestAchievement,
          weightClass: weightClass && weightClass !== "none" ? weightClass : undefined,
          highSchool: highSchool.trim() || undefined,
          club: club.trim() || undefined,
          comments: comments.trim() || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setErrorMessage(data.error || "Something went wrong. Please try again.")
        return
      }
      setStatus("success")
      setFirstName("")
      setLastName("")
      setCell("")
      setGraduationYear("")
      setHighestAchievement("")
      setWeightClass("none")
      setHighSchool("")
      setClub("")
      setComments("")
    } catch {
      setStatus("error")
      setErrorMessage("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border-2 border-[#D3B574]/50 bg-[#03154C]/5 p-6 text-center">
        <p className="font-medium text-[#03154C]">Thanks for expressing interest.</p>
        <p className="mt-1 text-sm text-[#03154C]/80">
          We will review your submission and reach out to those who fit the program.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="blue-first-name" className="text-[#03154C]">
            First name
          </Label>
          <Input
            id="blue-first-name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="border-[#03154C]/30 bg-white"
            placeholder="First name"
            disabled={isSubmitting}
            autoComplete="given-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="blue-last-name" className="text-[#03154C]">
            Last name
          </Label>
          <Input
            id="blue-last-name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="border-[#03154C]/30 bg-white"
            placeholder="Last name"
            disabled={isSubmitting}
            autoComplete="family-name"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="blue-cell" className="text-[#03154C]">
          Cell
        </Label>
        <Input
          id="blue-cell"
          type="tel"
          value={cell}
          onChange={(e) => setCell(formatPhoneInput(e.target.value))}
          className="border-[#03154C]/30 bg-white"
          placeholder="(555) 123-4567"
          disabled={isSubmitting}
          autoComplete="tel"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="blue-high-school" className="text-[#03154C]">
            High school
          </Label>
          <Input
            id="blue-high-school"
            type="text"
            value={highSchool}
            onChange={(e) => setHighSchool(e.target.value)}
            className="border-[#03154C]/30 bg-white"
            placeholder="High school"
            disabled={isSubmitting}
            autoComplete="organization"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="blue-club" className="text-[#03154C]">
            Club
          </Label>
          <Input
            id="blue-club"
            type="text"
            value={club}
            onChange={(e) => setClub(e.target.value)}
            className="border-[#03154C]/30 bg-white"
            placeholder="Club (optional)"
            disabled={isSubmitting}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="blue-graduation-year" className="text-[#03154C]">
            Graduation year
          </Label>
          <Select value={graduationYear} onValueChange={setGraduationYear} disabled={isSubmitting}>
            <SelectTrigger id="blue-graduation-year" className="border-[#03154C]/30 bg-white">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {GRADUATION_YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="blue-achievement" className="text-[#03154C]">
            Highest level achievement
          </Label>
          <Select value={highestAchievement} onValueChange={setHighestAchievement} disabled={isSubmitting}>
            <SelectTrigger id="blue-achievement" className="border-[#03154C]/30 bg-white">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ACHIEVEMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="blue-weight-class" className="text-[#03154C]">
            Weight class (optional)
          </Label>
          <Select value={weightClass} onValueChange={setWeightClass} disabled={isSubmitting}>
            <SelectTrigger id="blue-weight-class" className="border-[#03154C]/30 bg-white">
              <SelectValue placeholder="Select lbs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {WEIGHT_CLASSES.map((w) => (
                <SelectItem key={w} value={w}>
                  {w} lbs
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="blue-comments" className="text-[#03154C]">
          Anything else you’d like us to know? (optional)
        </Label>
        <Textarea
          id="blue-comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="min-h-[100px] border-[#03154C]/30 bg-white"
          placeholder="Freeform — goals, questions, etc."
          disabled={isSubmitting}
          rows={4}
        />
      </div>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-[#03154C] hover:bg-[#0a2571]"
      >
        {isSubmitting ? "Submitting…" : "Express interest"}
      </Button>
    </form>
  )
}
