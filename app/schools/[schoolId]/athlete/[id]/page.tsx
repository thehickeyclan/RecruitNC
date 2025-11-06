"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Phone, 
  Mail, 
  MapPin,
  Trophy,
  GraduationCap,
  DollarSign,
  FileText,
  MessageSquare,
  Save,
  Plus
} from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

interface Athlete {
  id: string
  name: string
  graduationyear: number
  gender: string
  weightclass: string
  highschool: string
  wrestlingClub: string
  photourl: string
  prospect_ranking: number
  academic_gpa: number
  academic_sat: number
  academic_act: number
  location: string
  phone: string
  contactEmail: string
  bio: string
  careerRecord: string
  college_opens_experience: string
  highlight_video_url: string
  
  // Recruiting tracking data
  is_starred: boolean
  starred_at: string
  pipeline_stage: string
  interest_level: string
  
  // NEW: Milestone tracking
  first_contact_date?: string
  first_contact_method?: string
  has_applied?: boolean
  applied_date?: string
  campus_visit_date?: string
  campus_visit_type?: string
  official_visit_date?: string
  financial_package_sent?: boolean
  package_sent_date?: string
  package_amount?: number
  offer_extended?: boolean
  offer_date?: string
  offer_details?: string
  committed_date?: string
  nli_signed_date?: string
  communication_log?: any[]
  recruiting_notes?: string
  
  // Existing financial fields
  financial_efc?: number
  financial_aid_needs?: string
  scholarship_requirements?: string
  ability_to_pay?: string
  financial_notes?: string
}

export default function AthleteRecruitingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const athleteId = params.id as string
  const schoolId = params.schoolId as string

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form states for milestones
  const [milestones, setMilestones] = useState({
    first_contact_date: "",
    first_contact_method: "",
    has_applied: false,
    applied_date: "",
    campus_visit_date: "",
    campus_visit_type: "unofficial",
    official_visit_date: "",
    financial_package_sent: false,
    package_sent_date: "",
    package_amount: "",
    offer_extended: false,
    offer_date: "",
    offer_details: "",
    committed_date: "",
    nli_signed_date: "",
    recruiting_notes: "",
  })

  // Communication log
  const [newCommunication, setNewCommunication] = useState({
    type: "email",
    date: "",
    notes: "",
  })

  useEffect(() => {
    fetchAthleteDetails()
  }, [athleteId])

  const fetchAthleteDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/coaches/athlete-details/${athleteId}`)
      
      if (response.ok) {
        const data = await response.json()
        setAthlete(data.athlete)
        
        // Populate form with existing milestone data
        setMilestones({
          first_contact_date: data.athlete.first_contact_date?.split('T')[0] || "",
          first_contact_method: data.athlete.first_contact_method || "",
          has_applied: data.athlete.has_applied || false,
          applied_date: data.athlete.applied_date?.split('T')[0] || "",
          campus_visit_date: data.athlete.campus_visit_date?.split('T')[0] || "",
          campus_visit_type: data.athlete.campus_visit_type || "unofficial",
          official_visit_date: data.athlete.official_visit_date?.split('T')[0] || "",
          financial_package_sent: data.athlete.financial_package_sent || false,
          package_sent_date: data.athlete.package_sent_date?.split('T')[0] || "",
          package_amount: data.athlete.package_amount?.toString() || "",
          offer_extended: data.athlete.offer_extended || false,
          offer_date: data.athlete.offer_date?.split('T')[0] || "",
          offer_details: data.athlete.offer_details || "",
          committed_date: data.athlete.committed_date?.split('T')[0] || "",
          nli_signed_date: data.athlete.nli_signed_date?.split('T')[0] || "",
          recruiting_notes: data.athlete.recruiting_notes || "",
        })
      }
    } catch (error) {
      console.error("Error fetching athlete details:", error)
      toast.error("Failed to load athlete details")
    } finally {
      setLoading(false)
    }
  }

  const saveMilestones = async () => {
    try {
      setSaving(true)
      
      const response = await fetch(`/api/coaches/athlete-details/${athleteId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(milestones),
      })

      if (response.ok) {
        toast.success("Milestones updated successfully")
        fetchAthleteDetails() // Refresh
      } else {
        toast.error("Failed to update milestones")
      }
    } catch (error) {
      console.error("Error saving milestones:", error)
      toast.error("Failed to update milestones")
    } finally {
      setSaving(false)
    }
  }

  const addCommunication = async () => {
    if (!newCommunication.date || !newCommunication.notes) {
      toast.error("Please fill in date and notes")
      return
    }

    try {
      const response = await fetch(`/api/coaches/athlete-details/${athleteId}/communication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCommunication),
      })

      if (response.ok) {
        toast.success("Communication logged")
        setNewCommunication({ type: "email", date: "", notes: "" })
        fetchAthleteDetails() // Refresh
      } else {
        toast.error("Failed to log communication")
      }
    } catch (error) {
      console.error("Error adding communication:", error)
      toast.error("Failed to log communication")
    }
  }

  const getTimelineSteps = () => {
    return [
      { 
        label: "Starred", 
        date: athlete?.starred_at,
        completed: true,
        icon: "⭐"
      },
      { 
        label: "First Contact", 
        date: athlete?.first_contact_date,
        completed: !!athlete?.first_contact_date,
        icon: "📧"
      },
      { 
        label: "Applied", 
        date: athlete?.applied_date,
        completed: athlete?.has_applied || false,
        icon: "📝"
      },
      { 
        label: "Campus Visit", 
        date: athlete?.campus_visit_date,
        completed: !!athlete?.campus_visit_date,
        icon: "🏫"
      },
      { 
        label: "Package Sent", 
        date: athlete?.package_sent_date,
        completed: athlete?.financial_package_sent || false,
        icon: "💰"
      },
      { 
        label: "Offer Extended", 
        date: athlete?.offer_date,
        completed: athlete?.offer_extended || false,
        icon: "🎯"
      },
      { 
        label: "Committed", 
        date: athlete?.committed_date,
        completed: !!athlete?.committed_date,
        icon: "✅"
      },
      { 
        label: "Signed NLI", 
        date: athlete?.nli_signed_date,
        completed: !!athlete?.nli_signed_date,
        icon: "✍️"
      },
    ]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading athlete details...</p>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Athlete not found</p>
      </div>
    )
  }

  const timelineSteps = getTimelineSteps()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/schools/${schoolId}/portal`)}
            className="mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal
          </Button>

          <div className="flex items-start gap-6">
            {/* Athlete Photo */}
            {athlete.photourl && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border-2 border-gray-200">
                <Image
                  src={athlete.photourl}
                  alt={athlete.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Athlete Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#002147] mb-2">{athlete.name}</h1>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className="bg-white">
                  Class of {athlete.graduationyear}
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {athlete.weightclass} lbs
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {athlete.highschool}
                </Badge>
                {athlete.prospect_ranking && (
                  <Badge className="bg-[#BC0B03] text-white">
                    #{athlete.prospect_ranking} NC Prospect
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 text-sm text-gray-600">
                <span>⭐ Starred: {new Date(athlete.starred_at).toLocaleDateString()}</span>
                <span>•</span>
                <span className="capitalize">{athlete.pipeline_stage}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Recruiting Timeline */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#002147] to-[#13294B] text-white">
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recruiting Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              {/* Progress bar */}
              <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200">
                <div 
                  className="h-full bg-[#BC0B03] transition-all duration-500"
                  style={{ 
                    width: `${(timelineSteps.filter(s => s.completed).length / timelineSteps.length) * 100}%` 
                  }}
                />
              </div>

              {/* Timeline steps */}
              <div className="relative flex justify-between">
                {timelineSteps.map((step, index) => (
                  <div key={index} className="flex flex-col items-center" style={{ width: `${100 / timelineSteps.length}%` }}>
                    {/* Icon */}
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2 border-2
                      ${step.completed 
                        ? 'bg-[#BC0B03] border-[#BC0B03] text-white' 
                        : 'bg-white border-gray-300 text-gray-400'
                      }
                    `}>
                      {step.icon}
                    </div>
                    
                    {/* Label */}
                    <p className={`text-xs font-medium text-center mb-1 ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    
                    {/* Date */}
                    {step.date && (
                      <p className="text-xs text-gray-500">
                        {new Date(step.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="recruiting">Recruiting Status</TabsTrigger>
            <TabsTrigger value="financial">Financial Aid</TabsTrigger>
            <TabsTrigger value="activity">Notes & Activity</TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Academic Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5 text-[#002147]" />
                    Academics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {athlete.academic_gpa && (
                    <div>
                      <Label className="text-sm text-gray-600">GPA</Label>
                      <p className="text-2xl font-bold text-[#002147]">{athlete.academic_gpa.toFixed(2)}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {athlete.academic_sat && (
                      <div>
                        <Label className="text-sm text-gray-600">SAT</Label>
                        <p className="text-xl font-semibold text-gray-900">{athlete.academic_sat}</p>
                      </div>
                    )}
                    {athlete.academic_act && (
                      <div>
                        <Label className="text-sm text-gray-600">ACT</Label>
                        <p className="text-xl font-semibold text-gray-900">{athlete.academic_act}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Phone className="h-5 w-5 text-[#002147]" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {athlete.contactEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${athlete.contactEmail}`} className="text-blue-600 hover:underline">
                        {athlete.contactEmail}
                      </a>
                    </div>
                  )}
                  {athlete.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a href={`tel:${athlete.phone}`} className="text-blue-600 hover:underline">
                        {athlete.phone}
                      </a>
                    </div>
                  )}
                  {athlete.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">{athlete.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Wrestling Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="h-5 w-5 text-[#002147]" />
                    Wrestling Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">High School</Label>
                    <p className="font-medium text-gray-900">{athlete.highschool}</p>
                  </div>
                  {athlete.wrestlingClub && (
                    <div>
                      <Label className="text-sm text-gray-600">Club Team</Label>
                      <p className="font-medium text-gray-900">{athlete.wrestlingClub}</p>
                    </div>
                  )}
                  {athlete.careerRecord && (
                    <div>
                      <Label className="text-sm text-gray-600">Career Record</Label>
                      <p className="font-medium text-gray-900">{athlete.careerRecord}</p>
                    </div>
                  )}
                  {athlete.highlight_video_url && (
                    <div>
                      <Label className="text-sm text-gray-600">Highlight Video</Label>
                      <a 
                        href={athlete.highlight_video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Highlights →
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bio */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-[#002147]" />
                    Bio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{athlete.bio || "No bio available"}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* RECRUITING STATUS TAB */}
          <TabsContent value="recruiting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[#002147]" />
                    Recruiting Milestones
                  </span>
                  <Button 
                    onClick={saveMilestones} 
                    disabled={saving}
                    className="bg-[#BC0B03] hover:bg-[#9a0902]"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* First Contact */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    📧 First Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={milestones.first_contact_date}
                        onChange={(e) => setMilestones({ ...milestones, first_contact_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Method</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={milestones.first_contact_method}
                        onChange={(e) => setMilestones({ ...milestones, first_contact_method: e.target.value })}
                      >
                        <option value="">Select method</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone Call</option>
                        <option value="text">Text Message</option>
                        <option value="in-person">In-Person</option>
                        <option value="camp">At Camp/Tournament</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Application */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    📝 Application Status
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="has_applied"
                        checked={milestones.has_applied}
                        onCheckedChange={(checked) => setMilestones({ ...milestones, has_applied: checked as boolean })}
                      />
                      <Label htmlFor="has_applied" className="font-medium cursor-pointer">
                        Athlete has applied to our institution
                      </Label>
                    </div>
                    {milestones.has_applied && (
                      <div className="ml-7">
                        <Label>Application Date</Label>
                        <Input
                          type="date"
                          value={milestones.applied_date}
                          onChange={(e) => setMilestones({ ...milestones, applied_date: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Campus Visits */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    🏫 Campus Visits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Unofficial Visit Date</Label>
                      <Input
                        type="date"
                        value={milestones.campus_visit_date}
                        onChange={(e) => setMilestones({ ...milestones, campus_visit_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Official Visit Date</Label>
                      <Input
                        type="date"
                        value={milestones.official_visit_date}
                        onChange={(e) => setMilestones({ ...milestones, official_visit_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Package */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    💰 Financial Aid Package
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="financial_package_sent"
                        checked={milestones.financial_package_sent}
                        onCheckedChange={(checked) => setMilestones({ ...milestones, financial_package_sent: checked as boolean })}
                      />
                      <Label htmlFor="financial_package_sent" className="font-medium cursor-pointer">
                        Financial aid package has been sent
                      </Label>
                    </div>
                    {milestones.financial_package_sent && (
                      <div className="ml-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Package Sent Date</Label>
                          <Input
                            type="date"
                            value={milestones.package_sent_date}
                            onChange={(e) => setMilestones({ ...milestones, package_sent_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Total Package Amount ($)</Label>
                          <Input
                            type="number"
                            placeholder="25000"
                            value={milestones.package_amount}
                            onChange={(e) => setMilestones({ ...milestones, package_amount: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Offer */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    🎯 Offer Status
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="offer_extended"
                        checked={milestones.offer_extended}
                        onCheckedChange={(checked) => setMilestones({ ...milestones, offer_extended: checked as boolean })}
                      />
                      <Label htmlFor="offer_extended" className="font-medium cursor-pointer">
                        Roster spot offered
                      </Label>
                    </div>
                    {milestones.offer_extended && (
                      <div className="ml-7 space-y-4">
                        <div>
                          <Label>Offer Date</Label>
                          <Input
                            type="date"
                            value={milestones.offer_date}
                            onChange={(e) => setMilestones({ ...milestones, offer_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Offer Details</Label>
                          <Textarea
                            placeholder="Scholarship amount, roster guarantees, etc."
                            value={milestones.offer_details}
                            onChange={(e) => setMilestones({ ...milestones, offer_details: e.target.value })}
                            rows={3}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Commitment */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    ✅ Commitment
                  </h3>
                  <div>
                    <Label>Commitment Date</Label>
                    <Input
                      type="date"
                      value={milestones.committed_date}
                      onChange={(e) => setMilestones({ ...milestones, committed_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* NLI Signing */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    ✍️ National Letter of Intent
                  </h3>
                  <div>
                    <Label>NLI Signing Date</Label>
                    <Input
                      type="date"
                      value={milestones.nli_signed_date}
                      onChange={(e) => setMilestones({ ...milestones, nli_signed_date: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FINANCIAL AID TAB */}
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[#002147]" />
                  Financial Aid Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Expected Family Contribution (EFC)</Label>
                    <p className="text-lg font-semibold text-gray-900">
                      {athlete.financial_efc ? `$${athlete.financial_efc.toLocaleString()}` : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label>Ability to Pay</Label>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {athlete.ability_to_pay || "Not specified"}
                    </p>
                  </div>
                </div>

                {athlete.financial_aid_needs && (
                  <div>
                    <Label>Financial Aid Needs</Label>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{athlete.financial_aid_needs}</p>
                  </div>
                )}

                {athlete.scholarship_requirements && (
                  <div>
                    <Label>Scholarship Requirements</Label>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{athlete.scholarship_requirements}</p>
                  </div>
                )}

                {athlete.financial_notes && (
                  <div>
                    <Label>Financial Notes</Label>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{athlete.financial_notes}</p>
                  </div>
                )}

                {/* Package Summary */}
                {milestones.financial_package_sent && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                    <p className="font-semibold text-green-900 mb-2">📦 Package Sent</p>
                    {milestones.package_sent_date && (
                      <p className="text-sm text-green-700">
                        Date: {new Date(milestones.package_sent_date).toLocaleDateString()}
                      </p>
                    )}
                    {milestones.package_amount && (
                      <p className="text-sm text-green-700">
                        Amount: ${parseFloat(milestones.package_amount).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTES & ACTIVITY TAB */}
          <TabsContent value="activity" className="space-y-6">
            {/* Recruiting Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#002147]" />
                    Recruiting Notes
                  </span>
                  <Button 
                    onClick={saveMilestones} 
                    disabled={saving}
                    size="sm"
                    className="bg-[#BC0B03] hover:bg-[#9a0902]"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Notes
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add notes about this recruit... strengths, concerns, recruiting strategy, etc."
                  value={milestones.recruiting_notes}
                  onChange={(e) => setMilestones({ ...milestones, recruiting_notes: e.target.value })}
                  rows={8}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Communication Log */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#002147]" />
                  Communication Log
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new communication */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-blue-900">Log New Communication</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Type</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={newCommunication.type}
                        onChange={(e) => setNewCommunication({ ...newCommunication, type: e.target.value })}
                      >
                        <option value="email">Email</option>
                        <option value="phone">Phone Call</option>
                        <option value="text">Text Message</option>
                        <option value="in-person">In-Person Meeting</option>
                        <option value="video">Video Call</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm">Date</Label>
                      <Input
                        type="date"
                        value={newCommunication.date}
                        onChange={(e) => setNewCommunication({ ...newCommunication, date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">Notes</Label>
                    <Textarea
                      placeholder="What was discussed?"
                      value={newCommunication.notes}
                      onChange={(e) => setNewCommunication({ ...newCommunication, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <Button 
                    onClick={addCommunication}
                    size="sm"
                    className="bg-[#002147] hover:bg-[#13294B]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Log Communication
                  </Button>
                </div>

                {/* Communication history */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Communication History</h4>
                  {athlete.communication_log && athlete.communication_log.length > 0 ? (
                    <div className="space-y-2">
                      {athlete.communication_log.map((comm: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="capitalize">
                              {comm.type}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(comm.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comm.notes}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No communication logged yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

