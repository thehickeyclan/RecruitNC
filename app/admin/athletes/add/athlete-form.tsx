"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createAthlete } from "@/services/athlete-service"
import { toast } from "@/components/ui/use-toast"
import { uploadToBlob } from "@/lib/blob-upload"

export default function AthleteForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [achievements, setAchievements] = useState<string[]>([])
  const [newAchievement, setNewAchievement] = useState("")
  const [division, setDivision] = useState("D1")
  const [weightClass, setWeightClass] = useState("")
  const [gender, setGender] = useState<"male" | "female">("male")
  const [collegeWeightClass, setCollegeWeightClass] = useState("")

  const getMensHSWeightClasses = () => [
    "106",
    "113",
    "120",
    "126",
    "132",
    "138",
    "144",
    "150",
    "157",
    "165",
    "175",
    "190",
    "215",
    "285",
  ]

  const getMensCollegeWeightClasses = () => ["125", "133", "141", "149", "157", "165", "174", "184", "197", "285"]

  const getWomensHSWeightClasses = () => ["100", "105", "110", "115", "120", "125", "130", "135", "140", "145", "160", "235"]
  
  const getWomensCollegeWeightClasses = () => ["103", "110", "117", "124", "131", "138", "145", "160", "180", "207"]

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const addAchievement = () => {
    if (newAchievement.trim()) {
      setAchievements([...achievements, newAchievement.trim()])
      setNewAchievement("")
    }
  }

  const removeAchievement = (index: number) => {
    setAchievements(achievements.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)

      // Handle image upload
      let photoUrl = "/diverse-wrestlers.png"
      if (imageFile) {
        try {
          photoUrl = await uploadToBlob(imageFile)
          console.log("Image uploaded successfully:", photoUrl)
        } catch (error) {
          console.error("Error uploading image:", error)
          toast({
            title: "Image Upload Error",
            description: "Failed to upload image. Using placeholder instead.",
            variant: "destructive",
          })
        }
      }

      const athleteData = {
        name: formData.get("name") as string,
        highschool: formData.get("highschool") as string,
        college: formData.get("college") as string,
        division: division,
        weightclass: weightClass, // HS weight class
        gender: gender,
        college_weight_class: collegeWeightClass, // College weight class
        graduationyear: Number.parseInt(formData.get("graduationyear") as string),
        commitmentdate: formData.get("commitmentdate") as string,
        photourl: photoUrl,
        achievements: achievements,
        bio: (formData.get("bio") as string) || undefined,
      }

      const result = await createAthlete(athleteData)

      if (result) {
        toast({
          title: "Success",
          description: "Athlete added successfully!",
        })
        router.push("/admin/athletes")
        router.refresh()
      } else {
        throw new Error("Failed to create athlete")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: "Error",
        description: "Failed to add athlete. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>

          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={(value) => setGender(value as "male" | "female")}>
              <SelectTrigger>
                <SelectValue placeholder="Select Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="highschool">High School</Label>
            <Input id="highschool" name="highschool" required />
          </div>

          <div>
            <Label htmlFor="college">College</Label>
            <Input id="college" name="college" required />
          </div>

          <div>
            <Label htmlFor="division">Division</Label>
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger>
                <SelectValue placeholder="Select Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="D1">D1</SelectItem>
                <SelectItem value="D2">D2</SelectItem>
                <SelectItem value="D3">D3</SelectItem>
                <SelectItem value="NAIA">NAIA</SelectItem>
                <SelectItem value="JUCO">JUCO</SelectItem>
                <SelectItem value="Independent">Independent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="weightclass">High School Weight Class</Label>
            <Select value={weightClass} onValueChange={setWeightClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select HS Weight Class" />
              </SelectTrigger>
              <SelectContent>
                {gender === "male" ? (
                  <>
                    {getMensHSWeightClasses().map((weight) => (
                      <SelectItem key={weight} value={weight}>
                        {weight} lbs
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <>
                    {getWomensHSWeightClasses().map((weight) => (
                      <SelectItem key={weight} value={weight}>
                        {weight} lbs
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="collegeweightclass">College Weight Class (Projected)</Label>
            <Select value={collegeWeightClass} onValueChange={setCollegeWeightClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select College Weight Class" />
              </SelectTrigger>
              <SelectContent>
                {gender === "male" ? (
                  <>
                    {getMensCollegeWeightClasses().map((weight) => (
                      <SelectItem key={weight} value={weight}>
                        {weight} lbs
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <>
                    {getWomensCollegeWeightClasses().map((weight) => (
                      <SelectItem key={weight} value={weight}>
                        {weight} lbs
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="graduationyear">Graduation Year</Label>
            <Input
              id="graduationyear"
              name="graduationyear"
              type="number"
              defaultValue={new Date().getFullYear()}
              required
            />
          </div>

          <div>
            <Label htmlFor="commitmentdate">Commitment Date</Label>
            <Input
              id="commitmentdate"
              name="commitmentdate"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          <div>
            <Label htmlFor="photo">Photo</Label>
            <Input id="photo" name="photo" type="file" accept="image/*" onChange={handleImageChange} />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Preview"
                  className="h-40 w-auto object-cover rounded-md"
                />
              </div>
            )}
          </div>

          <div>
            <Label>Achievements</Label>
            <div className="flex space-x-2 mb-2">
              <Input
                value={newAchievement}
                onChange={(e) => setNewAchievement(e.target.value)}
                placeholder="Add achievement"
              />
              <Button type="button" onClick={addAchievement} variant="outline">
                Add
              </Button>
            </div>
            {achievements.length > 0 && (
              <ul className="space-y-1 mt-2">
                {achievements.map((achievement, index) => (
                  <li key={index} className="flex justify-between items-center bg-muted p-2 rounded-md">
                    <span>{achievement}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAchievement(index)}>
                      ✕
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" rows={4} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding Athlete..." : "Add Athlete"}
        </Button>
      </div>
    </form>
  )
}
