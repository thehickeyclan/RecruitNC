"use client"

import type React from "react"

import { useState, useRef, type FormEvent } from "react"
import { useRouter } from "next/navigation"

export default function AthleteFormFixed() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [highSchool, setHighSchool] = useState("")
  const [college, setCollege] = useState("")
  const [graduationYear, setGraduationYear] = useState("2025")
  const [commitmentDate, setCommitmentDate] = useState("")
  const [weightClass, setWeightClass] = useState("")
  const [division, setDivision] = useState("NCAA D1")
  const [bio, setBio] = useState("")
  const [achievement, setAchievement] = useState("")
  const [achievements, setAchievements] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() + i - 9).toString())
  const divisions = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA", "NJCAA"]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)

    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl(null)
    }
  }

  const addAchievement = () => {
    if (achievement.trim()) {
      setAchievements([...achievements, achievement.trim()])
      setAchievement("")
    }
  }

  const removeAchievement = (index: number) => {
    setAchievements(achievements.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // First, create the athlete
      const athleteData = {
        name,
        highschool: highSchool,
        college,
        graduationyear: Number.parseInt(graduationYear),
        commitmentdate: commitmentDate,
        weightclass: weightClass,
        division,
        bio,
        achievements,
      }

      console.log("Submitting athlete data:", athleteData)

      const response = await fetch("/api/complete-add-athlete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(athleteData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create athlete")
      }

      console.log("Athlete created:", data)

      // If we have a file and the athlete was created successfully, upload the image
      if (selectedFile && data.athlete && data.athlete.id) {
        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("athleteId", data.athlete.id)

        console.log("Uploading image for athlete ID:", data.athlete.id)

        const uploadResponse = await fetch("/api/athletes/upload-image", {
          method: "POST",
          body: formData,
        })

        const uploadData = await uploadResponse.json()

        if (!uploadResponse.ok) {
          console.error("Image upload failed:", uploadData)
          setError(`Athlete created but image upload failed: ${uploadData.error || "Unknown error"}`)
          setIsSubmitting(false)
          return
        }

        console.log("Image uploaded successfully:", uploadData)
      }

      // Clear the form
      setName("")
      setHighSchool("")
      setCollege("")
      setGraduationYear("2025")
      setCommitmentDate("")
      setWeightClass("")
      setDivision("NCAA D1")
      setBio("")
      setAchievement("")
      setAchievements([])
      setSelectedFile(null)
      setPreviewUrl(null)

      // Reset file input manually
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      setSuccess("Athlete created successfully!")

      // Refresh the page data
      router.refresh()
    } catch (err) {
      console.error("Error creating athlete:", err)
      setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Add Athlete</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name (Required)
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="highSchool" className="block text-sm font-medium text-gray-700 mb-1">
              High School
            </label>
            <input
              type="text"
              id="highSchool"
              value={highSchool}
              onChange={(e) => setHighSchool(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="graduationYear" className="block text-sm font-medium text-gray-700 mb-1">
              Graduation Year
            </label>
            <select
              id="graduationYear"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="college" className="block text-sm font-medium text-gray-700 mb-1">
              College
            </label>
            <input
              type="text"
              id="college"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="commitmentDate" className="block text-sm font-medium text-gray-700 mb-1">
              Commitment Date
            </label>
            <input
              type="date"
              id="commitmentDate"
              value={commitmentDate}
              onChange={(e) => setCommitmentDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="weightClass" className="block text-sm font-medium text-gray-700 mb-1">
              Weight Class
            </label>
            <input
              type="text"
              id="weightClass"
              value={weightClass}
              onChange={(e) => setWeightClass(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="division" className="block text-sm font-medium text-gray-700 mb-1">
              Division
            </label>
            <select
              id="division"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {divisions.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-1">
            Photo
          </label>
          <input
            type="file"
            id="photo"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {previewUrl && (
            <div className="mt-2">
              <img src={previewUrl || "/placeholder.svg"} alt="Preview" className="h-40 object-cover rounded-md" />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="achievements" className="block text-sm font-medium text-gray-700 mb-1">
            Achievements
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="achievements"
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add an achievement"
            />
            <button
              type="button"
              onClick={addAchievement}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add
            </button>
          </div>
          {achievements.length > 0 && (
            <ul className="mt-2 space-y-1">
              {achievements.map((item, index) => (
                <li key={index} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded">
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeAchievement(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Athlete biography"
          ></textarea>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting || !name}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#1e40af", color: "white", cursor: "pointer" }}
          >
            {isSubmitting ? "Creating..." : "Create Athlete"}
          </button>
        </div>
      </form>
    </div>
  )
}
