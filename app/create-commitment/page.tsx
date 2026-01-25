"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, ImageIcon } from "lucide-react"
import ModernMediaManager from "@/components/modern-media-manager"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { SmartWrestlingClubInput } from "@/components/smart-wrestling-club-input"
import { AuthGuard } from "@/components/auth-guard"

interface AthleteFormData {
  name: string
  highschool: string
  college: string
  division: string
  weightclass: string
  graduationyear: number
  commitmentdate: string
  wrestlingclub: string
  photourl: string
  achievements: string[]
  bio: string
  location: string
  gender: string
  featured: boolean
}

export default function CreateCommitmentPage() {
  const [formData, setFormData] = useState<AthleteFormData>({
    name: "",
    highschool: "",
    college: "",
    division: "",
    weightclass: "",
    graduationyear: new Date().getFullYear() + 1,
    commitmentdate: new Date().toISOString().split("T")[0],
    wrestlingclub: "",
    photourl: "",
    achievements: [],
    bio: "",
    location: "",
    gender: "Male",
    featured: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMediaManager, setShowMediaManager] = useState(false)
  const { toast } = useToast()

  const handleInputChange = (field: keyof AthleteFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAchievementsChange = (value: string) => {
    const achievements = value.split("\n").filter((achievement) => achievement.trim() !== "")
    setFormData((prev) => ({
      ...prev,
      achievements,
    }))
  }

  const handlePhotoSelect = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      photourl: url,
    }))
    setShowMediaManager(false)
    toast({
      title: "Photo Selected",
      description: "Athlete photo has been selected successfully",
    })
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name || !formData.highschool || !formData.college || !formData.division || !formData.weightclass) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/athletes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create athlete")
      }

      const result = await response.json()

      toast({
        title: "Success!",
        description: "Commitment card created successfully",
      })

      // Reset form
      setFormData({
        name: "",
        highschool: "",
        college: "",
        division: "",
        weightclass: "",
        graduationyear: new Date().getFullYear() + 1,
        commitmentdate: new Date().toISOString().split("T")[0],
        wrestlingclub: "",
        photourl: "",
        achievements: [],
        bio: "",
        location: "",
        gender: "Male",
        featured: false,
      })
    } catch (error) {
      console.error("Error creating athlete:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create commitment card",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Commitment Card</h1>
          <p className="text-gray-600">Build a professional commitment announcement</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="photo">Photo</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Athlete Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Enter athlete's full name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="highschool">High School *</Label>
                      <Input
                        id="highschool"
                        value={formData.highschool}
                        onChange={(e) => handleInputChange("highschool", e.target.value)}
                        placeholder="Enter high school name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="college">College *</Label>
                      <Input
                        id="college"
                        value={formData.college}
                        onChange={(e) => handleInputChange("college", e.target.value)}
                        placeholder="Enter college name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="division">Division *</Label>
                        <Select
                          value={formData.division}
                          onValueChange={(value) => handleInputChange("division", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select division" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NCAA D1">NCAA D1</SelectItem>
                            <SelectItem value="NCAA D2">NCAA D2</SelectItem>
                            <SelectItem value="NCAA D3">NCAA D3</SelectItem>
                            <SelectItem value="NAIA">NAIA</SelectItem>
                            <SelectItem value="NJCAA">NJCAA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="weightclass">Weight Class *</Label>
                        <Input
                          id="weightclass"
                          value={formData.weightclass}
                          onChange={(e) => handleInputChange("weightclass", e.target.value)}
                          placeholder="e.g., 165"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="graduationyear">Graduation Year</Label>
                        <Select
                          value={formData.graduationyear.toString()}
                          onValueChange={(value) => handleInputChange("graduationyear", Number.parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 6 }, (_, i) => {
                              const year = new Date().getFullYear() + i
                              return (
                                <SelectItem key={year} value={year.toString()}>
                                  Class of {year}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="commitmentdate">Commitment Date</Label>
                        <Input
                          id="commitmentdate"
                          type="date"
                          value={formData.commitmentdate}
                          onChange={(e) => handleInputChange("commitmentdate", e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="photo" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Athlete Photo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.photourl ? (
                      <div className="space-y-4">
                        <div className="relative w-32 h-32 mx-auto">
                          <img
                            src={formData.photourl || "/placeholder.svg"}
                            alt="Selected athlete photo"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        <div className="text-center">
                          <Button variant="outline" onClick={() => handleInputChange("photourl", "")} className="mr-2">
                            Remove Photo
                          </Button>
                          <Dialog open={showMediaManager} onOpenChange={setShowMediaManager}>
                            <DialogTrigger asChild>
                              <Button variant="outline">
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Change Photo
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-6xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>Select Athlete Photo</DialogTitle>
                              </DialogHeader>
                              <ModernMediaManager onImageSelect={handlePhotoSelect} />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-600 mb-4">No photo selected</p>
                          <Dialog open={showMediaManager} onOpenChange={setShowMediaManager}>
                            <DialogTrigger asChild>
                              <Button>
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Browse Media Library
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-6xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>Select Athlete Photo</DialogTitle>
                              </DialogHeader>
                              <ModernMediaManager onImageSelect={handlePhotoSelect} />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SmartWrestlingClubInput
                      value={formData.wrestlingclub}
                      onChange={(value) => handleInputChange("wrestlingclub", value)}
                      placeholder="Enter wrestling club (e.g., RAW, Raleigh Area Wrestling, etc.)"
                    />

                    <div>
                      <Label htmlFor="achievements">Achievements (one per line)</Label>
                      <Textarea
                        id="achievements"
                        value={
                          Array.isArray(formData.achievements)
                            ? formData.achievements.join("\n")
                            : formData.achievements || ""
                        }
                        onChange={(e) => handleAchievementsChange(e.target.value)}
                        placeholder="State Champion&#10;Regional Qualifier&#10;Conference Champion"
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => handleInputChange("bio", e.target.value)}
                        placeholder="Brief athlete biography..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        placeholder="City, State"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Submit Button */}
            <Card>
              <CardContent className="pt-6">
                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full" size="lg">
                  {isSubmitting ? "Creating..." : "Create Commitment Card"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div className="w-80">
                    <ProfessionalCommitmentCard
                      athlete={{
                        id: "preview",
                        name: formData.name || "Athlete Name",
                        highschool: formData.highschool || "High School",
                        college: formData.college || "College",
                        division: formData.division || "Division",
                        weightclass: formData.weightclass || "Weight",
                        graduationyear: formData.graduationyear,
                        commitmentdate: formData.commitmentdate,
                        photourl: formData.photourl || "/placeholder.svg?height=400&width=300&text=Athlete+Photo",
                        achievements: formData.achievements,
                        bio: formData.bio,
                        location: formData.location,
                        wrestlingclub: formData.wrestlingclub,
                        gender: formData.gender,
                        featured: formData.featured,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Info Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{formData.name || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">High School:</span>
                  <span className="font-medium">{formData.highschool || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">College:</span>
                  <span className="font-medium">{formData.college || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Division:</span>
                  <span className="font-medium">{formData.division || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Weight:</span>
                  <span className="font-medium">{formData.weightclass || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wrestling Club:</span>
                  <span className="font-medium">{formData.wrestlingclub || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Class:</span>
                  <span className="font-medium">Class of {formData.graduationyear}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  )
}
