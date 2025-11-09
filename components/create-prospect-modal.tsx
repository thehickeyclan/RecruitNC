"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, UserPlus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { LEAD_SOURCE_OPTIONS } from "@/components/lead-source-form"
import { ImageUpload } from "@/components/image-upload"

interface CreateProspectModalProps {
  isOpen: boolean
  onClose: () => void
  onProspectCreated: () => void
  schoolId?: string
  isDarkMode?: boolean
  schoolLogoUrl?: string | null
}

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
]

const WEIGHT_CLASSES = [
  "106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"
]

const GRADUATION_YEARS = [
  new Date().getFullYear() + 4,
  new Date().getFullYear() + 3,
  new Date().getFullYear() + 2,
  new Date().getFullYear() + 1,
  new Date().getFullYear(),
]

export function CreateProspectModal({
  isOpen,
  onClose,
  onProspectCreated,
  schoolId,
  isDarkMode = false,
  schoolLogoUrl = null,
}: CreateProspectModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fallbackPhoto = schoolLogoUrl || "/wrestler-silhouette.png"
  const inputClass =
    "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
  const selectTriggerClass =
    "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
  const selectContentClass = "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
  const textareaClass =
    "resize-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
  const [formData, setFormData] = useState({
    name: "",
    state: "",
    highschool: "",
    graduationYear: "",
    weightclass: "",
    gender: "Male",
    email: "",
    phone: "",
    instagram: "",
    notes: "",
    leadSource: "",
    leadSubsource: "",
    leadSourceDetail: "",
    photoUrl: "",
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = (url: string) => {
    setFormData((prev) => ({ ...prev, photoUrl: url }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validation - align with admin athlete mandatory fields
      if (!formData.name || !formData.state || !formData.graduationYear || !formData.highschool || !formData.gender) {
        toast({
          title: "Missing Required Fields",
          description: "Please fill in Name, State, High School, Graduation Year, and Gender",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const payload = {
        name: formData.name.trim(),
        state: formData.state,
        highschool: formData.highschool.trim() || null,
        graduationyear: parseInt(formData.graduationYear),
        weightclass: formData.weightclass || null,
        gender: formData.gender,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        instagram: formData.instagram.trim() || null,
        notes: formData.notes.trim() || null,
        lead_source: formData.leadSource || null,
        lead_subsource: formData.leadSubsource.trim() || null,
        lead_source_detail: formData.leadSourceDetail.trim() || null,
        photoUrl: formData.photoUrl || fallbackPhoto,
        schoolId: schoolId,
      }

      const response = await fetch("/api/coaches/create-prospect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create prospect")
      }

      toast({
        title: "Prospect Created!",
        description: `${formData.name} has been added to your recruits and is ready to track.`,
      })

      // Reset form
      setFormData({
        name: "",
        state: "",
        highschool: "",
        graduationYear: "",
        weightclass: "",
        gender: "Male",
        email: "",
        phone: "",
        instagram: "",
        notes: "",
        leadSource: "",
        leadSubsource: "",
        leadSourceDetail: "",
        photoUrl: "",
      })

      onProspectCreated()
      onClose()
    } catch (error) {
      console.error("Error creating prospect:", error)
      toast({
        title: "Failed to Create Prospect",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className={isDarkMode ? "dark" : ""}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-[#13294B] dark:text-slate-50">
            <UserPlus className="h-6 w-6 text-[#13294B] dark:text-sky-300" />
            Add New Prospect to Track
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-300">
            Add an athlete to your recruiting pipeline. This can be anyone - NC or out-of-state, ranked or unranked.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Profile Photo */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#13294B] dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                Profile Photo
              </h3>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <ImageUpload
                  key={formData.photoUrl || fallbackPhoto}
                  category="prospects"
                  existingImageUrl={formData.photoUrl || fallbackPhoto}
                  onUploadComplete={handleImageUpload}
                  entityName={formData.name || "prospect"}
                />
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md">
                  Add a headshot so your staff can instantly recognize the athlete. If you skip this step we’ll use your
                  school logo by default.
                </p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#13294B] dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="John Smith"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label htmlFor="state">State *</Label>
                  <Select value={formData.state} onValueChange={(val) => handleChange("state", val)}>
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className={`max-h-[300px] ${selectContentClass}`}>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name} ({state.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="highschool">High School *</Label>
                  <Input
                    id="highschool"
                    value={formData.highschool}
                    onChange={(e) => handleChange("highschool", e.target.value)}
                    placeholder="Liberty High School"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label htmlFor="graduationYear">Graduation Year *</Label>
                  <Select value={formData.graduationYear} onValueChange={(val) => handleChange("graduationYear", val)}>
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      {GRADUATION_YEARS.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          Class of {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="weightclass">Weight Class</Label>
                  <Select value={formData.weightclass} onValueChange={(val) => handleChange("weightclass", val)}>
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Select weight (optional)" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      <SelectItem value="TBD">TBD</SelectItem>
                      {WEIGHT_CLASSES.map((weight) => (
                        <SelectItem key={weight} value={weight}>
                          {weight} lbs
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={formData.gender} onValueChange={(val) => handleChange("gender", val)} required>
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#13294B] dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                Contact Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="athlete@email.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label htmlFor="instagram">Instagram Handle</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => handleChange("instagram", e.target.value)}
                    placeholder="@wrestler_username"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#13294B] dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                Recruiting Notes
              </h3>
              
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="E.g., Saw at Beast of the East, interested in D2 programs, 3.5 GPA..."
                  rows={4}
                  className={textareaClass}
                />
              </div>
            </div>

            {/* Lead Source */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#13294B] dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                Lead Source Tracking
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="leadSource">Lead Source</Label>
                  <Select
                    value={formData.leadSource}
                    onValueChange={(val) => handleChange("leadSource", val)}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Select source (optional)" />
                    </SelectTrigger>
                    <SelectContent className={`max-h-[240px] ${selectContentClass}`}>
                      {LEAD_SOURCE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="leadSubsource">Lead Subsource</Label>
                  <Input
                    id="leadSubsource"
                    value={formData.leadSubsource}
                    onChange={(e) => handleChange("leadSubsource", e.target.value)}
                    placeholder='e.g. "Super 32", "Instagram DM"'
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="leadSourceDetail">Additional Context</Label>
                <Textarea
                  id="leadSourceDetail"
                  value={formData.leadSourceDetail}
                  onChange={(e) => handleChange("leadSourceDetail", e.target.value)}
                  placeholder='Optional notes (e.g. "Met family at UNC dual; coach follow-up scheduled")'
                  rows={3}
                  className={textareaClass}
                />
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-slate-200">
                <strong>Privacy:</strong> This prospect will only be visible to you in your "My Recruits" portal. 
                Other coaches will not see them unless you share their information.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-[#13294B] hover:bg-[#1e3a5f] text-white dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Prospect
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </div>
    </Dialog>
  )
}

