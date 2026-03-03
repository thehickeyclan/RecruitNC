"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function AthleteFormWithDropdown({ initialData = {} }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    firstName: initialData.firstName || "",
    lastName: initialData.lastName || "",
    highschool: initialData.highschool || "",
    college: initialData.college || "",
    division: initialData.division || "",
    weightclass: initialData.weightclass || "",
    graduationyear: initialData.graduationyear || new Date().getFullYear(),
    commitmentdate: initialData.commitmentdate || new Date().toISOString().split("T")[0],
    gender: initialData.gender || "Male",
    bio: initialData.bio || "",
    wrestlingClub: initialData.wrestlingClub || "",
    achievements: initialData.achievements || [],
    ...initialData,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const supabase = createClient()

      // Prepare data for submission
      const dataToSubmit = {
        ...formData,
        // Ensure achievements is an array
        achievements: Array.isArray(formData.achievements)
          ? formData.achievements
          : formData.achievements.split(",").map((a) => a.trim()),
      }

      // Insert or update based on whether we have an ID
      const { error } = formData.id
        ? await supabase.from("athletes").update(dataToSubmit).eq("id", formData.id)
        : await supabase.from("athletes").insert(dataToSubmit)

      if (error) throw error

      setSuccess(formData.id ? "Athlete updated successfully!" : "Athlete added successfully!")

      // Redirect after successful submission
      setTimeout(() => {
        window.location.href = "/admin/athletes"
      }, 2000)
    } catch (err) {
      console.error("Error submitting athlete:", err)
      setError("Failed to save athlete. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
      {success && <div className="p-3 bg-green-100 text-green-700 rounded-md">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          name="name"
          value={formData.name || `${formData.firstName} ${formData.lastName}`.trim()}
          onChange={handleChange}
          required
        />
        <p className="text-sm text-gray-500">This will be displayed as the athlete's name</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="highschool">High School</Label>
          <Input id="highschool" name="highschool" value={formData.highschool} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wrestlingClub">Wrestling Club</Label>
          <Input id="wrestlingClub" name="wrestlingClub" value={formData.wrestlingClub} onChange={handleChange} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="college">College</Label>
          <Input id="college" name="college" value={formData.college} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="division">Division</Label>
          <Select value={formData.division} onValueChange={(value) => handleSelectChange("division", value)}>
            <SelectTrigger id="division">
              <SelectValue placeholder="Select Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Division I">Division I</SelectItem>
              <SelectItem value="Division II">Division II</SelectItem>
              <SelectItem value="Division III">Division III</SelectItem>
              <SelectItem value="NAIA">NAIA</SelectItem>
              <SelectItem value="NJCAA">NJCAA</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="weightclass">Weight Class</Label>
          <Select value={formData.weightclass} onValueChange={(value) => handleSelectChange("weightclass", value)}>
            <SelectTrigger id="weightclass">
              <SelectValue placeholder="Select Weight Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="125">125</SelectItem>
              <SelectItem value="133">133</SelectItem>
              <SelectItem value="141">141</SelectItem>
              <SelectItem value="149">149</SelectItem>
              <SelectItem value="157">157</SelectItem>
              <SelectItem value="165">165</SelectItem>
              <SelectItem value="174">174</SelectItem>
              <SelectItem value="184">184</SelectItem>
              <SelectItem value="197">197</SelectItem>
              <SelectItem value="285">285</SelectItem>
              <SelectItem value="HWT">HWT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="graduationyear">Graduation Year</Label>
          <Input
            id="graduationyear"
            name="graduationyear"
            type="number"
            min={2000}
            max={2050}
            value={formData.graduationyear}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="commitmentdate">Commitment Date</Label>
        <Input
          id="commitmentdate"
          name="commitmentdate"
          type="date"
          value={formData.commitmentdate}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="achievements">Achievements</Label>
        <Textarea
          id="achievements"
          name="achievements"
          value={Array.isArray(formData.achievements) ? formData.achievements.join(", ") : formData.achievements}
          onChange={handleChange}
          placeholder="Enter achievements separated by commas"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          placeholder="Enter athlete bio"
          rows={5}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : formData.id ? "Update Athlete" : "Add Athlete"}
        </Button>
      </div>
    </form>
  )
}
