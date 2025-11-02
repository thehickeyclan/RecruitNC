"use client"

import { useState, useEffect, useRef } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, GraduationCap, User, Users, Plus, Save, Phone, Mail, Instagram } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Action {
  id: string
  action_type: string
  action_date: string
  description: string
  outcome: string | null
  follow_up_date: string | null
}

interface AthleteCRMData {
  id: string
  name: string
  graduation_year: number
  weightclass: string
  highschool: string
  photourl: string
  pipeline_stage: string
  last_contacted: string | null

  // Contact info
  athlete_cell: string | null
  athlete_email: string | null
  athlete_instagram: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null

  // Achievement data
  nhsca_2025_placement: string | null
  nhsca_2024_placement: string | null
  nhsca_2023_placement: string | null
  nationally_ranked_wins: string | null
  college_opens_experience: string | null
  careerRecord: string | null

  // Academic data
  academic_gpa: number | null
  academic_sat: number | null
  academic_act: number | null
  academic_interest: string | null
  academic_summary: string | null

  nchsaa_results: Array<{
    year: number
    place: string
    weight_class: string
    classification: string
  }>

  // Social
  socialMedia: any

  // Actions history
  actions: Action[]
}

interface AthleteCRMDrawerProps {
  athleteId: string | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function AthleteCRMDrawer({ athleteId, isOpen, onClose, onUpdate }: AthleteCRMDrawerProps) {
  const [athlete, setAthlete] = useState<AthleteCRMData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [fetchError, setFetchError] = useState<string | null>(null)
  const hasFetchedRef = useRef(false)
  const lastAthleteIdRef = useRef<string | null>(null)

  // Contact form state
  const [contactForm, setContactForm] = useState({
    parent_name: "",
    parent_phone: "",
    parent_email: "",
    athlete_cell: "",
    athlete_email: "",
    athlete_instagram: "",
  })

  // Action form state
  const [actionForm, setActionForm] = useState({
    action_type: "call",
    description: "",
    outcome: "",
    follow_up_date: "",
  })

  useEffect(() => {
    // Reset hasFetched when athleteId changes
    if (athleteId !== lastAthleteIdRef.current) {
      hasFetchedRef.current = false
      lastAthleteIdRef.current = athleteId
    }

    // Fetch data only if drawer is open, we have an athleteId, and haven't fetched yet
    if (athleteId && isOpen && !hasFetchedRef.current) {
      fetchAthleteData()
    }

    // Reset when drawer closes
    if (!isOpen) {
      hasFetchedRef.current = false
      setFetchError(null)
    }
  }, [athleteId, isOpen])

  const fetchAthleteData = async () => {
    if (!athleteId || hasFetchedRef.current) return

    hasFetchedRef.current = true
    setIsLoading(true)
    setFetchError(null)

    try {
      const res = await fetch(`/api/coach/athlete-crm/${athleteId}`)
      if (res.ok) {
        const data = await res.json()
        setAthlete(data)
        setContactForm({
          parent_name: data.parent_name || "",
          parent_phone: data.parent_phone || "",
          parent_email: data.parent_email || "",
          athlete_cell: data.athlete_cell || "",
          athlete_email: data.athlete_email || "",
          athlete_instagram: data.athlete_instagram || "",
        })
      } else {
        setFetchError(`Failed to load athlete data (${res.status})`)
      }
    } catch (error) {
      console.error("Error fetching athlete CRM data:", error)
      setFetchError("Failed to load athlete data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveContact = async () => {
    if (!athleteId) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/coach/athlete-crm/${athleteId}/contact`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      })

      if (res.ok) {
        await fetchAthleteData()
        onUpdate()
      }
    } catch (error) {
      console.error("Error saving contact info:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddAction = async () => {
    if (!athleteId || !actionForm.description.trim()) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/coach/athlete-crm/${athleteId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...actionForm,
          action_date: new Date().toISOString(),
        }),
      })

      if (res.ok) {
        setActionForm({
          action_type: "call",
          description: "",
          outcome: "",
          follow_up_date: "",
        })
        await fetchAthleteData()
        onUpdate()
      }
    } catch (error) {
      console.error("Error adding action:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!athlete && !isLoading && !fetchError) return null

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Recruit Profile</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <p className="text-red-500">{fetchError}</p>
            {/* Updated retry button to reset the ref */}
            <Button
              onClick={() => {
                hasFetchedRef.current = false
                fetchAthleteData()
              }}
            >
              Retry
            </Button>
          </div>
        ) : athlete ? (
          <div className="space-y-6 py-6">
            <div className="flex items-start gap-4 pb-6 border-b">
              <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                {athlete.photourl ? (
                  <Image
                    src={athlete.photourl || "/placeholder.svg"}
                    alt={athlete.name}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <User className="h-12 w-12 text-primary/50" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{athlete.name}</h2>
                <p className="text-muted-foreground mt-1">
                  Class of {athlete.graduation_year} • {athlete.weightclass} lbs
                </p>
                <p className="text-sm text-muted-foreground">{athlete.highschool}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge>{athlete.pipeline_stage}</Badge>
                  {athlete.careerRecord && <Badge variant="outline">{athlete.careerRecord}</Badge>}
                </div>
              </div>
              <Link href={`/unified-profile/${athlete.id}`} target="_blank">
                <Button variant="outline" size="sm">
                  Full Profile
                </Button>
              </Link>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {athlete.athlete_cell && (
                      <a
                        href={`tel:${athlete.athlete_cell}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Phone className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Call Athlete</p>
                          <p className="text-sm text-muted-foreground">{athlete.athlete_cell}</p>
                        </div>
                      </a>
                    )}
                    {athlete.athlete_email && (
                      <a
                        href={`mailto:${athlete.athlete_email}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Mail className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Email Athlete</p>
                          <p className="text-sm text-muted-foreground">{athlete.athlete_email}</p>
                        </div>
                      </a>
                    )}
                    {athlete.athlete_instagram && (
                      <a
                        href={`https://instagram.com/${athlete.athlete_instagram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Instagram className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Instagram</p>
                          <p className="text-sm text-muted-foreground">{athlete.athlete_instagram}</p>
                        </div>
                      </a>
                    )}
                    {!athlete.athlete_cell && !athlete.athlete_email && !athlete.athlete_instagram && (
                      <p className="text-sm text-muted-foreground">
                        No contact info available. Add it in the Contact tab.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    {athlete.careerRecord && (
                      <div>
                        <p className="text-sm text-muted-foreground">Career Record</p>
                        <p className="text-lg font-semibold">{athlete.careerRecord}</p>
                      </div>
                    )}
                    {athlete.academic_gpa && (
                      <div>
                        <p className="text-sm text-muted-foreground">GPA</p>
                        <p className="text-lg font-semibold">{athlete.academic_gpa}</p>
                      </div>
                    )}
                    {athlete.academic_sat && (
                      <div>
                        <p className="text-sm text-muted-foreground">SAT</p>
                        <p className="text-lg font-semibold">{athlete.academic_sat}</p>
                      </div>
                    )}
                    {athlete.academic_act && (
                      <div>
                        <p className="text-sm text-muted-foreground">ACT</p>
                        <p className="text-lg font-semibold">{athlete.academic_act}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {athlete.last_contacted ? (
                      <p className="text-sm text-muted-foreground">
                        Last contacted: {new Date(athlete.last_contacted).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No contact recorded yet</p>
                    )}
                    {athlete.actions.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {athlete.actions.slice(0, 3).map((action) => (
                          <div key={action.id} className="border-l-2 border-primary pl-3 py-1">
                            <p className="text-sm font-medium capitalize">{action.action_type.replace("_", " ")}</p>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(action.action_date).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Athlete Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="athlete_cell">Cell Phone</Label>
                      <Input
                        id="athlete_cell"
                        value={contactForm.athlete_cell}
                        onChange={(e) => setContactForm({ ...contactForm, athlete_cell: e.target.value })}
                        placeholder="(555) 987-6543"
                      />
                    </div>
                    <div>
                      <Label htmlFor="athlete_email">Email</Label>
                      <Input
                        id="athlete_email"
                        type="email"
                        value={contactForm.athlete_email}
                        onChange={(e) => setContactForm({ ...contactForm, athlete_email: e.target.value })}
                        placeholder="athlete@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="athlete_instagram">Instagram Handle</Label>
                      <Input
                        id="athlete_instagram"
                        value={contactForm.athlete_instagram}
                        onChange={(e) => setContactForm({ ...contactForm, athlete_instagram: e.target.value })}
                        placeholder="@username"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Parent/Guardian Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="parent_name">Parent Name</Label>
                      <Input
                        id="parent_name"
                        value={contactForm.parent_name}
                        onChange={(e) => setContactForm({ ...contactForm, parent_name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <Label htmlFor="parent_phone">Parent Phone</Label>
                      <Input
                        id="parent_phone"
                        value={contactForm.parent_phone}
                        onChange={(e) => setContactForm({ ...contactForm, parent_phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="parent_email">Parent Email</Label>
                      <Input
                        id="parent_email"
                        type="email"
                        value={contactForm.parent_email}
                        onChange={(e) => setContactForm({ ...contactForm, parent_email: e.target.value })}
                        placeholder="parent@email.com"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={handleSaveContact} disabled={isSaving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Contact Info"}
                </Button>
              </TabsContent>

              <TabsContent value="achievements" className="space-y-4">
                {athlete.nchsaa_results && athlete.nchsaa_results.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-600" />
                        NCHSAA State Championships
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {athlete.nchsaa_results.map((result, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                            <div>
                              <p className="font-semibold">
                                {result.year} - {result.classification}
                              </p>
                              <p className="text-sm text-muted-foreground">{result.weight_class} lbs</p>
                            </div>
                            <Badge variant="secondary" className="text-lg font-bold">
                              {result.place}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      National Tournament Placements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {athlete.nhsca_2025_placement && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">NHSCA 2025</span>
                        <Badge variant="outline">{athlete.nhsca_2025_placement}</Badge>
                      </div>
                    )}
                    {athlete.nhsca_2024_placement && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">NHSCA 2024</span>
                        <Badge variant="outline">{athlete.nhsca_2024_placement}</Badge>
                      </div>
                    )}
                    {athlete.nhsca_2023_placement && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">NHSCA 2023</span>
                        <Badge variant="outline">{athlete.nhsca_2023_placement}</Badge>
                      </div>
                    )}
                    {athlete.college_opens_experience && (
                      <div>
                        <span className="text-sm font-medium block mb-1">College Opens</span>
                        <p className="text-sm text-muted-foreground">{athlete.college_opens_experience}</p>
                      </div>
                    )}
                    {athlete.nationally_ranked_wins && (
                      <div>
                        <span className="text-sm font-medium block mb-1">Ranked Wins</span>
                        <p className="text-sm text-muted-foreground">{athlete.nationally_ranked_wins}</p>
                      </div>
                    )}
                    {!athlete.nhsca_2025_placement &&
                      !athlete.nhsca_2024_placement &&
                      !athlete.nhsca_2023_placement &&
                      !athlete.college_opens_experience &&
                      !athlete.nationally_ranked_wins && (
                        <p className="text-sm text-muted-foreground">No national tournament data available</p>
                      )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Academics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      {athlete.academic_gpa && (
                        <div>
                          <p className="text-xs text-muted-foreground">GPA</p>
                          <p className="text-lg font-semibold">{athlete.academic_gpa}</p>
                        </div>
                      )}
                      {athlete.academic_sat && (
                        <div>
                          <p className="text-xs text-muted-foreground">SAT</p>
                          <p className="text-lg font-semibold">{athlete.academic_sat}</p>
                        </div>
                      )}
                      {athlete.academic_act && (
                        <div>
                          <p className="text-xs text-muted-foreground">ACT</p>
                          <p className="text-lg font-semibold">{athlete.academic_act}</p>
                        </div>
                      )}
                    </div>
                    {athlete.academic_interest && (
                      <div>
                        <p className="text-sm font-medium">Academic Interest</p>
                        <p className="text-sm text-muted-foreground">{athlete.academic_interest}</p>
                      </div>
                    )}
                    {athlete.academic_summary && (
                      <div>
                        <p className="text-sm font-medium">Summary</p>
                        <p className="text-sm text-muted-foreground">{athlete.academic_summary}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Log New Action</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="action_type">Action Type</Label>
                      <Select
                        value={actionForm.action_type}
                        onValueChange={(value) => setActionForm({ ...actionForm, action_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Phone Call</SelectItem>
                          <SelectItem value="text">Text Message</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="visit">Campus Visit</SelectItem>
                          <SelectItem value="event">Event/Tournament</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={actionForm.description}
                        onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                        placeholder="What happened during this interaction?"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="outcome">Outcome (Optional)</Label>
                      <Input
                        id="outcome"
                        value={actionForm.outcome}
                        onChange={(e) => setActionForm({ ...actionForm, outcome: e.target.value })}
                        placeholder="e.g., Interested in visit, needs more info"
                      />
                    </div>
                    <div>
                      <Label htmlFor="follow_up_date">Follow-up Date (Optional)</Label>
                      <Input
                        id="follow_up_date"
                        type="date"
                        value={actionForm.follow_up_date}
                        onChange={(e) => setActionForm({ ...actionForm, follow_up_date: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={handleAddAction}
                      disabled={isSaving || !actionForm.description.trim()}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {isSaving ? "Adding..." : "Add Action"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Action History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {athlete.actions.length === 0 ? (
                      <p className="text-sm text-gray-400">No actions recorded yet</p>
                    ) : (
                      <div className="space-y-4">
                        {athlete.actions.map((action) => (
                          <div key={action.id} className="border-l-4 border-gray-200 pl-4 py-2">
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-medium capitalize">{action.action_type.replace("_", " ")}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(action.action_date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-1">{action.description}</p>
                            {action.outcome && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Outcome:</span> {action.outcome}
                              </p>
                            )}
                            {action.follow_up_date && (
                              <p className="text-xs text-blue-600 mt-1">
                                Follow-up: {new Date(action.follow_up_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
