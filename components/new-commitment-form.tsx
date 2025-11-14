"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Upload, X, ImageIcon } from "lucide-react"
import Image from "next/image"
import { put } from "@vercel/blob"

export function NewCommitmentForm() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    highSchool: "",
    college: "",
    division: "",
    weightClass: "",
    graduationYear: new Date().getFullYear(),
    commitmentDate: new Date().toISOString().split("T")[0],
    achievements: "",
    gender: "Male",
    commitmentAnnouncement: "",
    instagramHandle: "",
  })

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submit New Commitment</CardTitle>
          <CardDescription>Please sign in to submit a new commitment.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.push("/auth/signin")} className="bg-[#c8102e] hover:bg-[#a50d25] text-white">
            Sign In to Continue
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        })
        return
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        })
        return
      }

      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const removeImage = () => {
    setImageFile(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadProgress(10)

      // Generate a unique filename
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`
      const contentType = file.type

      setUploadProgress(30)

      // Upload to Vercel Blob
      const blob = await put(fileName, file, {
        contentType,
        access: "public",
      })

      setUploadProgress(100)

      return blob.url
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your image. Please try again.",
        variant: "destructive",
      })
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "highSchool",
      "college",
      "division",
      "weightClass",
      "graduationYear",
    ]
    const missingFields = requiredFields.filter((field) => !formData[field as keyof typeof formData])

    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please fill in all required fields: ${missingFields.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    // Validate commitment announcement URL format
    if (formData.commitmentAnnouncement && !isValidUrl(formData.commitmentAnnouncement)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL for the commitment announcement",
        variant: "destructive",
      })
      return
    }

    // Validate Instagram handle format
    if (formData.instagramHandle && !isValidInstagramHandle(formData.instagramHandle)) {
      toast({
        title: "Invalid Instagram Handle",
        description: "Please enter a valid Instagram handle (e.g., @username or username)",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Upload image if provided
      let photoUrl = null
      if (imageFile) {
        photoUrl = await uploadImage(imageFile)
        if (!photoUrl) {
          setIsSubmitting(false)
          return
        }
      }

      // Create the athlete data
      const athleteData = {
        name: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        highSchool: formData.highSchool,
        college: formData.college,
        division: formData.division,
        weightClass: formData.weightClass,
        graduationYear: Number(formData.graduationYear),
        commitmentDate: formData.commitmentDate,
        achievements: formData.achievements ? formData.achievements.split(",").map((a) => a.trim()) : [],
        gender: formData.gender,
        photoUrl: photoUrl,
        commitmentAnnouncement: formData.commitmentAnnouncement,
        instagramHandle: formData.instagramHandle,
      }

      // Submit to Supabase
      const { error } = await supabase.from("edit_requests").insert({
        user_id: user.id,
        request_type: "new",
        status: "pending",
        request_data: athleteData,
      })

      if (error) throw error

      toast({
        title: "Commitment Submitted",
        description: "Your commitment submission has been received and will be reviewed.",
      })

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        highSchool: "",
        college: "",
        division: "",
        weightClass: "",
        graduationYear: new Date().getFullYear(),
        commitmentDate: new Date().toISOString().split("T")[0],
        achievements: "",
        gender: "Male",
        commitmentAnnouncement: "",
        instagramHandle: "",
      })
      removeImage()
    } catch (error) {
      console.error("Error submitting new commitment:", error)
      toast({
        title: "Error",
        description: "There was an error submitting your commitment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  // Validation helper functions
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const isValidInstagramHandle = (handle: string): boolean => {
    // Remove @ if present and validate format
    const cleanHandle = handle.replace(/^@/, "")
    const instagramRegex = /^[a-zA-Z0-9._]{1,30}$/
    return instagramRegex.test(cleanHandle)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit New Commitment</CardTitle>
        <CardDescription>Submit a new college commitment that is not currently in our database</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">
                Gender <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="highSchool">
                High School <span className="text-red-500">*</span>
              </Label>
              <Input id="highSchool" name="highSchool" value={formData.highSchool} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="college">
                College <span className="text-red-500">*</span>
              </Label>
              <Input id="college" name="college" value={formData.college} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="division">
                Division <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.division} onValueChange={(value) => handleSelectChange("division", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Division I">NCAA Division I</SelectItem>
                  <SelectItem value="Division II">NCAA Division II</SelectItem>
                  <SelectItem value="Division III">NCAA Division III</SelectItem>
                  <SelectItem value="NAIA">NAIA</SelectItem>
                  <SelectItem value="NJCAA">NJCAA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weightClass">
                Weight Class <span className="text-red-500">*</span>
              </Label>
              <Input
                id="weightClass"
                name="weightClass"
                value={formData.weightClass}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="graduationYear">
                Graduation Year <span className="text-red-500">*</span>
              </Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="commitmentDate">
                Commitment Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="commitmentDate"
                name="commitmentDate"
                type="date"
                value={formData.commitmentDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="achievements">Achievements (comma-separated)</Label>
            <Textarea
              id="achievements"
              name="achievements"
              value={formData.achievements}
              onChange={handleChange}
              placeholder="e.g. State Champion, All-American, Regional Champion"
              rows={3}
            />
          </div>

          {/* Commitment Announcement Field */}
          <div className="space-y-2">
            <Label htmlFor="commitmentAnnouncement">Commitment Announcement Link</Label>
            <Input
              id="commitmentAnnouncement"
              name="commitmentAnnouncement"
              type="url"
              value={formData.commitmentAnnouncement}
              onChange={handleChange}
              placeholder="https://twitter.com/... or https://instagram.com/..."
            />
            <p className="text-xs text-gray-500">Optional: Link to social media post or article about the commitment</p>
          </div>

          {/* Instagram Handle Field */}
          <div className="space-y-2">
            <Label htmlFor="instagramHandle">Instagram Handle</Label>
            <Input
              id="instagramHandle"
              name="instagramHandle"
              value={formData.instagramHandle}
              onChange={handleChange}
              placeholder="@username or username"
            />
            <p className="text-xs text-gray-500">Optional: Athlete's Instagram handle for verification</p>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="athleteImage">Athlete Photo</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {imagePreview ? (
                <div className="relative">
                  <div className="relative h-48 w-full">
                    <Image
                      src={imagePreview || "/placeholder.svg"}
                      alt="Athlete preview"
                      fill
                      className="object-contain rounded-md"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-2">Upload athlete photo (optional)</p>
                  <p className="text-xs text-gray-400 mb-4">PNG, JPG or JPEG (max. 5MB)</p>
                  <label htmlFor="athleteImage">
                    <div className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <Upload className="h-4 w-4 inline mr-1" />
                      Select Image
                    </div>
                    <input
                      id="athleteImage"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.push("/")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-[#c8102e] hover:bg-[#a50d25] text-white">
            {isSubmitting ? "Submitting..." : "Submit Commitment"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
