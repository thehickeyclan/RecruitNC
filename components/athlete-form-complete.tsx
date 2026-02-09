"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/image-upload"
import { useToast } from "@/components/ui/use-toast"
import { EntityLogo } from "@/components/entity-logo"
import { mockColleges, mockHighSchools } from "@/lib/mock-data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import type { Athlete } from "@/types/athlete"
import Image from "next/image"
interface AthleteFormCompleteProps {
  onSubmit: (data: Partial<Athlete>) => Promise<void>
  initialData?: Partial<Athlete>
}

export function AthleteFormComplete({ onSubmit, initialData }: AthleteFormCompleteProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("personal")
  const [formData, setFormData] = useState<Partial<Athlete>>({
    name: initialData?.name || "",
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    photoUrl: initialData?.photoUrl || "",
    commitmentPhotoUrl: initialData?.commitmentPhotoUrl || "",

    // Academic & Personal Info
    graduationYear: initialData?.graduationYear || new Date().getFullYear() + 1,
    gender: initialData?.gender || "Male",
    weightClass: initialData?.weightClass || "",
    weight: initialData?.weight || undefined,

    // School & Club Info
    highSchool: initialData?.highSchool || "",
    highSchoolLogoUrl: initialData?.highSchoolLogoUrl || "",
    wrestlingClub: initialData?.wrestlingClub || "",
    wrestlingClubLogoUrl: initialData?.wrestlingClubLogoUrl || "",
    ncUnitedTeam: initialData?.ncUnitedTeam || "none",

    // College Commitment
    college: initialData?.college || "",
    collegeLogoUrl: initialData?.collegeLogoUrl || "",
    commitmentDate: initialData?.commitmentDate || "",

    // Achievements & Stats
    achievements: initialData?.achievements || [],
    careerRecord: initialData?.careerRecord || "",
    rankings: initialData?.rankings || { state: undefined, national: undefined },

    // Additional Info
    location: initialData?.location || "",
    bio: initialData?.bio || "",
    socialMedia: initialData?.socialMedia || {},
    contactEmail: initialData?.contactEmail || "",

    // System fields
    featured: initialData?.featured || false,
  })
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleImageUpload = (field: string, url: string) => {
    setFormData((prev) => ({ ...prev, [field]: url }))
  }

  const handleAchievementChange = (index: number, value: string) => {
    const newAchievements = [...(formData.achievements || [])]
    newAchievements[index] = value
    setFormData((prev) => ({ ...prev, achievements: newAchievements }))
  }

  const addAchievement = () => {
    setFormData((prev) => ({
      ...prev,
      achievements: [...(prev.achievements || []), ""],
    }))
  }

  const removeAchievement = (index: number) => {
    const newAchievements = [...(formData.achievements || [])]
    newAchievements.splice(index, 1)
    setFormData((prev) => ({ ...prev, achievements: newAchievements }))
  }

  const doSubmit = async () => {
    if (formData.firstName && formData.lastName && !formData.name) {
      formData.name = `${formData.firstName} ${formData.lastName}`
    }
    const filteredAchievements = (formData.achievements || []).filter((a) => a.trim() !== "")
    await onSubmit({
      ...formData,
      achievements: filteredAchievements,
      graduationYear: Number(formData.graduationYear),
      weight: formData.weight ? Number(formData.weight) : undefined,
      rankings: {
        state: formData.rankings?.state ? Number(formData.rankings.state) : undefined,
        national: formData.rankings?.national ? Number(formData.rankings.national) : undefined,
      },
    })
    toast({
      title: initialData?.id ? "Athlete updated" : "Athlete added",
      description: `${formData.name} has been ${initialData?.id ? "updated" : "added"} successfully`,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await doSubmit()
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData?.id ? "Edit" : "Add"} Athlete</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="school">School & Club</TabsTrigger>
              <TabsTrigger value="college">College</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="media">Media & Contact</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="pt-6">
            <TabsContent value="personal" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName || ""}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName || ""}
                    onChange={handleChange}
                    required
                  />
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="graduationYear">Graduation Year</Label>
                  <Input
                    id="graduationYear"
                    name="graduationYear"
                    type="number"
                    min="2000"
                    max="2050"
                    value={formData.graduationYear || ""}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weightClass">Weight Class</Label>
                  <Select
                    value={formData.weightClass || ""}
                    onValueChange={(value) => handleSelectChange("weightClass", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select weight class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="men-hs-header" disabled className="font-bold">
                        Men's High School
                      </SelectItem>
                      <SelectItem value="106">106 lbs</SelectItem>
                      <SelectItem value="113">113 lbs</SelectItem>
                      <SelectItem value="120">120 lbs</SelectItem>
                      <SelectItem value="126">126 lbs</SelectItem>
                      <SelectItem value="132">132 lbs</SelectItem>
                      <SelectItem value="138">138 lbs</SelectItem>
                      <SelectItem value="144">144 lbs</SelectItem>
                      <SelectItem value="150">150 lbs</SelectItem>
                      <SelectItem value="157">157 lbs</SelectItem>
                      <SelectItem value="165">165 lbs</SelectItem>
                      <SelectItem value="175">175 lbs</SelectItem>
                      <SelectItem value="190">190 lbs</SelectItem>
                      <SelectItem value="215">215 lbs</SelectItem>
                      <SelectItem value="285">285 lbs</SelectItem>

                      <SelectItem value="men-college-header" disabled className="font-bold mt-2">
                        Men's College
                      </SelectItem>
                      <SelectItem value="125">125 lbs (College)</SelectItem>
                      <SelectItem value="133">133 lbs (College)</SelectItem>
                      <SelectItem value="141">141 lbs (College)</SelectItem>
                      <SelectItem value="149">149 lbs (College)</SelectItem>
                      <SelectItem value="157">157 lbs (College)</SelectItem>
                      <SelectItem value="165">165 lbs (College)</SelectItem>
                      <SelectItem value="174">174 lbs (College)</SelectItem>
                      <SelectItem value="184">184 lbs (College)</SelectItem>
                      <SelectItem value="197">197 lbs (College)</SelectItem>
                      <SelectItem value="285">285 lbs (College)</SelectItem>

                      <SelectItem value="women-hs-header" disabled className="font-bold mt-2">
                        Women's High School
                      </SelectItem>
                      <SelectItem value="100">100 lbs</SelectItem>
                      <SelectItem value="107">107 lbs</SelectItem>
                      <SelectItem value="114">114 lbs</SelectItem>
                      <SelectItem value="120">120 lbs</SelectItem>
                      <SelectItem value="126">126 lbs</SelectItem>
                      <SelectItem value="132">132 lbs</SelectItem>
                      <SelectItem value="138">138 lbs</SelectItem>
                      <SelectItem value="145">145 lbs</SelectItem>
                      <SelectItem value="152">152 lbs</SelectItem>
                      <SelectItem value="165">165 lbs</SelectItem>
                      <SelectItem value="185">185 lbs</SelectItem>
                      <SelectItem value="235">235 lbs</SelectItem>
                      <SelectItem value="women-college-header" disabled className="font-bold mt-2">
                        Women's College
                      </SelectItem>
                      <SelectItem value="103">103 lbs (College)</SelectItem>
                      <SelectItem value="110">110 lbs (College)</SelectItem>
                      <SelectItem value="117">117 lbs (College)</SelectItem>
                      <SelectItem value="124">124 lbs (College)</SelectItem>
                      <SelectItem value="131">131 lbs (College)</SelectItem>
                      <SelectItem value="138">138 lbs (College)</SelectItem>
                      <SelectItem value="145">145 lbs (College)</SelectItem>
                      <SelectItem value="160">160 lbs (College)</SelectItem>
                      <SelectItem value="180">180 lbs (College)</SelectItem>
                      <SelectItem value="207">207 lbs (College)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Exact Weight (optional)</Label>
                  <Input
                    id="weight"
                    name="weight"
                    type="number"
                    min="0"
                    max="500"
                    value={formData.weight || ""}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location || ""}
                    onChange={handleChange}
                    placeholder="City, NC"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio/Description (optional)</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio || ""}
                  onChange={handleChange}
                  placeholder="Brief description about the athlete"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Profile Photo</Label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="w-full max-w-[250px]">
                    <ImageUpload
                      category="athlete"
                      onUploadComplete={(url) => handleImageUpload("photoUrl", url)}
                      existingImageUrl={formData.photoUrl}
                      entityName={formData.name || `${formData.firstName}-${formData.lastName}`}
                      aspectRatio="portrait"
                    />
                  </div>
                  {formData.photoUrl && (
                    <div className="flex items-center">
                      <p className="text-sm text-muted-foreground">
                        Current image: {formData.photoUrl.split("/").pop()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="school" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="highSchool">High School</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formData.highSchool || ""}
                      onValueChange={(value) => handleSelectChange("highSchool", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select high school" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockHighSchools.map((school) => (
                          <SelectItem key={school.name} value={school.name}>
                            {school.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="other">Other (Type manually)</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.highSchool && <EntityLogo category="highschool" name={formData.highSchool} size="sm" />}
                  </div>
                  {formData.highSchool === "other" && (
                    <Input
                      id="highSchoolCustom"
                      name="highSchool"
                      value=""
                      onChange={handleChange}
                      placeholder="Enter high school name"
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wrestlingClub">Wrestling Club</Label>
                  <Input
                    id="wrestlingClub"
                    name="wrestlingClub"
                    value={formData.wrestlingClub || ""}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-4 border rounded-lg p-4 mt-6">
                <h3 className="font-medium text-lg">NC United Team Membership</h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative h-24 w-24 rounded-full overflow-hidden">
                      <Image src="/nc-united-main-logo.png" alt="NC United Main Logo" fill className="object-contain" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="team-none"
                        checked={formData.ncUnitedTeam === "none"}
                        onCheckedChange={() => handleSelectChange("ncUnitedTeam", "none")}
                      />
                      <Label htmlFor="team-none">Not a team member</Label>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="relative h-24 w-24 rounded-full overflow-hidden">
                      <Image
                        src="https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/CqLaWvzmjRuOdctL8VovY-NC%20United.png"
                        alt="NC United Blue Team Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="team-blue"
                        checked={formData.ncUnitedTeam === "blue" || formData.ncUnitedTeam === "both"}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            if (formData.ncUnitedTeam === "gold") {
                              handleSelectChange("ncUnitedTeam", "both")
                            } else {
                              handleSelectChange("ncUnitedTeam", "blue")
                            }
                          } else {
                            if (formData.ncUnitedTeam === "both") {
                              handleSelectChange("ncUnitedTeam", "gold")
                            } else {
                              handleSelectChange("ncUnitedTeam", "none")
                            }
                          }
                        }}
                      />
                      <Label htmlFor="team-blue">Blue Team (Men)</Label>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="relative h-24 w-24 rounded-full overflow-hidden">
                      <Image
                        src="/nc-united-gold-logo.png"
                        alt="NC United Gold Team Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="team-gold"
                        checked={formData.ncUnitedTeam === "gold" || formData.ncUnitedTeam === "both"}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            if (formData.ncUnitedTeam === "blue") {
                              handleSelectChange("ncUnitedTeam", "both")
                            } else {
                              handleSelectChange("ncUnitedTeam", "gold")
                            }
                          } else {
                            if (formData.ncUnitedTeam === "both") {
                              handleSelectChange("ncUnitedTeam", "blue")
                            } else {
                              handleSelectChange("ncUnitedTeam", "none")
                            }
                          }
                        }}
                      />
                      <Label htmlFor="team-gold">Gold Team (Women)</Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="college" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="college">College</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formData.college || ""}
                      onValueChange={(value) => handleSelectChange("college", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select college" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockColleges.map((college) => (
                          <SelectItem key={college.name} value={college.name}>
                            {college.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="other">Other (Type manually)</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.college && <EntityLogo category="college" name={formData.college} size="sm" />}
                  </div>
                  {formData.college === "other" && (
                    <Input
                      id="collegeCustom"
                      name="college"
                      value=""
                      onChange={handleChange}
                      placeholder="Enter college name"
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commitmentDate">Commitment Date</Label>
                  <Input
                    id="commitmentDate"
                    name="commitmentDate"
                    type="date"
                    value={formData.commitmentDate || ""}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Commitment Announcement Photo</Label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="w-full max-w-[250px]">
                    <ImageUpload
                      category="athlete"
                      onUploadComplete={(url) => handleImageUpload("commitmentPhotoUrl", url)}
                      existingImageUrl={formData.commitmentPhotoUrl}
                      entityName={`${formData.name || `${formData.firstName}-${formData.lastName}`}-commitment`}
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

            <TabsContent value="achievements" className="space-y-4">
              {/* Achievement content remains the same */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="careerRecord">Career Record</Label>
                  <Input
                    id="careerRecord"
                    name="careerRecord"
                    value={formData.careerRecord || ""}
                    onChange={handleChange}
                    placeholder="e.g., 132-14"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stateRanking">State Ranking</Label>
                  <Input
                    id="stateRanking"
                    name="rankings.state"
                    type="number"
                    min="1"
                    value={formData.rankings?.state || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rankings: { ...prev.rankings, state: e.target.value ? Number(e.target.value) : undefined },
                      }))
                    }
                    placeholder="#1, #2, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationalRanking">National Ranking</Label>
                  <Input
                    id="nationalRanking"
                    name="rankings.national"
                    type="number"
                    min="1"
                    value={formData.rankings?.national || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rankings: { ...prev.rankings, national: e.target.value ? Number(e.target.value) : undefined },
                      }))
                    }
                    placeholder="#1, #2, etc."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Achievements</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addAchievement}>
                    Add Achievement
                  </Button>
                </div>

                <div className="space-y-2">
                  {(formData.achievements || []).map((achievement, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={achievement}
                        onChange={(e) => handleAchievementChange(index, e.target.value)}
                        placeholder="e.g., 2x State Champion"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAchievement(index)}>
                        <span className="sr-only">Remove</span>
                        <span aria-hidden="true">×</span>
                      </Button>
                    </div>
                  ))}

                  {(formData.achievements || []).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No achievements added yet. Click "Add Achievement" to add one.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-4">
              {/* Media content remains the same */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail || ""}
                    onChange={handleChange}
                    placeholder="athlete@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter/X Handle</Label>
                  <Input
                    id="twitter"
                    name="socialMedia.twitter"
                    value={formData.socialMedia?.twitter || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, twitter: e.target.value },
                      }))
                    }
                    placeholder="@username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram Handle</Label>
                  <Input
                    id="instagram"
                    name="socialMedia.instagram"
                    value={formData.socialMedia?.instagram || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, instagram: e.target.value },
                      }))
                    }
                    placeholder="@username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook Profile</Label>
                  <Input
                    id="facebook"
                    name="socialMedia.facebook"
                    value={formData.socialMedia?.facebook || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, facebook: e.target.value },
                      }))
                    }
                    placeholder="URL or username"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Checkbox
                  id="featured"
                  checked={formData.featured || false}
                  onCheckedChange={(checked) => handleCheckboxChange("featured", !!checked)}
                />
                <Label htmlFor="featured">Feature this athlete on the homepage</Label>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>

        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : initialData?.id ? "Update Athlete" : "Add Athlete"}
          </Button>
        </CardFooter>
      </form>

    </Card>
  )
}
