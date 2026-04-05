"use client"

import { useState, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, Loader2, ExternalLink, Calendar, MapPin, Users } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import {
  interestFormWeightClassUnion,
  formatNationalTeamWeightLabel,
  NHSCA_INTEREST_WEIGHT_CLASSES,
  AAU_SCHOLASTIC_WEIGHT_CLASSES,
} from "@/lib/national-team-weight-classes"

const INTEREST_FORM_WEIGHT_CLASSES = interestFormWeightClassUnion()
const GRADUATION_YEARS = ["2026", "2027", "2028", "2029"]

interface FormData {
  firstName: string
  lastName: string
  email: string
  cellPhone: string
  highSchool: string
  clubTeam: string
  graduationYear: string
  primaryWeight: string
  secondaryWeight: string
  previousTeams: string[]
  tournamentInterest: string[]
  comments: string
}

export default function NationalTeamInterestForm() {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    cellPhone: "",
    highSchool: "",
    clubTeam: "",
    graduationYear: "",
    primaryWeight: "",
    secondaryWeight: "",
    previousTeams: [],
    tournamentInterest: [],
    comments: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }
    if (!formData.cellPhone.trim()) newErrors.cellPhone = "Cell phone is required"
    if (!formData.highSchool.trim()) newErrors.highSchool = "High school is required"
    if (!formData.clubTeam.trim()) newErrors.clubTeam = "Club team is required (enter 'N/A' if not applicable)"
    if (!formData.graduationYear) newErrors.graduationYear = "Graduation year is required"
    if (!formData.primaryWeight) newErrors.primaryWeight = "Primary weight class is required"
    if (formData.secondaryWeight && formData.secondaryWeight === formData.primaryWeight) {
      newErrors.secondaryWeight = "Secondary weight cannot be the same as primary weight"
    }
    if (formData.tournamentInterest.length === 0) {
      newErrors.tournamentInterest = "Please select at least one tournament of interest"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus("idle")

    try {
      const response = await fetch("/api/national-team/interest-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to submit form")
      }

      setSubmitStatus("success")
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        cellPhone: "",
        highSchool: "",
        clubTeam: "",
        graduationYear: "",
        primaryWeight: "",
        secondaryWeight: "",
        previousTeams: [],
        tournamentInterest: [],
        comments: "",
      })
    } catch (error) {
      console.error("Error submitting form:", error)
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCheckboxChange = (field: "previousTeams" | "tournamentInterest", value: string) => {
    setFormData((prev) => {
      const current = prev[field]
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
      return { ...prev, [field]: updated }
    })
    // Clear error when user makes a selection
    if (field === "tournamentInterest") {
      setErrors((prev) => ({ ...prev, tournamentInterest: "" }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative text-white py-16 md:py-24 bg-gradient-to-br from-[#002147] via-[#003366] to-[#002147]">
        <div className="absolute inset-0 bg-[url('/images/wrestling-mat-texture.jpg')] opacity-10 bg-cover bg-center"></div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-4 bg-[#B31B1B] hover:bg-[#B31B1B] text-white border-0 text-sm md:text-base px-4 py-2">
              High School Boys | Grades 9-12
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 leading-tight">
              NC United National Team
            </h1>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-blue-100">
              Spring/Summer 2026
            </h2>
            <p className="text-lg md:text-xl lg:text-2xl mb-8 text-blue-100 font-light max-w-3xl mx-auto">
              Express your interest in representing North Carolina at elite national competitions
            </p>
          </div>
        </div>
      </section>

      {/* Tournament Cards Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto">
            {/* NHSCA National Duals Card */}
            <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-br from-[#002147] to-[#003366] text-white">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-[#B31B1B] text-white">May 23-25, 2026</Badge>
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white rounded p-2 flex-shrink-0 w-[60px] h-[60px] flex items-center justify-center">
                    <Image
                      src="/images/nhsca-logo.png"
                      alt="NHSCA Logo"
                      width={60}
                      height={60}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <CardTitle className="text-xl md:text-2xl font-bold">NHSCA National Duals</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPin className="w-5 h-5 text-[#B31B1B] flex-shrink-0 mt-0.5" />
                    <p className="text-sm md:text-base">Virginia Beach Sports Center, VA</p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm font-semibold text-[#002147] mb-2">Weight Classes:</p>
                    <p className="text-xs md:text-sm text-gray-600">
                      {NHSCA_INTEREST_WEIGHT_CLASSES.join(", ")}
                    </p>
                    <p className="text-xs md:text-sm text-gray-600 mt-1 font-semibold">
                      Weight Allowance: +3 lbs (e.g., 132 certified = can weigh up to 135)
                    </p>
                    <Link
                      href="https://nhsca-events.com/national-duals/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#002147] hover:text-[#B31B1B] transition-colors mt-3"
                    >
                      Learn More <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AAU Scholastic Duals Card */}
            <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-br from-[#B31B1B] to-[#9a1616] text-white">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-white text-[#B31B1B]">June 24-26, 2026</Badge>
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white rounded p-2 flex-shrink-0 w-[60px] h-[60px] flex items-center justify-center">
                    <Image
                      src="https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/RvVmX1xykzrPFQWr6nfUZ-AAU.jpeg"
                      alt="AAU Logo"
                      width={60}
                      height={60}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <CardTitle className="text-xl md:text-2xl font-bold">AAU Scholastic Duals</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPin className="w-5 h-5 text-[#B31B1B] flex-shrink-0 mt-0.5" />
                    <p className="text-sm md:text-base">Broward County Convention Center, Fort Lauderdale, FL</p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm font-semibold text-[#002147] mb-2">Weight Classes:</p>
                    <p className="text-xs md:text-sm text-gray-600">
                      {AAU_SCHOLASTIC_WEIGHT_CLASSES.map((w) => (w === "285" ? "HWT (285)" : w)).join(", ")}
                    </p>
                    <div className="text-xs md:text-sm text-gray-600 mt-2 space-y-1">
                      <p className="font-semibold">Weight Allowance: +5 lbs</p>
                      <p className="text-xs">• No athlete may wrestle below his current High School Certification weight</p>
                      <p className="text-xs">• Athletes may only wrestle one weight class above the class they weighed in at</p>
                    </div>
                    <Link
                      href="https://aausports.org/wrestling/scholastic-duals"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#002147] hover:text-[#B31B1B] transition-colors mt-3"
                    >
                      Learn More <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deep South Duals Card */}
            <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-br from-[#CBAF5D] to-[#b89d4a] text-[#002147]">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-[#002147] text-white">TBA</Badge>
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white rounded p-2 flex-shrink-0">
                    <div className="w-[60px] h-[60px] flex items-center justify-center text-[#002147] font-bold text-xs">
                      DSD
                    </div>
                  </div>
                  <CardTitle className="text-xl md:text-2xl font-bold">Deep South Duals</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPin className="w-5 h-5 text-[#CBAF5D] flex-shrink-0 mt-0.5" />
                    <p className="text-sm md:text-base">Location TBA</p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600 italic">Information coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Interest Form Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-[#002147] shadow-xl">
              <CardHeader className="bg-gradient-to-br from-[#002147] to-[#003366] text-white">
                <CardTitle className="text-2xl md:text-3xl font-bold">Athlete Interest Form - High School Boys</CardTitle>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                {submitStatus === "success" ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-[#002147] mb-3">Thank You!</h3>
                    <p className="text-lg text-gray-700 mb-2">
                      Thank you for your interest! Our coaching staff will review your submission and contact you soon.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                    {/* Contact Information */}
                    <div>
                      <h3 className="text-xl font-bold text-[#002147] mb-4 pb-2 border-b-2 border-gray-200">
                        Contact Information
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName" className="text-gray-700 font-semibold">
                            First Name <span className="text-[#B31B1B]">*</span>
                          </Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => {
                              setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                              setErrors((prev) => ({ ...prev, firstName: "" }))
                            }}
                            className={`mt-1 ${errors.firstName ? "border-[#B31B1B]" : ""}`}
                            required
                          />
                          {errors.firstName && <p className="text-sm text-[#B31B1B] mt-1">{errors.firstName}</p>}
                        </div>
                        <div>
                          <Label htmlFor="lastName" className="text-gray-700 font-semibold">
                            Last Name <span className="text-[#B31B1B]">*</span>
                          </Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => {
                              setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                              setErrors((prev) => ({ ...prev, lastName: "" }))
                            }}
                            className={`mt-1 ${errors.lastName ? "border-[#B31B1B]" : ""}`}
                            required
                          />
                          {errors.lastName && <p className="text-sm text-[#B31B1B] mt-1">{errors.lastName}</p>}
                        </div>
                        <div>
                          <Label htmlFor="email" className="text-gray-700 font-semibold">
                            Email <span className="text-[#B31B1B]">*</span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => {
                              setFormData((prev) => ({ ...prev, email: e.target.value }))
                              setErrors((prev) => ({ ...prev, email: "" }))
                            }}
                            className={`mt-1 ${errors.email ? "border-[#B31B1B]" : ""}`}
                            required
                          />
                          {errors.email && <p className="text-sm text-[#B31B1B] mt-1">{errors.email}</p>}
                        </div>
                        <div>
                          <Label htmlFor="cellPhone" className="text-gray-700 font-semibold">
                            Cell Phone <span className="text-[#B31B1B]">*</span>
                          </Label>
                          <Input
                            id="cellPhone"
                            type="tel"
                            value={formData.cellPhone}
                            onChange={(e) => {
                              setFormData((prev) => ({ ...prev, cellPhone: e.target.value }))
                              setErrors((prev) => ({ ...prev, cellPhone: "" }))
                            }}
                            className={`mt-1 ${errors.cellPhone ? "border-[#B31B1B]" : ""}`}
                            placeholder="(555) 123-4567"
                            required
                          />
                          {errors.cellPhone && <p className="text-sm text-[#B31B1B] mt-1">{errors.cellPhone}</p>}
                        </div>
                      </div>
                    </div>

                    {/* School & Club Information */}
                    <div>
                      <h3 className="text-xl font-bold text-[#002147] mb-4 pb-2 border-b-2 border-gray-200">
                        School & Club Information
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="highSchool" className="text-gray-700 font-semibold">
                            High School <span className="text-[#B31B1B]">*</span>
                          </Label>
                          <Input
                            id="highSchool"
                            value={formData.highSchool}
                            onChange={(e) => {
                              setFormData((prev) => ({ ...prev, highSchool: e.target.value }))
                              setErrors((prev) => ({ ...prev, highSchool: "" }))
                            }}
                            className={`mt-1 ${errors.highSchool ? "border-[#B31B1B]" : ""}`}
                            required
                          />
                          {errors.highSchool && <p className="text-sm text-[#B31B1B] mt-1">{errors.highSchool}</p>}
                        </div>
                        <div>
                          <Label htmlFor="clubTeam" className="text-gray-700 font-semibold">
                            Club Team (if applicable) <span className="text-[#B31B1B]">*</span>
                          </Label>
                          <Input
                            id="clubTeam"
                            value={formData.clubTeam}
                            onChange={(e) => {
                              setFormData((prev) => ({ ...prev, clubTeam: e.target.value }))
                              setErrors((prev) => ({ ...prev, clubTeam: "" }))
                            }}
                            className={`mt-1 ${errors.clubTeam ? "border-[#B31B1B]" : ""}`}
                            placeholder="Enter 'N/A' if not applicable"
                            required
                          />
                          {errors.clubTeam && <p className="text-sm text-[#B31B1B] mt-1">{errors.clubTeam}</p>}
                        </div>
                        <div>
                          <Label htmlFor="graduationYear" className="text-gray-700 font-semibold">
                            Graduation Year <span className="text-[#B31B1B]">*</span>
                          </Label>
                          <Select
                            value={formData.graduationYear}
                            onValueChange={(value) => {
                              setFormData((prev) => ({ ...prev, graduationYear: value }))
                              setErrors((prev) => ({ ...prev, graduationYear: "" }))
                            }}
                          >
                            <SelectTrigger className={`mt-1 ${errors.graduationYear ? "border-[#B31B1B]" : ""}`}>
                              <SelectValue placeholder="Select graduation year" />
                            </SelectTrigger>
                            <SelectContent>
                              {GRADUATION_YEARS.map((year) => (
                                <SelectItem key={year} value={year}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.graduationYear && (
                            <p className="text-sm text-[#B31B1B] mt-1">{errors.graduationYear}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Weight Classes */}
                    <div>
                      <h3 className="text-xl font-bold text-[#002147] mb-4 pb-2 border-b-2 border-gray-200">
                        Weight Classes
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="primaryWeight" className="text-gray-700 font-semibold">
                            Primary Weight Class <span className="text-[#B31B1B]">*</span>
                          </Label>
                          <Select
                            value={formData.primaryWeight}
                            onValueChange={(value) => {
                              setFormData((prev) => ({ ...prev, primaryWeight: value }))
                              setErrors((prev) => ({ ...prev, primaryWeight: "", secondaryWeight: "" }))
                            }}
                          >
                            <SelectTrigger className={`mt-1 ${errors.primaryWeight ? "border-[#B31B1B]" : ""}`}>
                              <SelectValue placeholder="Select primary weight class" />
                            </SelectTrigger>
                            <SelectContent>
                              {INTEREST_FORM_WEIGHT_CLASSES.map((weight) => (
                                <SelectItem key={weight} value={weight}>
                                  {formatNationalTeamWeightLabel(weight, "neutral")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.primaryWeight && (
                            <p className="text-sm text-[#B31B1B] mt-1">{errors.primaryWeight}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="secondaryWeight" className="text-gray-700 font-semibold">
                            Secondary Weight Class (optional)
                          </Label>
                          <Select
                            value={formData.secondaryWeight}
                            onValueChange={(value) => {
                              setFormData((prev) => ({
                                ...prev,
                                secondaryWeight: value === "none" ? "" : value,
                              }))
                              setErrors((prev) => ({ ...prev, secondaryWeight: "" }))
                            }}
                          >
                            <SelectTrigger className={`mt-1 ${errors.secondaryWeight ? "border-[#B31B1B]" : ""}`}>
                              <SelectValue placeholder="Select secondary weight class (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {INTEREST_FORM_WEIGHT_CLASSES.map((weight) => (
                                <SelectItem key={weight} value={weight}>
                                  {formatNationalTeamWeightLabel(weight, "neutral")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.secondaryWeight && (
                            <p className="text-sm text-[#B31B1B] mt-1">{errors.secondaryWeight}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Previous NC United Experience */}
                    <div>
                      <h3 className="text-xl font-bold text-[#002147] mb-4 pb-2 border-b-2 border-gray-200">
                        Previous NC United Experience
                      </h3>
                      <Label className="text-gray-700 font-semibold mb-3 block">
                        Previous NC United Teams (select all that apply)
                      </Label>
                      <div className="space-y-2">
                        {["UCD 2024", "NHSCA 2025", "UCD 2025"].map((team) => (
                          <div key={team} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`previous-${team}`}
                              checked={formData.previousTeams.includes(team)}
                              onChange={() => handleCheckboxChange("previousTeams", team)}
                              className="w-4 h-4 text-[#002147] border-gray-300 rounded focus:ring-[#002147]"
                            />
                            <Label htmlFor={`previous-${team}`} className="text-gray-700 cursor-pointer">
                              {team}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tournament Interest */}
                    <div>
                      <h3 className="text-xl font-bold text-[#002147] mb-4 pb-2 border-b-2 border-gray-200">
                        Tournament Interest
                      </h3>
                      <Label className="text-gray-700 font-semibold mb-3 block">
                        Select at least one tournament <span className="text-[#B31B1B]">*</span>
                      </Label>
                      <div className="space-y-2">
                        {[
                          { id: "nhsca", label: "NHSCA National Duals (May 23-25)" },
                          { id: "aau", label: "AAU Scholastic Duals - All-Star Boys (June 24-26)" },
                          { id: "deep-south", label: "Deep South Duals (Date TBA)" },
                        ].map((tournament) => (
                          <div key={tournament.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`tournament-${tournament.id}`}
                              checked={formData.tournamentInterest.includes(tournament.id)}
                              onChange={() => handleCheckboxChange("tournamentInterest", tournament.id)}
                              className="w-4 h-4 text-[#002147] border-gray-300 rounded focus:ring-[#002147]"
                            />
                            <Label htmlFor={`tournament-${tournament.id}`} className="text-gray-700 cursor-pointer">
                              {tournament.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {errors.tournamentInterest && (
                        <p className="text-sm text-[#B31B1B] mt-2">{errors.tournamentInterest}</p>
                      )}
                    </div>

                    {/* Additional Information */}
                    <div>
                      <h3 className="text-xl font-bold text-[#002147] mb-4 pb-2 border-b-2 border-gray-200">
                        Additional Information
                      </h3>
                      <div>
                        <Label htmlFor="comments" className="text-gray-700 font-semibold">
                          Additional Comments/Questions (optional)
                        </Label>
                        <Textarea
                          id="comments"
                          value={formData.comments}
                          onChange={(e) => setFormData((prev) => ({ ...prev, comments: e.target.value }))}
                          placeholder="Questions about the team, travel, costs, etc."
                          className="mt-1 min-h-[100px]"
                          rows={4}
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 border-t-2 border-gray-200">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#002147] hover:bg-[#003366] text-white font-bold text-lg py-6"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Interest"
                        )}
                      </Button>
                      {submitStatus === "error" && (
                        <p className="text-sm text-[#B31B1B] mt-2 text-center">
                          There was an error submitting your form. Please try again or{" "}
                          <a href="mailto:info@ncwrestlingunited.com" className="underline font-medium">
                            contact us at info@ncwrestlingunited.com
                          </a>
                          .
                        </p>
                      )}
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Important Information Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-[#002147] shadow-lg">
              <CardHeader className="bg-[#002147] text-white">
                <CardTitle className="text-2xl md:text-3xl font-bold">Important Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#002147] mb-3">Eligibility</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <span className="text-[#B31B1B] mr-2 font-bold">•</span>
                        <span>
                          Open to North Carolina high school wrestlers in grades 9-12 for the 2025-26 school year
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-[#B31B1B] mr-2 font-bold">•</span>
                        <span>NC United competes exclusively at elite/All-Star level divisions</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-[#002147] mb-3">Selection Process</h3>
                    <p className="text-gray-700 mb-2">
                      Coaching staff will evaluate submissions based on competitive record, achievements, current
                      performance, and previous participation on the national team.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-[#002147] mb-3">Estimated Costs (per tournament)</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <span className="text-[#B31B1B] mr-2 font-bold">•</span>
                        <span>
                          <strong>Registration Fee:</strong> ~$75 per athlete
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-[#B31B1B] mr-2 font-bold">•</span>
                        <span>
                          <strong>Gear Package:</strong> ~$150 (team singlet, warm-ups, bag)
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-[#B31B1B] mr-2 font-bold">•</span>
                        <span>
                          <strong>Travel:</strong> Variable based on location
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-[#B31B1B] mr-2 font-bold">•</span>
                        <span>
                          <strong>Hotel:</strong> Team hotel rates will be secured; all athletes are expected to stay at
                          the team hotel
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-[#002147] mb-3">Travel Coordination</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <span className="text-[#B31B1B] mr-2 font-bold">•</span>
                        <span>Transportation to and from tournaments can be coordinated with parents</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-[#B31B1B] mr-2 font-bold">•</span>
                        <span>Team travel arrangements can also be organized for interested families</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="py-8 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-700 mb-2">
            <strong>Questions?</strong> Contact us at{" "}
            <a href="mailto:info@ncwrestlingunited.com" className="text-[#002147] hover:text-[#B31B1B] font-semibold">
              info@ncwrestlingunited.com
            </a>
          </p>
          <p className="text-sm text-gray-600 italic">
            Submitting this form does not guarantee roster selection. Coaching staff will review all submissions and
            contact qualified athletes.
          </p>
        </div>
      </section>
    </div>
  )
}

