"use client"

import type React from "react"

import { useState, useRef } from "react"

export default function SimpleUpload() {
  const [athleteId, setAthleteId] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)
    setError(null)
    setSuccess(null)
    setUploadedUrl(null)

    if (!selectedFile || !athleteId) {
      setError("Please select a file and enter an athlete ID")
      setIsUploading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("athleteId", athleteId)

      console.log("Uploading file for athlete ID:", athleteId)

      const response = await fetch("/api/direct-upload", {
        method: "POST",
        body: formData,
      })

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Server returned non-JSON response: ${await response.text()}`)
      }

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Upload failed")
      }

      console.log("Upload successful:", data)
      setSuccess("Image uploaded successfully!")
      setUploadedUrl(data.url)

      // Reset form
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err) {
      console.error("Error uploading image:", err)
      setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Simple Image Upload</h1>

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
          <label htmlFor="athleteId" className="block text-sm font-medium text-gray-700 mb-1">
            Athlete ID (Required)
          </label>
          <input
            type="text"
            id="athleteId"
            value={athleteId}
            onChange={(e) => setAthleteId(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., e27ed6bf-00a6-43bb-9365-7b24fa38d454"
          />
        </div>

        <div>
          <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-1">
            Photo (Required)
          </label>
          <input
            type="file"
            id="photo"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {previewUrl && (
            <div className="mt-2">
              <img src={previewUrl || "/placeholder.svg"} alt="Preview" className="h-40 object-cover rounded-md" />
            </div>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={isUploading || !athleteId || !selectedFile}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#1e40af", color: "white", cursor: "pointer" }}
          >
            {isUploading ? "Uploading..." : "Upload Image"}
          </button>
        </div>
      </form>

      {uploadedUrl && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Uploaded Image</h2>
          <div className="border rounded-md p-4">
            <img src={uploadedUrl || "/placeholder.svg"} alt="Uploaded" className="h-60 object-cover rounded-md" />
            <p className="mt-2 text-sm text-gray-600 break-all">{uploadedUrl}</p>
          </div>
        </div>
      )}
    </div>
  )
}
