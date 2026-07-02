"use client"

/**
 * Contact Form Sections - Mobile-first collapsible accordion form
 * Used for editing athlete contacts, will be extended for parents/coaches
 */
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { ImageUpload } from "@/components/image-upload"
import { COLLEGE_WEIGHT_CLASSES } from "@/lib/college-weight-classes"
import {
  ChevronDown,
  User,
  School,
  Trophy,
  GraduationCap,
  BookOpen,
  Link as LinkIcon,
  Phone,
  Save,
  Loader2,
} from "lucide-react"

const HS_WEIGHT_CLASSES = {
  Male: [
    { value: "106", label: "106" },
    { value: "113", label: "113" },
    { value: "120", label: "120" },
    { value: "126", label: "126" },
    { value: "132", label: "132" },
    { value: "138", label: "138" },
    { value: "144", label: "144" },
    { value: "150", label: "150" },
    { value: "157", label: "157" },
    { value: "165", label: "165" },
    { value: "175", label: "175" },
    { value: "190", label: "190" },
    { value: "215", label: "215" },
    { value: "285", label: "285" },
  ],
  Female: [
    { value: "100", label: "100" },
    { value: "107", label: "107" },
    { value: "114", label: "114" },
    { value: "120", label: "120" },
    { value: "126", label: "126" },
    { value: "132", label: "132" },
    { value: "138", label: "138" },
    { value: "145", label: "145" },
    { value: "152", label: "152" },
    { value: "165", label: "165" },
    { value: "185", label: "185" },
    { value: "235", label: "235" },
  ],
}

type Props = {
  initialData: any
  onSubmit: (data: any) => Promise<void>
  editableBio?: string
  editableHeadline?: string
}

export function ContactFormSections({ initialData, onSubmit, editableBio, editableHeadline }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openSections, setOpenSections] = useState<string[]>(["basic"])
  const [collegeList, setCollegeList] = useState<{ id: string; name: string }[]>([])
  const { toast } = useToast()

  // Ensure we have a valid data object
  const data = initialData || {}

  // Form state
  const [formData, setFormData] = useState({
    firstName: data.firstName || data.name?.split(" ")[0] || "",
    lastName: data.lastName || data.name?.split(" ").slice(1).join(" ") || "",
    gender: data.gender || "Male",
    birthdate: data.birthdate ? (data.birthdate.includes("T") ? data.birthdate.split("T")[0] : data.birthdate) : "",
    graduationYear: data.graduationYear?.toString() || data.graduationyear?.toString() || "",
    weightClass: data.weightclass || "",
    collegeWeightClass: data.college_weight_class || "",
    highSchool: data.highschool || "",
    highSchoolDivision: data.highSchoolDivision || "",
    wrestlingClub: data.wrestlingClub || data.wrestling_club || "",
    location: data.location || "",
    // College
    college: data.college || "",
    college_id: data.college_id || null,
    commitmentDate: data.commitmentdate ? new Date(data.commitmentdate).toISOString().split("T")[0] : "",
    recruiting_status: data.recruiting_status || "Uncommitted",
    prospect_ranking: data.prospect_ranking || "",
    // Media
    photoUrl: data.photoUrl || data.photourl || "",
    highlightVideoUrl: data.highlight_video_url || "",
    floProfileUrl: data.flo_profile_url || "",
    trackWrestlingProfileUrl: data.track_wrestling_profile_url || "",
    // Social
    twitterUrl: data.socialMedia?.twitter || "",
    instagramUrl: data.socialMedia?.instagram || "",
    // Contact
    contactEmail: data.contactEmail || "",
    phone: data.phone || "",
    // Wrestling stats
    careerRecord: data.careerRecord || "",
    achievements: Array.isArray(data.achievements) ? data.achievements.join(", ") : "",
    additional_achievements: data.additional_achievements || "",
    nationally_ranked_wins: data.nationally_ranked_wins || "",
    // Academics
    academicGPA: data.academic_gpa?.toString() || "",
    academicSAT: data.academic_sat?.toString() || "",
    academicACT: data.academic_act?.toString() || "",
    academicSummary: data.academic_summary || "",
    academicInterest: data.academic_interest || "",
    // Tournament results
    super_32_2023_record: data.super_32_2023_record || "",
    super_32_2023_placement: data.super_32_2023_placement || "",
    super_32_2024_record: data.super_32_2024_record || "",
    super_32_2024_placement: data.super_32_2024_placement || "",
    super_32_2025_record: data.super_32_2025_record || "",
    super_32_2025_placement: data.super_32_2025_placement || "",
    nhsca_2023_record: data.nhsca_2023_record || "",
    nhsca_2023_placement: data.nhsca_2023_placement || "",
    nhsca_2024_record: data.nhsca_2024_record || "",
    nhsca_2024_placement: data.nhsca_2024_placement || "",
    nhsca_2025_record: data.nhsca_2025_record || "",
    nhsca_2025_placement: data.nhsca_2025_placement || "",
    college_opens_experience: data.college_opens_experience || "",
    // Admin
    featured: data.featured || false,
    prospect_notes: data.prospect_notes || "",
  })

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await fetch("/api/admin/colleges", { cache: "no-store" })
        const data = await res.json()
        if (data.success && Array.isArray(data.colleges)) {
          setCollegeList(data.colleges.map((c: any) => ({ id: c.id, name: c.name })))
        }
      } catch {
        // ignore
      }
    }
    fetchColleges()
  }, [])

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const newValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value
    setFormData((prev) => ({ ...prev, [name]: newValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        bio: editableBio,
        bio_headline: editableHeadline,
      })
    } catch (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const gender = formData.gender || "Male"
  const weightClassOptions = HS_WEIGHT_CLASSES[gender as keyof typeof HS_WEIGHT_CLASSES] || HS_WEIGHT_CLASSES.Male
  const collegeWeightOptions = COLLEGE_WEIGHT_CLASSES[gender as keyof typeof COLLEGE_WEIGHT_CLASSES] || COLLEGE_WEIGHT_CLASSES.Male

  const sections = [
    {
      id: "basic",
      title: "Basic Info",
      icon: User,
      fields: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name *" name="firstName" value={formData.firstName} onChange={handleChange} required />
            <FormField label="Last Name *" name="lastName" value={formData.lastName} onChange={handleChange} required />
          </div>
          <FormSelect
            label="Gender *"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            options={[
              { value: "", label: "Select gender" },
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
            ]}
            required
          />
          <FormField label="Birthdate" name="birthdate" type="date" value={formData.birthdate} onChange={handleChange} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Graduation Year *" name="graduationYear" type="number" value={formData.graduationYear} onChange={handleChange} required />
            <FormSelect
              label="Weight Class"
              name="weightClass"
              value={formData.weightClass}
              onChange={handleChange}
              options={[{ value: "", label: "Select" }, ...weightClassOptions.map((w) => ({ value: w.value, label: `${w.label} lbs` }))]}
            />
          </div>
          <FormSelect
            label="Recruiting Status"
            name="recruiting_status"
            value={formData.recruiting_status}
            onChange={handleChange}
            options={[
              { value: "Uncommitted", label: "Uncommitted" },
              { value: "Committed", label: "Committed" },
              { value: "College Athlete", label: "College Athlete" },
            ]}
          />
          {formData.recruiting_status === "Uncommitted" && (
            <FormField label="Prospect Ranking (1-25)" name="prospect_ranking" type="number" value={formData.prospect_ranking} onChange={handleChange} />
          )}
          <div className="pt-2">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/50">Profile Photo</label>
            <ImageUpload
              category="profile"
              onUploadComplete={(url) => setFormData((prev) => ({ ...prev, photoUrl: url }))}
              existingImageUrl={formData.photoUrl}
              entityName={`${formData.firstName || "athlete"}-${formData.lastName || "profile"}`}
              aspectRatio="square"
            />
          </div>
        </div>
      ),
    },
    {
      id: "school",
      title: "School & Club",
      icon: School,
      fields: (
        <div className="space-y-4">
          <FormField label="High School *" name="highSchool" value={formData.highSchool} onChange={handleChange} required />
          <FormSelect
            label="Division"
            name="highSchoolDivision"
            value={formData.highSchoolDivision}
            onChange={handleChange}
            options={[
              { value: "", label: "Not specified" },
              { value: "1A", label: "1A" },
              { value: "2A", label: "2A" },
              { value: "3A", label: "3A" },
              { value: "4A", label: "4A" },
            ]}
          />
          <FormField label="Wrestling Club" name="wrestlingClub" value={formData.wrestlingClub} onChange={handleChange} />
          <FormField label="Location" name="location" value={formData.location} onChange={handleChange} placeholder="City, State" />
        </div>
      ),
    },
    {
      id: "college",
      title: "College",
      icon: GraduationCap,
      fields: (
        <div className="space-y-4">
          {formData.recruiting_status === "Uncommitted" ? (
            <p className="rounded-lg border border-[#C8A94A]/30 bg-[#C8A94A]/10 px-4 py-3 text-sm text-[#C8A94A]">
              College fields available for committed athletes. Change status in Basic Info.
            </p>
          ) : (
            <>
              <FormSelect
                label="College"
                name="college_id"
                value={formData.college_id ?? ""}
                onChange={(e) => {
                  const id = e.target.value.trim()
                  const name = id ? collegeList.find((c) => c.id === id)?.name ?? "" : ""
                  setFormData((prev) => ({ ...prev, college_id: id || null, college: name }))
                }}
                options={[{ value: "", label: "Select college" }, ...collegeList.map((c) => ({ value: c.id, label: c.name }))]}
              />
              <FormField label="Commitment Date" name="commitmentDate" type="date" value={formData.commitmentDate} onChange={handleChange} />
              <FormSelect
                label="College Weight Class"
                name="collegeWeightClass"
                value={formData.collegeWeightClass}
                onChange={handleChange}
                options={[{ value: "", label: "Select" }, ...collegeWeightOptions.map((w) => ({ value: w.value, label: `${w.label} lbs` }))]}
              />
            </>
          )}
        </div>
      ),
    },
    {
      id: "achievements",
      title: "Wrestling",
      icon: Trophy,
      fields: (
        <div className="space-y-4">
          <FormField label="Career Record" name="careerRecord" value={formData.careerRecord} onChange={handleChange} placeholder="e.g. 120-15" />
          <FormTextarea label="Achievements" name="achievements" value={formData.achievements} onChange={handleChange} placeholder="State Champion, All-American..." rows={3} />
          <FormTextarea label="Additional Achievements" name="additional_achievements" value={formData.additional_achievements} onChange={handleChange} rows={2} />
          <FormField label="Nationally Ranked Wins" name="nationally_ranked_wins" value={formData.nationally_ranked_wins} onChange={handleChange} />
          <div className="border-t border-white/10 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">Tournament Results</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Super 32 2025 Record" name="super_32_2025_record" value={formData.super_32_2025_record} onChange={handleChange} placeholder="e.g. 4-1" />
                <FormField label="Placement" name="super_32_2025_placement" value={formData.super_32_2025_placement} onChange={handleChange} placeholder="e.g. 3rd" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="NHSCA 2025 Record" name="nhsca_2025_record" value={formData.nhsca_2025_record} onChange={handleChange} placeholder="e.g. 4-1" />
                <FormField label="Placement" name="nhsca_2025_placement" value={formData.nhsca_2025_placement} onChange={handleChange} placeholder="e.g. 3rd" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "academics",
      title: "Academics",
      icon: BookOpen,
      fields: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <FormField label="GPA" name="academicGPA" type="number" step="0.01" value={formData.academicGPA} onChange={handleChange} placeholder="e.g. 3.5" />
            <FormField label="SAT" name="academicSAT" type="number" value={formData.academicSAT} onChange={handleChange} placeholder="e.g. 1200" />
            <FormField label="ACT" name="academicACT" type="number" value={formData.academicACT} onChange={handleChange} placeholder="e.g. 28" />
          </div>
          <FormField label="Academic Interest" name="academicInterest" value={formData.academicInterest} onChange={handleChange} placeholder="e.g. Business, Engineering" />
          <FormTextarea label="Academic Summary" name="academicSummary" value={formData.academicSummary} onChange={handleChange} rows={3} />
        </div>
      ),
    },
    {
      id: "links",
      title: "Links & Media",
      icon: LinkIcon,
      fields: (
        <div className="space-y-4">
          <FormField label="Highlight Video URL" name="highlightVideoUrl" value={formData.highlightVideoUrl} onChange={handleChange} placeholder="YouTube or Vimeo link" />
          <FormField label="FloWrestling Profile" name="floProfileUrl" value={formData.floProfileUrl} onChange={handleChange} placeholder="https://flo..." />
          <FormField label="TrackWrestling Profile" name="trackWrestlingProfileUrl" value={formData.trackWrestlingProfileUrl} onChange={handleChange} />
          <div className="border-t border-white/10 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">Social Media</p>
            <div className="space-y-3">
              <FormField label="Twitter/X" name="twitterUrl" value={formData.twitterUrl} onChange={handleChange} placeholder="@username or URL" />
              <FormField label="Instagram" name="instagramUrl" value={formData.instagramUrl} onChange={handleChange} placeholder="@username or URL" />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "contact",
      title: "Contact Info",
      icon: Phone,
      fields: (
        <div className="space-y-4">
          <FormField label="Email" name="contactEmail" type="email" value={formData.contactEmail} onChange={handleChange} placeholder="athlete@email.com" />
          <FormField label="Phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="(555) 123-4567" />
        </div>
      ),
    },
  ]

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-3">
        {sections.map((section) => {
          const isOpen = openSections.includes(section.id)
          const Icon = section.icon
          return (
            <div key={section.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#0B2545]">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="flex min-h-[56px] w-full items-center justify-between px-4 py-3 text-left hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-[#C8A94A]" />
                  <span className="font-semibold text-white">{section.title}</span>
                </div>
                <ChevronDown className={`h-5 w-5 text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-white/10 px-4 py-4">
                  {section.fields}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sticky save button */}
      <div className="sticky bottom-0 mt-6 border-t border-white/10 bg-[#061224] px-4 py-4 -mx-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#C8A94A] font-bold text-[#061224] hover:bg-[#d4b75c] disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  )
}

// Form field components for consistency
function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  step,
}: {
  label: string
  name: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  step?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/50">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        step={step}
        className="w-full rounded-lg border border-white/15 bg-[#061224] px-4 py-3 text-white placeholder:text-white/30 focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/50"
      />
    </div>
  )
}

function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  required,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: { value: string; label: string }[]
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/50">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-white/15 bg-[#061224] px-4 py-3 text-white focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function FormTextarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/50">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-white/15 bg-[#061224] px-4 py-3 text-white placeholder:text-white/30 focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/50"
      />
    </div>
  )
}
