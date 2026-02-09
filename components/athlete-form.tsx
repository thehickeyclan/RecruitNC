"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/image-upload"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Athlete } from "@/types/athlete"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
interface AthleteFormProps {
  onSubmit: (data: any) => Promise<any>
  initialData?: Partial<Athlete>
}

const HS_WEIGHT_CLASSES = {
  Male: [
    { value: "106", label: "106 lbs" },
    { value: "113", label: "113 lbs" },
    { value: "120", label: "120 lbs" },
    { value: "126", label: "126 lbs" },
    { value: "132", label: "132 lbs" },
    { value: "138", label: "138 lbs" },
    { value: "144", label: "144 lbs" },
    { value: "150", label: "150 lbs" },
    { value: "157", label: "157 lbs" },
    { value: "165", label: "165 lbs" },
    { value: "175", label: "175 lbs" },
    { value: "190", label: "190 lbs" },
    { value: "215", label: "215 lbs" },
    { value: "285", label: "285 lbs" },
  ],
  Female: [
    { value: "100", label: "100 lbs" },
    { value: "107", label: "107 lbs" },
    { value: "114", label: "114 lbs" },
    { value: "120", label: "120 lbs" },
    { value: "126", label: "126 lbs" },
    { value: "132", label: "132 lbs" },
    { value: "138", label: "138 lbs" },
    { value: "145", label: "145 lbs" },
    { value: "152", label: "152 lbs" },
    { value: "165", label: "165 lbs" },
    { value: "185", label: "185 lbs" },
    { value: "235", label: "235 lbs" },
  ],
}

const COLLEGE_WEIGHT_CLASSES = {
  Male: [
    { value: "125", label: "125 lbs" },
    { value: "133", label: "133 lbs" },
    { value: "141", label: "141 lbs" },
    { value: "149", label: "149 lbs" },
    { value: "157", label: "157 lbs" },
    { value: "165", label: "165 lbs" },
    { value: "174", label: "174 lbs" },
    { value: "184", label: "184 lbs" },
    { value: "197", label: "197 lbs" },
    { value: "285", label: "285 lbs" },
  ],
  Female: [
    { value: "103", label: "103 lbs" },
    { value: "110", label: "110 lbs" },
    { value: "117", label: "117 lbs" },
    { value: "124", label: "124 lbs" },
    { value: "131", label: "131 lbs" },
    { value: "138", label: "138 lbs" },
    { value: "145", label: "145 lbs" },
    { value: "160", label: "160 lbs" },
    { value: "180", label: "180 lbs" },
    { value: "207", label: "207 lbs" },
  ],
}

// Updated wrestling clubs list
const WRESTLING_CLUBS = [
  "Beastworks",
  "Believe 2 Achieve",
  "Believe to Achieve",
  "Braves",
  "Buies Creek", // Fixed spelling from "Buise Creek" to "Buies Creek"
  "Bull Sharks",
  "C2X",
  "Capital City",
  "Clash Wrestling",
  "Combat",
  "D1",
  "Darkhorse",
  "Devil Dogs",
  "Dogtown",
  "Dynamic Elite",
  "East Carolina Wrestling Academy",
  "Elite 252",
  "Fayettenam Brawlers",
  "Fear This",
  "Forge",
  "Freeco",
  "Grizzly",
  "Haywood Elite",
  "Iron Tide",
  "K-Vegas",
  "Lake Norman Wrestling Club",
  "Mooresville",
  "Mustang",
  "NC Pride",
  "None",
  "OBX Wrestling Factory",
  "Port City Pirates",
  "RAW",
  "Red Lynx",
  "Relentless",
  "School of Hard Knocks",
  "Sly Fox",
  "Spartan",
  "Tar River",
  "The Factory",
  "The Wrestling Academy",
  "Triangle Wrestling Academy",
  "Trinity Top Team",
  "Unaffiliated",
  "Wolfpack",
  "Wolverine Wrestling Club",
  "Wrestling Warehouse",
  "CLUB IS NOT LISTED",
]

const AthleteForm: React.FC<AthleteFormProps> = ({ onSubmit, initialData }) => {
  const [wrestlingClubs, setWrestlingClubs] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [showCustomClub, setShowCustomClub] = useState(false)
  const [formData, setFormData] = useState<AthleteFormData>({
    firstName: initialData?.firstName || initialData?.name?.split(" ")[0] || "",
    lastName: initialData?.lastName || initialData?.name?.split(" ").slice(1).join(" ") || "",
    gender: initialData?.gender || "",
    graduationYear: initialData?.graduationYear?.toString() || "",
    birthdate: initialData?.birthdate ? (initialData.birthdate.includes('T') ? initialData.birthdate.split('T')[0] : initialData.birthdate) : "",
    weightClass: initialData?.weightclass || "",
    collegeWeightClass: initialData?.college_weight_class || "",
    highSchool: initialData?.highschool || "",
    highSchoolLogoUrl: initialData?.highSchoolLogoUrl || "",

    // College info - only populate if not a prospect
    college: initialData?.is_prospect ? "" : initialData?.college || "",
    college_id: initialData?.college_id ?? "",
    commitmentDate: initialData?.is_prospect
      ? ""
      : initialData?.commitmentdate
        ? new Date(initialData.commitmentdate).toISOString().split("T")[0]
        : "",

    isProspect: initialData?.is_prospect ?? true, // Default to prospect

    // Additional fields
    customWrestlingClub: "",
    wrestlingClub: initialData?.wrestlingClub || initialData?.wrestling_club || "", // Added proper wrestling club field initialization
    photoUrl: initialData?.photoUrl || initialData?.photourl || "",
    commitmentPhotoUrl: initialData?.commitmentPhotoUrl || "",
    highlightVideoUrl: initialData?.highlight_video_url || "",
    achievements: Array.isArray(initialData?.achievements)
      ? initialData.achievements
          .map((a) => (typeof a === "string" ? a.replace(/^"/, "").replace(/"$/, "") : a))
          .join(", ")
      : [],
    additional_achievements: initialData?.additional_achievements || "",
    careerRecord: initialData?.careerRecord || "",
    stateRanking: initialData?.rankings?.state?.toString() || "",
    nationalRanking: initialData?.rankings?.national?.toString() || "",
    location: initialData?.location || "",
    bio: initialData?.bio || "",
    bio_headline: initialData?.bio_headline || "",
    twitterUrl: initialData?.socialMedia?.twitter || "",
    instagramUrl: initialData?.socialMedia?.instagram || "",
    facebookUrl: initialData?.socialMedia?.facebook || "",
    floProfileUrl: initialData?.flo_profile_url || "",
    trackWrestlingProfileUrl: initialData?.track_wrestling_profile_url || "",
    ncUnitedTeam: initialData?.ncUnitedTeam || "none",
    contactEmail: initialData?.contactEmail || "",
    phone: initialData?.phone || "",
    featured: initialData?.featured || false,
    recruiting_status: initialData?.recruiting_status || "Uncommitted",
    prospect_ranking: initialData?.prospect_ranking || null,
    prospect_notes: initialData?.prospect_notes || "",
    collegeLogoUrl: initialData?.collegeLogoUrl || "",
    academicGPA: initialData?.academic_gpa?.toString() || "",
    academicSAT: initialData?.academic_sat?.toString() || "",
    academicACT: initialData?.academic_act?.toString() || "",
    academicSummary: initialData?.academic_summary || "",
    academicInterest: initialData?.academic_interest || "",
    super_32_2024_record: initialData?.super_32_2024_record || "",
    super_32_2024_placement: initialData?.super_32_2024_placement || "",
    super_32_2025_record: initialData?.super_32_2025_record || "",
    super_32_2025_placement: initialData?.super_32_2025_placement || "",
    nationally_ranked_wins: initialData?.nationally_ranked_wins || "",
    college_opens_experience: initialData?.college_opens_experience || "",
    nhsca_2024_record: initialData?.nhsca_2024_record || "",
    nhsca_2024_placement: initialData?.nhsca_2024_placement || "",
    nhsca_2025_record: initialData?.nhsca_2025_record || "",
    nhsca_2025_placement: initialData?.nhsca_2025_placement || "",
    super_32_2023_record: initialData?.super_32_2023_record || "", // Added Super 32 2023 fields
    super_32_2023_placement: initialData?.super_32_2023_placement || "", // Added Super 32 2023 fields
    nhsca_2023_record: initialData?.nhsca_2023_record || "",
    nhsca_2023_placement: initialData?.nhsca_2023_placement || "",
    highSchoolDivision: initialData?.highSchoolDivision || "", // Added field
  })

  const [activeTab, setActiveTab] = useState("basic")
  const [renderError, setRenderError] = useState<string | null>(null)
  const [collegeList, setCollegeList] = useState<{ id: string; name: string }[]>([])

  const { toast } = useToast()

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await fetch("/api/admin/colleges", { cache: "no-store" })
        const data = await res.json()
        if (data.success && Array.isArray(data.colleges)) {
          const list = data.colleges.map((c: any) => ({ id: c.id, name: c.name }))
          setCollegeList(list)
          // If we have a college name but no college_id (e.g. legacy), try to match
          const currentCollege = initialData?.college?.trim()
          if (currentCollege && !initialData?.college_id && list.length) {
            const match = list.find((c) => c.name.trim().toLowerCase() === currentCollege.toLowerCase())
            if (match) {
              setFormData((prev) => ({ ...prev, college_id: match.id, college: match.name }))
            }
          }
        }
      } catch {
        // ignore
      }
    }
    fetchColleges()
  }, [initialData?.college, initialData?.college_id])

  useEffect(() => {
    const fetchWrestlingClubs = async () => {
      try {
        const response = await fetch("/api/logo-mappings/by-entity/club")
        if (response.ok) {
          const data = await response.json()
          const dbClubs = data.map((mapping: any) => mapping.entity_name)
          // Combine hardcoded clubs with database clubs and remove duplicates
          const allClubs = [...new Set([...WRESTLING_CLUBS, ...dbClubs])].sort()
          setWrestlingClubs(allClubs)
        } else {
          // Fallback to hardcoded list if API fails
          setWrestlingClubs(WRESTLING_CLUBS.sort())
        }
      } catch (error) {
        console.error("Failed to fetch wrestling clubs:", error)
        // Fallback to hardcoded list if fetch fails
        setWrestlingClubs(WRESTLING_CLUBS.sort())
      }
    }

    fetchWrestlingClubs()
  }, [])

  // Handle wrestling club selection
  useEffect(() => {
    if (formData.wrestlingClub === "CLUB IS NOT LISTED") {
      // Fixed to use wrestlingClub field instead of photoUrl
      setShowCustomClub(true)
    } else {
      setShowCustomClub(false)
      setFormData((prev) => ({ ...prev, customWrestlingClub: "" }))
    }
  }, [formData.wrestlingClub]) // Fixed dependency to use wrestlingClub field

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear validation error when field is changed
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSelectChange = (name: string, value: string) => {
    try {
      // Clear validation error when field is changed
      if (validationErrors[name]) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }

      // If changing gender, reset weight class to avoid invalid selections
      if (name === "gender" && formData.weightClass) {
        const currentWeightClass = formData.weightClass
        const newGenderWeightClasses = formData.isProspect
          ? HS_WEIGHT_CLASSES[value as keyof typeof HS_WEIGHT_CLASSES].map((wc) => wc.value)
          : COLLEGE_WEIGHT_CLASSES[value as keyof typeof COLLEGE_WEIGHT_CLASSES].map((wc) => wc.value)

        // Only reset if the current weight class isn't valid for the new gender
        if (!newGenderWeightClasses.includes(currentWeightClass)) {
          setFormData((prev) => ({ ...prev, [name]: value, weightClass: "" }))
          return
        }
      }

      setFormData((prev) => ({ ...prev, [name]: value }))
    } catch (error) {
      console.error("Error in handleSelectChange:", error)
      toast({
        title: "Error",
        description: `Error updating selection: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    }
  }

  const handleImageUpload = (url: string, type: "profile" | "commitment") => {
    if (type === "profile") {
      setFormData((prev) => ({ ...prev, photoUrl: url }))
    } else {
      setFormData((prev) => ({ ...prev, commitmentPhotoUrl: url }))
    }
  }

  const handleHighSchoolChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const schoolName = e.target.value
    handleChange(e)

    if (schoolName.trim()) {
      try {
        const response = await fetch("/api/lookup-school-division", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schoolName: schoolName.trim() }),
        })
        const { division } = await response.json()

        if (division) {
          setFormData((prev) => ({ ...prev, highSchoolLogoUrl: division, highSchoolDivision: division })) // Also set highSchoolDivision
        }
      } catch (error) {
        console.error("Failed to lookup school division:", error)
      }
    }
  }

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}

    // Basic required fields
    if (!formData.firstName.trim()) errors.firstName = "First name is required"
    if (!formData.lastName.trim()) errors.lastName = "Last name is required"
    if (!formData.gender) errors.gender = "Gender is required"
    if (!formData.graduationYear) errors.graduationYear = "Graduation year is required"
    if (!formData.highSchool.trim()) errors.highSchool = "High school is required"

    if (formData.recruiting_status === "Committed" || formData.recruiting_status === "College Athlete") {
      if (!formData.college.trim()) {
        errors.college = "College is required for committed athletes"
      }
      if (!formData.collegeWeightClass.trim()) {
        errors.collegeWeightClass = "College weight class is required for committed athletes"
      }
      if (!formData.commitmentDate.trim()) {
        errors.commitmentDate = "Commitment date is required for committed athletes"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setValidationErrors({})

    if (!validateForm()) {
      setIsSubmitting(false)
      return
    }

    try {
      const safeTrim = (value: any, existingValue?: any): string | null => {
        if (typeof value === "string") {
          const trimmed = value.trim()
          return trimmed || null
        }
        return value || null
      }

      const submissionData = {
        firstName: safeTrim(formData.firstName, initialData?.firstName),
        lastName: safeTrim(formData.lastName, initialData?.lastName),
        gender: safeTrim(formData.gender, initialData?.gender),
        birthdate: formData.birthdate || null,
        graduationYear: safeTrim(formData.graduationYear, initialData?.graduationYear),
        weightClass: safeTrim(formData.weightClass, initialData?.weightClass),
        college_weight_class: safeTrim(formData.collegeWeightClass, initialData?.college_weight_class),
        highSchool: safeTrim(formData.highSchool, initialData?.highSchool),
        highSchoolDivision: safeTrim(formData.highSchoolDivision, initialData?.highSchoolDivision),
        highSchoolLogoUrl: safeTrim(formData.highSchoolLogoUrl, initialData?.highSchoolLogoUrl),
        college: safeTrim(formData.college, initialData?.college),
        college_id: formData.college_id || null,
        commitmentDate: safeTrim(formData.commitmentDate, initialData?.commitmentDate),
        wrestlingClub: safeTrim(formData.wrestlingClub, initialData?.wrestlingClub),
        customWrestlingClub: safeTrim(formData.customWrestlingClub, initialData?.customWrestlingClub),
        photoUrl: safeTrim(formData.photoUrl, initialData?.photoUrl),
        commitmentPhotoUrl: safeTrim(formData.commitmentPhotoUrl, initialData?.commitmentPhotoUrl),
        highlightVideoUrl: safeTrim(formData.highlightVideoUrl, initialData?.highlightVideoUrl),
        achievements: Array.isArray(formData.achievements)
          ? formData.achievements.filter((a) => typeof a === "string" && a.trim() !== "")
          : [],
        additional_achievements: safeTrim(formData.additional_achievements, initialData?.additional_achievements),
        careerRecord: safeTrim(formData.careerRecord, initialData?.careerRecord),
        stateRanking: safeTrim(formData.stateRanking, initialData?.stateRanking),
        nationalRanking: safeTrim(formData.nationalRanking, initialData?.nationalRanking),
        location: safeTrim(formData.location, initialData?.location),
        bio: safeTrim(formData.bio, initialData?.bio),
        bio_headline: safeTrim(formData.bio_headline, initialData?.bio_headline),
        twitterUrl: safeTrim(formData.twitterUrl, initialData?.twitterUrl),
        instagramUrl: safeTrim(formData.instagramUrl, initialData?.instagramUrl),
        facebookUrl: safeTrim(formData.facebookUrl, initialData?.facebookUrl),
        floProfileUrl: safeTrim(formData.floProfileUrl, initialData?.flo_profile_url),
        trackWrestlingProfileUrl: safeTrim(formData.trackWrestlingProfileUrl, initialData?.track_wrestling_profile_url),
        ncUnitedTeam: safeTrim(formData.ncUnitedTeam, initialData?.ncUnitedTeam),
        contactEmail: safeTrim(formData.contactEmail, initialData?.contactEmail),
        phone: safeTrim(formData.phone, initialData?.phone),
        featured: formData.featured,
        recruiting_status: safeTrim(formData.recruiting_status, initialData?.recruiting_status),
        prospect_ranking: formData.prospect_ranking || null,
        prospect_notes: safeTrim(formData.prospect_notes, initialData?.prospect_notes),
        collegeLogoUrl: safeTrim(formData.collegeLogoUrl, initialData?.collegeLogoUrl),
        academicGPA: formData.academicGPA ? Number.parseFloat(formData.academicGPA) : initialData?.academic_gpa || null,
        academicSAT: formData.academicSAT ? Number.parseInt(formData.academicSAT) : initialData?.academicSAT || null,
        academicACT: formData.academicACT ? Number.parseInt(formData.academicACT) : initialData?.academicACT || null,
        academicSummary: safeTrim(formData.academicSummary, initialData?.academic_summary),
        academic_interest: safeTrim(formData.academicInterest, initialData?.academic_interest),
        super_32_2024_record: safeTrim(formData.super_32_2024_record, initialData?.super_32_2024_record),
        super_32_2024_placement: safeTrim(formData.super_32_2024_placement, initialData?.super_32_2024_placement),
        super_32_2025_record: safeTrim(formData.super_32_2025_record, initialData?.super_32_2025_record),
        super_32_2025_placement: safeTrim(formData.super_32_2025_placement, initialData?.super_32_2025_placement),
        nationally_ranked_wins: safeTrim(formData.nationally_ranked_wins, initialData?.nationally_ranked_wins),
        college_opens_experience: safeTrim(formData.college_opens_experience, initialData?.college_opens_experience),
        nhsca_2024_record: safeTrim(formData.nhsca_2024_record, initialData?.nhsca_2024_record),
        nhsca_2024_placement: safeTrim(formData.nhsca_2024_placement, initialData?.nhsca_2024_placement),
        nhsca_2025_record: safeTrim(formData.nhsca_2025_record, initialData?.nhsca_2025_record),
        nhsca_2025_placement: safeTrim(formData.nhsca_2025_placement, initialData?.nhsca_2025_placement),
        super_32_2023_record: safeTrim(formData.super_32_2023_record, initialData?.super_32_2023_record),
        super_32_2023_placement: safeTrim(formData.super_32_2023_placement, initialData?.super_32_2023_placement),
        nhsca_2023_record: safeTrim(formData.nhsca_2023_record, initialData?.nhsca_2023_record),
        nhsca_2023_placement: safeTrim(formData.nhsca_2023_placement, initialData?.nhsca_2023_placement),
      }

      console.log("[v0] Form submission - Division field:", {
        highSchoolDivision: submissionData.highSchoolDivision,
        highSchoolLogoUrl: submissionData.highSchoolLogoUrl,
      })

      const result = await onSubmit(submissionData)

      console.log("[v0] Form submission result:", result)

      if (typeof window !== "undefined") {
        window.location.reload()
      }

      toast({
        title: initialData?.id ? "Athlete updated" : "Athlete added",
        description: `${formData.firstName} ${formData.lastName} has been ${initialData?.id ? "updated" : "added"} successfully`,
      })
    } catch (error) {
      console.error("Form submission error:", error)
      toast({
        title: "Submission failed",
        description: "There was an error saving the athlete information",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleIsProspectChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isProspect: checked,
      college: checked ? "" : prev.college,
      college_id: checked ? "" : prev.college_id,
      commitmentDate: checked ? "" : prev.commitmentDate,
      commitmentPhotoUrl: checked ? "" : prev.commitmentPhotoUrl,
      collegeLogoUrl: checked ? "" : prev.collegeLogoUrl,
      recruiting_status: checked ? "Uncommitted" : "Committed",
    }))

    // Clear validation errors for college fields when switching to prospect
    if (checked) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.college
        delete newErrors.collegeWeightClass
        delete newErrors.commitmentDate
        return newErrors
      })
    }
  }

  // If there's a render error, show it
  if (renderError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{renderError}</AlertDescription>
      </Alert>
    )
  }

  const weightClassOptions =
    HS_WEIGHT_CLASSES[formData.gender as keyof typeof HS_WEIGHT_CLASSES] || HS_WEIGHT_CLASSES.Male

  return (
    <Card className="border-t-4 border-t-[#002147] shadow-md">
      <CardHeader className="bg-gradient-to-r from-[#002147] to-[#003366] text-white">
        <CardTitle className="text-xl">{initialData?.id ? "Edit" : "Add"} Athlete Details</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6">
          <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-gray-100">
              <TabsTrigger value="basic" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white">Basic Info</TabsTrigger>
              <TabsTrigger value="school" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white">School & Club</TabsTrigger>
              <TabsTrigger value="college" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white">College</TabsTrigger>
              <TabsTrigger value="achievements" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white">Achievements</TabsTrigger>
              <TabsTrigger value="academics" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white">Academics</TabsTrigger>
              <TabsTrigger value="additional" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white">Additional</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    className={validationErrors.firstName ? "border-red-500" : ""}
                    required
                  />
                  {validationErrors.firstName && <p className="text-sm text-red-500">{validationErrors.firstName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    className={validationErrors.lastName ? "border-red-500" : ""}
                    required
                  />
                  {validationErrors.lastName && <p className="text-sm text-red-500">{validationErrors.lastName}</p>}
                </div>
              </div>

              {/* Profile Picture Section */}
              <div className="space-y-2">
                <Label htmlFor="profilePicture">Profile Picture</Label>
                <div className="space-y-4">
                  <ImageUpload
                    category="profile"
                    onUploadComplete={(url) => handleImageUpload(url, "profile")}
                    existingImageUrl={formData.photoUrl}
                    entityName={`${formData.firstName || "athlete"}-${formData.lastName || "profile"}`}
                    aspectRatio="square"
                  />
                  {formData.photoUrl && (
                    <div className="text-sm text-green-600 font-medium">✓ Profile picture uploaded successfully</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.gender && <p className="text-sm text-red-500 mt-1">{validationErrors.gender}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthdate">Birthdate</Label>
                <Input
                  id="birthdate"
                  name="birthdate"
                  type="date"
                  value={formData.birthdate}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="graduationYear">Graduation Year</Label>
                <Input
                  id="graduationYear"
                  name="graduationYear"
                  type="number"
                  min="2000"
                  max="2050"
                  value={formData.graduationYear}
                  onChange={handleChange}
                  required
                />
                {validationErrors.graduationYear && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.graduationYear}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weightClass">Weight Class</Label>
                <Select
                  value={formData.weightClass}
                  onValueChange={(value) => handleSelectChange("weightClass", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select weight class" />
                  </SelectTrigger>
                  <SelectContent>
                    {weightClassOptions.map((weightClass) => (
                      <SelectItem key={weightClass.value} value={weightClass.value}>
                        {weightClass.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prospect Status Section */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="text-lg font-medium">Prospect Status</h3>

                <div className="space-y-2">
                  <Label htmlFor="recruiting_status">Recruiting Status</Label>
                  <Select
                    value={formData.recruiting_status || "Uncommitted"}
                    onValueChange={(value) => {
                      handleSelectChange("recruiting_status", value)
                      // Auto-toggle prospect status based on commitment status
                      const isProspect = value === "Uncommitted"
                      if (isProspect !== formData.isProspect) {
                        handleIsProspectChange(isProspect)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recruiting status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Uncommitted">Uncommitted</SelectItem>
                      <SelectItem value="Committed">Committed</SelectItem>
                      <SelectItem value="College Athlete">College Athlete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recruiting_status === "Uncommitted" && (
                  <div className="space-y-2">
                    <Label htmlFor="prospect_ranking">Prospect Ranking</Label>
                    <Input
                      id="prospect_ranking"
                      name="prospect_ranking"
                      type="number"
                      value={formData.prospect_ranking || ""}
                      onChange={handleChange}
                      placeholder="1-25 (Top 25 only)"
                      min="1"
                      max="25"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="prospect_notes">Internal Notes</Label>
                  <Textarea
                    id="prospect_notes"
                    name="prospect_notes"
                    value={formData.prospect_notes || ""}
                    onChange={handleChange}
                    placeholder="Internal recruiting notes..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => handleSwitchChange("featured", checked)}
                />
                <Label htmlFor="featured">Featured Athlete (appears on homepage)</Label>
              </div>
            </TabsContent>

            {/* School & Club Tab */}
            <TabsContent value="school" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="highSchool">
                    High School <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="highSchool"
                    name="highSchool"
                    value={formData.highSchool}
                    onChange={handleHighSchoolChange}
                    placeholder="Enter high school name"
                  />
                  {validationErrors.highSchool && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.highSchool}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="highSchoolDivision">High School Division</Label>
                  <Select
                    value={formData.highSchoolDivision || "not-specified"}
                    onValueChange={
                      (value) =>
                        setFormData((prev) => ({
                          ...prev,
                          highSchoolDivision: value === "not-specified" ? "" : value,
                          highSchoolLogoUrl: value === "not-specified" ? "" : value,
                        })) // Also update highSchoolLogoUrl
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select high school division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not-specified">Not specified</SelectItem>
                      <SelectItem value="1A">1A</SelectItem>
                      <SelectItem value="2A">2A</SelectItem>
                      <SelectItem value="3A">3A</SelectItem>
                      <SelectItem value="4A">4A</SelectItem>
                      <SelectItem value="5A">5A</SelectItem>
                      <SelectItem value="6A">6A</SelectItem>
                      <SelectItem value="7A">7A</SelectItem>
                      <SelectItem value="8A">8A</SelectItem>
                      <SelectItem value="Independent">Independent</SelectItem>
                      <SelectItem value="NCISAA">NCISAA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wrestlingClub">Wrestling Club</Label> {/* Fixed label to match field */}
                  <Select
                    value={formData.wrestlingClub}
                    onValueChange={(value) => handleSelectChange("wrestlingClub", value)}
                  >
                    {" "}
                    {/* Fixed to use wrestlingClub field */}
                    <SelectTrigger>
                      <SelectValue placeholder="Select wrestling club" />
                    </SelectTrigger>
                    <SelectContent>
                      {wrestlingClubs.map((club) => (
                        <SelectItem key={club} value={club}>
                          {club}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {showCustomClub && (
                  <div className="space-y-2">
                    <Label htmlFor="customWrestlingClub">Custom Wrestling Club Name</Label>
                    <Input
                      id="customWrestlingClub"
                      name="customWrestlingClub"
                      value={formData.customWrestlingClub}
                      onChange={handleChange}
                      placeholder="Enter wrestling club name"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Wrestling Club Logo URL</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagramUrl">Location</Label>
                  <Input
                    id="instagramUrl"
                    name="instagramUrl"
                    value={formData.instagramUrl}
                    onChange={handleChange}
                    placeholder="City, State"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ncUnitedTeam">NC United Team Membership</Label>
                  <Select
                    value={formData.ncUnitedTeam as string}
                    onValueChange={(value) => handleSelectChange("ncUnitedTeam", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select membership" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="blue">Blue Team</SelectItem>
                      <SelectItem value="gold">Gold Team</SelectItem>
                      <SelectItem value="both">Both Teams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* College Tab */}
            <TabsContent value="college" className="space-y-4 pt-4">
              {formData.recruiting_status === "Uncommitted" && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    College information is only available for committed athletes. Change the recruiting status to
                    "Committed" in the Basic Info tab to enable these fields.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="college">
                    College{" "}
                    {(formData.recruiting_status === "Committed" ||
                      formData.recruiting_status === "College Athlete") && <span className="text-red-500">*</span>}
                  </Label>
                  <Select
                    value={formData.college_id || "__none__"}
                    onValueChange={(value) => {
                      const id = value === "__none__" ? "" : value
                      const name = id ? collegeList.find((c) => c.id === id)?.name ?? "" : ""
                      setFormData((prev) => ({ ...prev, college_id: id, college: name }))
                    }}
                    disabled={formData.recruiting_status === "Uncommitted"}
                  >
                    <SelectTrigger id="college" className={validationErrors.college ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select college" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Select college —</SelectItem>
                      {collegeList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.college && <p className="text-sm text-red-500 mt-1">{validationErrors.college}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collegeLogoUrl">College Logo URL</Label>
                  <Input
                    id="collegeLogoUrl"
                    name="collegeLogoUrl"
                    value={formData.collegeLogoUrl || ""}
                    onChange={handleChange}
                    placeholder="https://example.com/logo.png"
                    disabled={formData.recruiting_status === "Uncommitted"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collegeWeightClass">
                    College Weight Class (Projected){" "}
                    {(formData.recruiting_status === "Committed" ||
                      formData.recruiting_status === "College Athlete") && <span className="text-red-500">*</span>}
                  </Label>
                  <Select
                    value={formData.collegeWeightClass}
                    onValueChange={(value) => handleSelectChange("collegeWeightClass", value)}
                    disabled={formData.recruiting_status === "Uncommitted"}
                  >
                    <SelectTrigger className={validationErrors.collegeWeightClass ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select college weight class" />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        COLLEGE_WEIGHT_CLASSES[formData.gender as keyof typeof COLLEGE_WEIGHT_CLASSES] ||
                        COLLEGE_WEIGHT_CLASSES.Male
                      ).map((weightClass) => (
                        <SelectItem key={weightClass.value} value={weightClass.value}>
                          {weightClass.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.collegeWeightClass && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.collegeWeightClass}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formData.gender === "Male"
                      ? "Men's college has 10 weight classes"
                      : "Women's college has 10 weight classes"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commitmentDate">
                    Commitment Date{" "}
                    {(formData.recruiting_status === "Committed" ||
                      formData.recruiting_status === "College Athlete") && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="commitmentDate"
                    name="commitmentDate"
                    type="date"
                    value={formData.commitmentDate}
                    onChange={handleChange}
                    required={
                      formData.recruiting_status === "Committed" || formData.recruiting_status === "College Athlete"
                    }
                    disabled={formData.recruiting_status === "Uncommitted"}
                  />
                  {validationErrors.commitmentDate && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.commitmentDate}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Commitment Photo</Label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="w-full max-w-[250px]">
                    <ImageUpload
                      category="commitment"
                      onUploadComplete={(url) => handleImageUpload(url, "commitment")}
                      existingImageUrl={formData.commitmentPhotoUrl}
                      entityName={`${formData.photoUrl || "athlete"}-commitment`}
                      aspectRatio="announcement"
                    />
                  </div>
                  {formData.commitmentPhotoUrl && (
                    <div className="flex items-center">
                      <p className="text-sm text-muted-foreground">
                        Current image: {formData.commitmentPhotoUrl.split("/").pop()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="space-y-4 pt-4">
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Super 32 Competition</h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="super_32_2023_record">2023 Super 32 Record</Label>
                    <Input
                      id="super_32_2023_record"
                      name="super_32_2023_record"
                      value={formData.super_32_2023_record}
                      onChange={handleChange}
                      placeholder="e.g., 3-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="super_32_2023_placement">2023 Super 32 Placement</Label>
                    <Input
                      id="super_32_2023_placement"
                      name="super_32_2023_placement"
                      value={formData.super_32_2023_placement}
                      onChange={handleChange}
                      placeholder="e.g., 5th Place, Semifinalist"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="super_32_2024_record">2024 Super 32 Record</Label>
                    <Input
                      id="super_32_2024_record"
                      name="super_32_2024_record"
                      value={formData.super_32_2024_record}
                      onChange={handleChange}
                      placeholder="e.g., 4-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="super_32_2024_placement">2024 Super 32 Placement</Label>
                    <Input
                      id="super_32_2024_placement"
                      name="super_32_2024_placement"
                      value={formData.super_32_2024_placement}
                      onChange={handleChange}
                      placeholder="e.g., 3rd Place, Quarterfinalist"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="super_32_2025_record">2025 Super 32 Record</Label>
                    <Input
                      id="super_32_2025_record"
                      name="super_32_2025_record"
                      value={formData.super_32_2025_record}
                      onChange={handleChange}
                      placeholder="e.g., 5-1"
                    />
                    <p className="text-xs text-muted-foreground">Tournament scheduled for end of October 2025</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="super_32_2025_placement">2025 Super 32 Placement</Label>
                    <Input
                      id="super_32_2025_placement"
                      name="super_32_2025_placement"
                      value={formData.super_32_2025_placement}
                      onChange={handleChange}
                      placeholder="e.g., Champion, 2nd Place"
                    />
                  </div>
                </div>
              </div>

              {/* NHSCA Competition Section */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">NHSCA Competition</h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nhsca_2023_record">2023 NHSCA Record</Label>
                    <Input
                      id="nhsca_2023_record"
                      name="nhsca_2023_record"
                      value={formData.nhsca_2023_record}
                      onChange={handleChange}
                      placeholder="e.g., 3-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nhsca_2023_placement">2023 NHSCA Placement</Label>
                    <Input
                      id="nhsca_2023_placement"
                      name="nhsca_2023_placement"
                      value={formData.nhsca_2023_placement}
                      onChange={handleChange}
                      placeholder="e.g., All-American, 5th Place"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nhsca_2024_record">2024 NHSCA Record</Label>
                    <Input
                      id="nhsca_2024_record"
                      name="nhsca_2024_record"
                      value={formData.nhsca_2024_record}
                      onChange={handleChange}
                      placeholder="e.g., 4-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nhsca_2024_placement">2024 NHSCA Placement</Label>
                    <Input
                      id="nhsca_2024_placement"
                      name="nhsca_2024_placement"
                      value={formData.nhsca_2024_placement}
                      onChange={handleChange}
                      placeholder="e.g., All-American, 3rd Place"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nhsca_2025_record">2025 NHSCA Record</Label>
                    <Input
                      id="nhsca_2025_record"
                      name="nhsca_2025_record"
                      value={formData.nhsca_2025_record}
                      onChange={handleChange}
                      placeholder="e.g., 5-1"
                    />
                    <p className="text-xs text-muted-foreground">Tournament scheduled for March 2025</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nhsca_2025_placement">2025 NHSCA Placement</Label>
                    <Input
                      id="nhsca_2025_placement"
                      name="nhsca_2025_placement"
                      value={formData.nhsca_2025_placement}
                      onChange={handleChange}
                      placeholder="e.g., Champion, All-American"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Nationally Ranked Wins</h3>
                <div className="space-y-2">
                  <Label htmlFor="nationally_ranked_wins">Notable Wins Against Nationally Ranked Opponents</Label>
                  <Textarea
                    id="nationally_ranked_wins"
                    name="nationally_ranked_wins"
                    value={formData.nationally_ranked_wins}
                    onChange={handleChange}
                    placeholder="List wins against nationally ranked opponents with details (opponent name, ranking, tournament, etc.)"
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    Include opponent name, their ranking at time of match, tournament/event, and any other relevant
                    details
                  </p>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">College Open Experience</h3>
                <div className="space-y-2">
                  <Label htmlFor="college_opens_experience">College Opens Record & Key Wins</Label>
                  <Textarea
                    id="college_opens_experience"
                    name="college_opens_experience"
                    value={formData.college_opens_experience}
                    onChange={handleChange}
                    placeholder="List all college opens attended with records and notable wins (e.g., UNC Open: 4-1, beat John Smith (Duke), Virginia Tech Open: 3-2, etc.)"
                    rows={5}
                  />
                  <p className="text-sm text-muted-foreground">
                    Include tournament names, overall records, and any significant wins against college wrestlers or
                    other notable opponents
                  </p>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Additional Achievements</h3>
                <div className="space-y-2">
                  <Label htmlFor="additional_achievements">Other Notable Accomplishments</Label>
                  <Textarea
                    id="additional_achievements"
                    name="additional_achievements"
                    value={formData.additional_achievements}
                    onChange={handleChange}
                    placeholder="List any other significant achievements, awards, honors, or accomplishments not captured above (e.g., team captain, academic awards, leadership roles, community service, etc.)"
                    rows={6}
                  />
                  <p className="text-sm text-muted-foreground">
                    Include any wrestling or non-wrestling achievements that showcase character, leadership, or other
                    qualities important to college coaches
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Academics Tab */}
            <TabsContent value="academics" className="space-y-4 pt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Academic Information</h3>
                <p className="text-sm text-gray-600">
                  Academic data helps college coaches evaluate prospects for recruitment eligibility.
                </p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="academicGPA">GPA</Label>
                    <Input
                      id="academicGPA"
                      name="academicGPA"
                      type="number"
                      step="0.01"
                      min="0"
                      max="5.0"
                      value={formData.academicGPA}
                      onChange={handleChange}
                      placeholder="e.g., 3.75"
                    />
                    <p className="text-xs text-gray-500">5.0 scale (includes AP classes)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="academicSAT">SAT Score</Label>
                    <Input
                      id="academicSAT"
                      name="academicSAT"
                      type="number"
                      min="400"
                      max="1600"
                      value={formData.academicSAT}
                      onChange={handleChange}
                      placeholder="e.g., 1200"
                    />
                    <p className="text-xs text-gray-500">Total score (400-1600)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="academicACT">ACT Score</Label>
                    <Input
                      id="academicACT"
                      name="academicACT"
                      type="number"
                      min="1"
                      max="36"
                      value={formData.academicACT}
                      onChange={handleChange}
                      placeholder="e.g., 28"
                    />
                    <p className="text-xs text-gray-500">Composite score (1-36)</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academicInterest">Academic Interest / Intended Major</Label>
                  <Input
                    id="academicInterest"
                    name="academicInterest"
                    value={formData.academicInterest}
                    onChange={handleChange}
                    placeholder="e.g., Business, Engineering, Pre-Med, Education"
                  />
                  <p className="text-xs text-gray-500">Intended field of study or academic interests</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academicSummary">Academic Summary</Label>
                  <Textarea
                    id="academicSummary"
                    name="academicSummary"
                    value={formData.academicSummary}
                    onChange={handleChange}
                    placeholder="Additional academic information, honors, AP courses, etc."
                    rows={4}
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">NCAA Eligibility Guidelines</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Division I: Minimum 2.3 GPA in core courses</li>
                    <li>• Division II: Minimum 2.2 GPA in core courses</li>
                    <li>• Test scores and GPA work together on sliding scale</li>
                    <li>• Higher GPA allows for lower test scores and vice versa</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Additional Tab */}
            <TabsContent value="additional" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Athlete Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Enter athlete bio..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="highlightVideoUrl">Highlight Video URL</Label>
                <Input
                  id="highlightVideoUrl"
                  name="highlightVideoUrl"
                  type="url"
                  value={formData.highlightVideoUrl}
                  onChange={handleChange}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs text-muted-foreground">
                  Enter a YouTube URL to display a highlight video on the athlete's profile
                </p>
              </div>

              <div className="space-y-2">
                <Label>Social Media</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-sm">Twitter:</span>
                    <Input
                      id="twitterUrl"
                      name="twitterUrl"
                      value={formData.twitterUrl}
                      onChange={handleChange}
                      placeholder="username (without @)"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-24 text-sm">Instagram:</span>
                    <Input
                      id="instagramUrl"
                      name="instagramUrl"
                      value={formData.instagramUrl}
                      onChange={handleChange}
                      placeholder="username (without @)"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-24 text-sm">Facebook:</span>
                    <Input
                      id="facebookUrl"
                      name="facebookUrl"
                      value={formData.facebookUrl}
                      onChange={handleChange}
                      placeholder="username or profile URL"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Wrestling Profiles</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-sm">Flo Wrestling:</span>
                    <Input
                      id="floProfileUrl"
                      name="floProfileUrl"
                      type="url"
                      value={formData.floProfileUrl}
                      onChange={handleChange}
                      placeholder="https://www.flowrestling.org/..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-32 text-sm">Track Wrestling:</span>
                    <Input
                      id="trackWrestlingProfileUrl"
                      name="trackWrestlingProfileUrl"
                      type="url"
                      value={formData.trackWrestlingProfileUrl}
                      onChange={handleChange}
                      placeholder="https://www.trackwrestling.com/..."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="athlete@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                />
              </div>
            </TabsContent>
          </Tabs>

          {Object.keys(validationErrors).length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please fix the following errors before submitting:
                <ul className="list-disc pl-5 mt-2">
                  {Object.values(validationErrors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-3 bg-gray-50 border-t">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-[#B31B1B] hover:bg-[#8B1515] text-white px-8"
          >
            {isSubmitting ? "Saving..." : initialData?.id ? "Save Changes" : "Add Athlete"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export { AthleteForm }

interface AthleteFormData {
  firstName: string
  lastName: string
  gender: string
  birthdate: string
  graduationYear: string
  weightClass: string
  collegeWeightClass: string
  highSchool: string
  college: string
  college_id: string
  commitmentDate: string
  isProspect: boolean
  customWrestlingClub: string
  wrestlingClub: string // Added proper wrestling club field
  photoUrl: string
  commitmentPhotoUrl: string
  highlightVideoUrl: string
  achievements: string[]
  additional_achievements: string
  careerRecord: string
  stateRanking: string
  nationalRanking: string
  location: string
  bio: string
  bio_headline: string
  twitterUrl: string
  instagramUrl: string
  facebookUrl: string
  floProfileUrl: string
  trackWrestlingProfileUrl: string
  ncUnitedTeam: string
  contactEmail: string
  phone: string
  featured: boolean
  recruiting_status: string
  prospect_ranking: number
  prospect_notes: string
  collegeLogoUrl: string
  academicGPA: string
  academicSAT: string
  academicACT: string
  academicSummary: string
  academicInterest: string // Added academic interest to TypeScript interface
  super_32_2024_record: string
  super_32_2024_placement: string
  super_32_2025_record: string
  super_32_2025_placement: string
  nationally_ranked_wins: string
  college_opens_experience: string
  nhsca_2024_record: string
  nhsca_2024_placement: string
  nhsca_2025_record: string
  nhsca_2025_placement: string
  super_32_2023_record: string // Added Super 32 2023 fields
  super_32_2023_placement: string // Added Super 32 2023 fields
  nhsca_2023_record: string
  nhsca_2023_placement: string
  highSchoolDivision: string // Added field
}

interface ValidationErrors {
  [key: string]: string
}
